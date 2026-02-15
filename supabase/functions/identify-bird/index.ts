import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createErrorResponse, createResponse } from "./_shared/cors.ts";
import { enrichSpecies } from "./_shared/enrichment.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
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

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                    response_mime_type: "application/json",
                    response_schema: {
                        type: "ARRAY",
                        items: {
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

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            return createErrorResponse(`AI Identification failed: ${response.statusText}`, 502);
        }

        const result = await response.json();
        const birdData: BirdIdentificationResult[] = JSON.parse(result.candidates[0].content.parts[0].text);

        // --- ENRICHMENT & CACHING LAYER ---
        const enrichedResults = await Promise.all(birdData.map(async (bird) => {
            const { scientific_name } = bird;

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
            console.log(`Cache ${isStale ? "stale" : "miss"} for: ${scientific_name}. Enriching...`);
            const media = await enrichSpecies(scientific_name, XENO_CANTO_API_KEY!);

            // 3. Upsert into cache
            await supabase
                .from("species_meta")
                .upsert({
                    scientific_name,
                    common_name: bird.name,
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
