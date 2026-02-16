import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createErrorResponse, createResponse } from "./_shared/cors.ts";
import { enrichSpecies } from "./_shared/enrichment.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const XENO_CANTO_API_KEY = Deno.env.get("XENO_CANTO_API_KEY");

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface BirdIdentificationRequest {
    image?: string;
    audio?: string;
}

interface BirdIdentificationResult {
    name: string;
    scientific_name: string;
    also_known_as: string[];
    taxonomy: {
        family: string;
        family_scientific: string;
        genus: string;
        genus_description: string;
        order: string;
    };
    identification_tips: {
        male: string;
        female: string;
        juvenile?: string;
    };
    description: string;
    diet: string;
    diet_tags: string[];
    habitat: string;
    habitat_tags: string[];
    nesting_info: {
        description: string;
        location: string;
        type: string;
    };
    feeder_info: {
        attracted_by: string[];
        feeder_types: string[];
    };
    behavior: string;
    rarity: string;
    fact: string;
    distribution_area: string;
    conservation_status: string;
    key_facts: {
        size: string;
        wingspan: string;
        wing_shape: string;
        life_expectancy: string;
        colors: string[];
        tail_shape: string;
        weight: string;
    };
    confidence: number;
    // Enriched fields
    media?: any;
}

function cleanAndParseJson(text: string, source: string) {
    try {
        // Text cleanup
        let clean = text.replace(/```json\n?|```/g, "").trim();

        // Regex to fix specific known model hallucinations
        // Fix 1: Arrays closed with } instead of ] (e.g. "tags": ["a", "b"} )
        // Matches: "key": [ ... "value" } -> repl with "value" ]
        // We look for a string value followed by optional whitespace and a curly brace, inside what looks like an array context
        // This is a naive but effective patch for the specific error observed
        clean = clean.replace(/("[\w\s]+"\s*:\s*\[[^\]}]+)(\}\s*,)/g, "$1],");
        clean = clean.replace(/("[\w\s]+"\s*:\s*\[[^\]}]+)(\}\s*$)/g, "$1]");

        // Sometimes LLMs output text before/after JSON
        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');

        if (firstBrace === -1 && firstBracket === -1) {
            throw new Error("No JSON object or array found in response");
        }

        const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
        const lastBrace = clean.lastIndexOf('}');
        const lastBracket = clean.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);

        if (end > start) {
            clean = clean.substring(start, end + 1);
        }

        // Final safety net for trailing commas before closing braces/brackets
        clean = clean.replace(/,\s*([\]}])/g, "$1");

        return JSON.parse(clean);
    } catch (e: any) {
        console.error(`JSON Parse Error (${source}):`, e);
        console.error(`Raw Content (${source}):`, text);
        throw new Error(`Failed to parse ${source} API response: ${e.message}`);
    }
}

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials missing");
        if (!XENO_CANTO_API_KEY) throw new Error("XENO_CANTO_API_KEY is missing");

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const body: BirdIdentificationRequest = await req.json();
        const { image, audio } = body;

        console.log(`Request received. Image size: ${image ? image.length : 0} chars, Audio size: ${audio ? audio.length : 0} chars`);

        if (!image && !audio) {
            return createErrorResponse("Either image or audio data is required", 400);
        }

        console.log(`Starting expert identification using ${GEMINI_MODEL} for ${image ? "image" : "audio"}...`);
        const startTime = Date.now();

        const persona = "You are a world-class Field Ornithologist and Nature Educator. Your goal is to provide highly accurate, scientific, yet engaging bird identification data.";

        const promptInstructions = `
Identify this bird with maximum scientific precision. 

CRITICAL INSTRUCTION:
- Provide the **Top 3 most probable species** candidates. 
- The first candidate must be the most likely identification.
- The other two should be closely related species (same Family/Genus) that look visually similar or could be mistaken for the primary bird.

CRITICAL INSTRUCTIONS FOR BIRDING TIPS:
- DO NOT use generic category names like 'Seeds', 'Insects', 'Fruits', 'Feeder', or 'Forest'.
- ALWAYS use highly specific, descriptive terminology.

MANDATORY VOCABULARY (Use these exact keys if they apply):
DIET: 'Black Oil Sunflower Seeds', 'Sunflower Hearts', 'Striped Sunflower Seeds', 'Nyjer Seeds', 'Thistle Seeds', 'Dandelion Seeds', 'Milo', 'Sorghum', 'Canary Seed', 'Hemp Seeds', 'Red Millet', 'Canola Seeds', 'White Millet', 'Safflower', 'Cracked Corn', 'Suet', 'Mealworms', 'Peanuts', 'Nectar', 'Fruit', 'Berries'.
FEEDER: 'Large Tube Feeder', 'Platform Feeder', 'Hopper Feeder', 'Suet Cage', 'Nectar Feeder', 'Oriole Feeder', 'Window Feeder', 'Ground Feeder'.

CRITICAL INSTRUCTIONS FOR TAGS (Diet, Feeder, Habitat):
- OUTPUT FORMAT: Concise, Title Case names ONLY (Max 2-3 words).
- PROHIBITED: Do NOT include parenthetical descriptions, usage instructions, or elaborations.
- ACCURACY: List ONLY the specific items scientifically verified for this species. Do not hallucinate or add "filler" items to fill space.

IDENTIFICATION MARKERS:
- If the species is sexually dimorphic (visually different sexes), provide 'male' and 'female' tips.
- If they look similar but juveniles are distinct, provide 'juvenile' and 'adult' tips (put 'adult' in 'female').
- VERY IMPORTANT: If there is NO significant visual difference between genders or ages, DO NOT force differentiation. In such cases, provide a single set of tips in the 'male' field and leave 'female' as an empty string or 'Similar to male'.

Provide multiple specific diet and feeder tags to ensure a rich user experience. Return a comprehensive encyclopedia-style profile for EACH candidate.`;

        const prompt = image
            ? `${persona}\n\nIdentify the bird in this image. Focus on plumage details, beak shape, and distinctive markers.\n${promptInstructions}`
            : `${persona}\n\nIdentify the bird in this audio clip. Focus on the pitch, rhythm, and pattern of the song or call.\n${promptInstructions}`;

        const parts: any[] = [{ text: prompt }];

        if (image) {
            parts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: image,
                },
            });
        } else if (audio) {
            parts.push({
                inline_data: {
                    mime_type: "audio/mp3",
                    data: audio,
                },
            });
        }

        let identificationResponse;
        let isOpenRouter = false;

        try {
            console.log("Attempting identification with Direct Gemini API...");
            identificationResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        // ... existing generationConfig ...
                        response_mime_type: "application/json",
                        response_schema: {
                            type: "ARRAY",
                            items: {
                                // ... existing properties ...
                                type: "OBJECT",
                                properties: {
                                    name: { type: "STRING" },
                                    scientific_name: { type: "STRING" },
                                    also_known_as: { type: "ARRAY", items: { type: "STRING" } },
                                    taxonomy: {
                                        type: "OBJECT",
                                        properties: {
                                            family: { type: "STRING" },
                                            family_scientific: { type: "STRING" },
                                            genus: { type: "STRING" },
                                            genus_description: { type: "STRING" },
                                            order: { type: "STRING" }
                                        },
                                        required: ["family", "family_scientific", "genus", "genus_description", "order"]
                                    },
                                    identification_tips: {
                                        type: "OBJECT",
                                        properties: {
                                            male: { type: "STRING" },
                                            female: { type: "STRING" },
                                            juvenile: { type: "STRING" }
                                        },
                                        required: ["male", "female"]
                                    },
                                    description: { type: "STRING" },
                                    diet: { type: "STRING" },
                                    diet_tags: { type: "ARRAY", items: { type: "STRING" } },
                                    habitat: { type: "STRING" },
                                    habitat_tags: { type: "ARRAY", items: { type: "STRING" } },
                                    nesting_info: {
                                        type: "OBJECT",
                                        properties: {
                                            description: { type: "STRING" },
                                            location: { type: "STRING" },
                                            type: { type: "STRING" }
                                        },
                                        required: ["description", "location", "type"]
                                    },
                                    feeder_info: {
                                        type: "OBJECT",
                                        properties: {
                                            attracted_by: { type: "ARRAY", items: { type: "STRING" } },
                                            feeder_types: { type: "ARRAY", items: { type: "STRING" } }
                                        },
                                        required: ["attracted_by", "feeder_types"]
                                    },
                                    behavior: { type: "STRING" },
                                    rarity: { type: "STRING", enum: ["Common", "Uncommon", "Rare", "Very Rare"] },
                                    fact: { type: "STRING" },
                                    distribution_area: { type: "STRING" },
                                    conservation_status: { type: "STRING", description: "IUCN status, e.g., 'Least Concern', 'Near Threatened', 'Decreasing Population'" },
                                    key_facts: {
                                        type: "OBJECT",
                                        properties: {
                                            size: { type: "STRING" },
                                            wingspan: { type: "STRING" },
                                            wing_shape: { type: "STRING" },
                                            life_expectancy: { type: "STRING" },
                                            colors: { type: "ARRAY", items: { type: "STRING" } },
                                            tail_shape: { type: "STRING" },
                                            weight: { type: "STRING" }
                                        },
                                        required: ["size", "wingspan", "wing_shape", "life_expectancy", "colors", "tail_shape", "weight"]
                                    },
                                    confidence: { type: "NUMBER" },
                                },
                                required: [
                                    "name",
                                    "scientific_name",
                                    "also_known_as",
                                    "taxonomy",
                                    "identification_tips",
                                    "description",
                                    "diet",
                                    "diet_tags",
                                    "habitat",
                                    "habitat_tags",
                                    "nesting_info",
                                    "feeder_info",
                                    "behavior",
                                    "rarity",
                                    "fact",
                                    "distribution_area",
                                    "conservation_status",
                                    "key_facts",
                                    "confidence"
                                ],
                            }
                        },
                    },
                }),
            });

            if (identificationResponse.status === 429) {
                console.warn("Direct Gemini Quota Hit. Checking for OpenRouter fallback...");
                throw { status: 429 };
            }
        } catch (e: any) {
            if (e.status === 429 && OPENROUTER_API_KEY) {
                console.log(`Direct Gemini Quota Hit. Falling back to OpenRouter (google/gemini-2.5-flash)...`);
                isOpenRouter = true;

                const schemaInstructions = `
                MANDATORY: Return a JSON object with a key "candidates" which is an array of objects. 
                Each bird object in the "candidates" array MUST have these EXACT keys:
                - "name": Common name of the bird.
                - "scientific_name": Scientific name.
                - "also_known_as": Array of strings.
                - "taxonomy": Object with "family", "family_scientific", "genus", "genus_description", "order".
                - "identification_tips": Object with "male", "female", "juvenile".
                - "description": text.
                - "diet": text.
                - "diet_tags": Array of strings (specific items like 'Black Oil Sunflower Seeds').
                - "habitat": text.
                - "habitat_tags": Array of strings.
                - "nesting_info": Object with "description", "location", "type".
                - "feeder_info": Object with "attracted_by", "feeder_types".
                - "behavior": text.
                - "rarity": "Common", "Uncommon", "Rare", or "Very Rare".
                - "fact": interesting fact.
                - "distribution_area": text.
                - "conservation_status": text.
                - "key_facts": Object with "size", "wingspan", "wing_shape", "life_expectancy", "colors", "tail_shape", "weight".
                - "confidence": number between 0 and 1.
                
                MANDATORY JSON STRUCTURE:
                {
                  "candidates": [
                    { "name": "...", "scientific_name": "...", ... },
                    { "name": "...", "scientific_name": "...", ... },
                    { "name": "...", "scientific_name": "...", ... }
                  ]
                }
                `;

                const openRouterContent: any[] = [{
                    type: "text",
                    text: `${prompt}\n\n${schemaInstructions}\n\nReturn EXACTLY 3 candidates in the "candidates" array.`
                }];
                if (image) {
                    openRouterContent.push({
                        type: "image_url",
                        image_url: { url: `data:image/jpeg;base64,${image}` }
                    });
                } else if (audio) {
                    openRouterContent.push({
                        type: "input_audio",
                        input_audio: { data: audio, format: "mp3" }
                    });
                }

                identificationResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "HTTP-Referer": "https://github.com/Byk3y/bird-lens",
                        "X-Title": "Bird Lens",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.5-flash",
                        messages: [{ role: "user", content: openRouterContent }],
                        response_format: { type: "json_object" }
                    })
                });
            } else {
                console.error("Non-429 error from Gemini or no fallback available:", e);
                if (!identificationResponse) throw e;
            }
        }

        if (!identificationResponse.ok) {
            const errorRaw = await identificationResponse.text();
            console.error(isOpenRouter ? "OpenRouter API Error:" : "Gemini API Error:", {
                status: identificationResponse.status,
                body: errorRaw
            });

            let errorData;
            try {
                errorData = JSON.parse(errorRaw);
            } catch (p) {
                errorData = { message: errorRaw };
            }

            if (identificationResponse.status === 429 || (errorData.error?.status === "RESOURCE_EXHAUSTED")) {
                return createErrorResponse(
                    "AI Quota Exceeded. Please wait 30-60 seconds and try again.",
                    429
                );
            }

            const errorMessage = errorData.error?.message || identificationResponse.statusText;
            return createErrorResponse(`AI Identification failed (${isOpenRouter ? "OpenRouter" : "Gemini"}): ${errorMessage}`, 502);
        }

        const result = await identificationResponse.json();
        let birdData: BirdIdentificationResult[];

        if (isOpenRouter) {
            console.log("Parsing OpenRouter response...");

            if (result.error) {
                console.error("OpenRouter API returned error result:", JSON.stringify(result.error));
                throw new Error(`OpenRouter error: ${result.error.message || "Unknown error"}`);
            }

            if (!result.choices?.[0]?.message?.content) {
                console.error("OpenRouter response missing content:", JSON.stringify(result));
                throw new Error("OpenRouter response missing expected content structure");
            }

            const content = result.choices[0].message.content;
            console.log("OpenRouter Raw Content:", content);

            const parsed = cleanAndParseJson(content, "OpenRouter");

            // Handle both object-wrapped array and direct array (for future flexibility)
            if (parsed.candidates && Array.isArray(parsed.candidates)) {
                birdData = parsed.candidates;
            } else if (Array.isArray(parsed)) {
                birdData = parsed;
            } else if (parsed.birds && Array.isArray(parsed.birds)) {
                birdData = parsed.birds;
            } else if (parsed.results && Array.isArray(parsed.results)) {
                birdData = parsed.results;
            } else {
                birdData = [parsed];
            }
            console.log(`Parsed ${birdData.length} birds from OpenRouter.`);
        } else {
            console.log("Parsing Direct Gemini response...");
            birdData = cleanAndParseJson(result.candidates[0].content.parts[0].text, "Gemini");
        }

        // --- ENRICHMENT & CACHING LAYER ---
        const enrichedResults = await Promise.all(birdData.map(async (bird, index) => {
            const { scientific_name, name } = bird;

            if (!scientific_name) {
                console.error(`Error: bird at index ${index} is missing scientific_name. Raw bird:`, JSON.stringify(bird));
                return { ...bird, media: { inat_photos: [], sounds: [] } };
            }

            // 1. Check cache
            const { data: cached } = await supabase
                .from("species_meta")
                .select("*")
                .eq("scientific_name", scientific_name)
                .single();

            const isStale = cached && (Date.now() - new Date(cached.updated_at).getTime() > 7 * 24 * 60 * 60 * 1000);

            if (cached && !isStale) {
                console.log(`Cache hit for: ${scientific_name}`);
                return {
                    ...bird,
                    media: {
                        inat_photos: cached.inat_photos,
                        male_image_url: cached.male_image_url,
                        female_image_url: cached.female_image_url,
                        sounds: cached.sounds,
                        wikipedia_image: cached.wikipedia_image,
                        gbif_taxon_key: cached.gbif_taxon_key
                    }
                };
            }

            // 2. Fetch fresh data (Cache miss or stale)
            console.log(`Cache ${isStale ? "stale" : "miss"} for: ${scientific_name} (${name || "Unknown Name"}). Enriching...`);
            const media = await enrichSpecies(scientific_name, XENO_CANTO_API_KEY!);

            // 3. Upsert into cache
            await supabase
                .from("species_meta")
                .upsert({
                    scientific_name,
                    common_name: name || "Unknown Bird",
                    inat_photos: media.inat_photos,
                    male_image_url: media.male_image_url,
                    female_image_url: media.female_image_url,
                    sounds: media.sounds,
                    wikipedia_image: media.wikipedia_image,
                    gbif_taxon_key: media.gbif_taxon_key,
                    identification_data: bird, // Save full Gemini data
                    updated_at: new Date().toISOString()
                });

            return {
                ...bird,
                media
            };
        }));

        const duration = Date.now() - startTime;
        console.log(`Identification complete: ${enrichedResults[0].name} in ${duration}ms`);

        return createResponse(enrichedResults);
    } catch (error: any) {
        console.error("Edge Function Error:", error);
        return createErrorResponse(error.message || "Internal Server Error", 500);
    }
});
