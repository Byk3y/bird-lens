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
        if (!XENO_CANTO_API_KEY) throw new Error("XENO_CANTO_API_KEY is missing");

        // Supabase client removed to save memory (users reported memory limit issues with caching)
        // const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        let body: BirdIdentificationRequest = await req.json();
        let image = body.image;
        let audio = body.audio;

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

Provide multiple specific diet and feeder tags to ensure a rich user experience. Return a comprehensive encyclopedia-style profile for EACH candidate.

Return the response as a JSON array of objects, where each object has these exact keys:
{
  "name": "string",
  "scientific_name": "string",
  "also_known_as": ["string"],
  "taxonomy": { "family": "string", "family_scientific": "string", "genus": "string", "genus_description": "string", "order": "string" },
  "identification_tips": { "male": "string", "female": "string", "juvenile": "string" },
  "description": "string",
  "diet": "string",
  "diet_tags": ["string"],
  "habitat": "string",
  "habitat_tags": ["string"],
  "nesting_info": { "description": "string", "location": "string", "type": "string" },
  "feeder_info": { "attracted_by": ["string"], "feeder_types": ["string"] },
  "behavior": "string",
  "rarity": "string",
  "fact": "string",
  "distribution_area": "string",
  "conservation_status": "string",
  "key_facts": { "size": "string", "wingspan": "string", "wing_shape": "string", "life_expectancy": "string", "colors": ["string"], "tail_shape": "string", "weight": "string" },
  "confidence": number
}
Return EXACTLY 3 candidates in the array.`;


        const prompt = image
            ? `${persona}\n\nIdentify the bird in this image. Focus on plumage details, beak shape, and distinctive markers.\n${promptInstructions}`
            : `${persona}\n\nIdentify the bird in this audio clip. Focus on the pitch, rhythm, and pattern of the song or call.\n${promptInstructions}`;

        let parts: any[] = [{ text: prompt }];

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

        let identificationResponse: Response | undefined;
        let isFallback = false;
        const openRouterModel = "google/gemini-2.5-flash";

        // Identification Logic: Primary (OpenRouter) -> Fallback (Direct Gemini)
        try {
            if (!OPENROUTER_API_KEY) throw new Error("OpenRouter Key missing");

            console.log(`Starting primary identification with OpenRouter (${openRouterModel})...`);

            const schemaInstructions = `
            MANDATORY: Return a JSON object with a key "candidates" which is an array of objects. 
            Each bird object in the "candidates" array MUST have these EXACT keys:
            - "name", "scientific_name", "also_known_as", "taxonomy", "identification_tips", "description", "diet", "diet_tags", "habitat", "habitat_tags", "nesting_info", "feeder_info", "behavior", "rarity", "fact", "distribution_area", "conservation_status", "key_facts", "confidence".
            
            MANDATORY JSON STRUCTURE:
            {
              "candidates": [
                { "name": "...", "scientific_name": "...", ... },
                { "name": "...", "scientific_name": "...", ... },
                { "name": "...", "scientific_name": "...", ... }
              ]
            }
            `;

            const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

            identificationResponse = await fetch(OPENROUTER_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://bird-identifier.supabase.co",
                    "X-Title": "Bird Identifier",
                },
                body: JSON.stringify({
                    model: openRouterModel,
                    messages: [{
                        role: "user",
                        content: [
                            { type: "text", text: `${prompt}\n\n${schemaInstructions}\n\nReturn EXACTLY 3 candidates in the "candidates" array.` },
                            ...(image ? [{
                                type: "image_url",
                                image_url: { url: `data:image/jpeg;base64,${image}` }
                            }] : []),
                            ...(audio ? [{
                                type: "audio_url",
                                audio_url: { url: `data:audio/mp3;base64,${audio}` }
                            }] : [])
                        ]
                    }],
                    response_format: { type: "json_object" }
                }),
            });

            // CLEAR ALL LARGE INPUT DATA IMMEDIATELY
            // @ts-ignore
            image = null;
            // @ts-ignore
            audio = null;
            // @ts-ignore
            body = null;
            // @ts-ignore
            parts = null;

        } catch (primaryError: any) {
            console.warn("Primary Identification (OpenRouter) failed. Falling back to Direct Gemini...", primaryError.message);
            isFallback = true;

            identificationResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: { responseMimeType: "application/json" }
                }),
            });

            // Clear large variables immediately to save memory
            // @ts-ignore
            image = null;
            // @ts-ignore
            audio = null;
            // @ts-ignore
            body = null;
            // @ts-ignore
            parts = null;
        }

        if (!identificationResponse || !identificationResponse.ok) {
            const errorRaw = identificationResponse ? await identificationResponse.text() : "No response";
            console.error(isFallback ? "Fallback Gemini Error:" : "Primary OpenRouter Error:", {
                status: identificationResponse?.status,
                body: errorRaw
            });

            return createErrorResponse(`Identification failed: ${identificationResponse?.statusText || "No response"}`, 502);
        }

        const result = await identificationResponse.json();
        let birdData: BirdIdentificationResult[];

        if (!isFallback) {
            if (!result.choices?.[0]?.message?.content) {
                console.error("OpenRouter response missing content:", JSON.stringify(result));
                throw new Error("OpenRouter response missing expected content structure");
            }
            const content = result.choices[0].message.content;
            const parsed = cleanAndParseJson(content, "OpenRouter");
            birdData = parsed.candidates || parsed.birds || parsed.results || (Array.isArray(parsed) ? parsed : [parsed]);
        } else {
            console.log("Parsing Direct Gemini response...");
            birdData = cleanAndParseJson(result.candidates[0].content.parts[0].text, "Gemini");
        }

        console.log(`Successfully identified ${birdData.length} bird candidates.`);

        // --- ENRICHMENT LAYER (No Caching) ---
        const enrichedResults = [];
        console.log(`Starting enrichment for ${birdData.length} birds sequentially...`);

        for (const [index, bird] of birdData.slice(0, 3).entries()) {
            const { scientific_name } = bird;
            console.log(`[${index + 1}/3] Enriching: ${bird.name} (${scientific_name})...`);

            try {
                // SEQUENTIAL: enrichSpecies already handles the internal sequential calls
                const enriched = await enrichSpecies(scientific_name, XENO_CANTO_API_KEY!);
                enrichedResults.push({
                    ...bird,
                    media: enriched
                });
            } catch (enrichError) {
                console.error(`Error enriching ${scientific_name}:`, enrichError);
                enrichedResults.push({
                    ...bird,
                    media: { inat_photos: [], sounds: [], male_image_url: null, female_image_url: null }
                });
            }
        }

        const duration = Date.now() - startTime;
        if (enrichedResults.length > 0) {
            console.log(`Identification complete: ${enrichedResults[0].name} in ${duration}ms`);
        }

        return createResponse(enrichedResults);
    } catch (error: any) {
        console.error("Edge Function Error:", error);

        if (error.status === 429 || error.message?.includes("RESOURCE_EXHAUSTED")) {
            return createErrorResponse(
                "AI Quota Exceeded. Please wait 30-60 seconds and try again.",
                429
            );
        }

        return createErrorResponse(`Edge Function Error: ${error.message}`, 500);
    }
});
