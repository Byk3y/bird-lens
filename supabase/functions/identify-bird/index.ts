import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createErrorResponse, createResponse } from "./_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.5-flash";
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
    key_facts?: {
        size?: string;
        wingspan?: string;
        wing_shape?: string;
        life_expectancy?: string;
        colors?: string[];
        tail_shape?: string;
        weight?: string;
    };
    confidence: number;
}

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured");
        }

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

Provide multiple specific diet and feeder tags to ensure a rich user experience. Return a comprehensive encyclopedia-style profile.`;

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
                                    genus_description: { type: "STRING" }
                                },
                                required: ["family", "family_scientific", "genus", "genus_description"]
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
                            diet: { type: "STRING", description: "Detailed description of natural diet, including seasonal variations." },
                            diet_tags: { type: "ARRAY", items: { type: "STRING" }, description: "Specific food items. MANDATORY: Use terms like 'Black Oil Sunflower Seeds', 'Nyjer Seeds', 'Suet Blocks', NOT 'Seeds' or 'Insects'." },
                            habitat: { type: "STRING", description: "Detailed description of specific ecological niches." },
                            habitat_tags: { type: "ARRAY", items: { type: "STRING" }, description: "Specific habitats. MANDATORY: Use terms like 'Deciduous Woodlands', 'Open Grasslands', 'Alpine Tundra', NOT 'Forest' or 'Grassland'." },
                            nesting_info: {
                                type: "OBJECT",
                                properties: {
                                    description: { type: "STRING" },
                                    location: { type: "STRING", description: "Where they nest, e.g., 'Tree', 'Ground', 'Shrub'" },
                                    type: { type: "STRING", description: "Type of nest, e.g., 'Cup', 'Cavity'" }
                                },
                                required: ["description", "location", "type"]
                            },
                            feeder_info: {
                                type: "OBJECT",
                                properties: {
                                    attracted_by: { type: "ARRAY", items: { type: "STRING" }, description: "Specific foods like 'Black Oil Sunflower Seeds', 'Peas', 'Mealworms'" },
                                    feeder_types: { type: "ARRAY", items: { type: "STRING" }, description: "Specific feeder models like 'Large Tube Feeder', 'Hopper Feeder', 'Ground Feeder', 'Platform Feeder'" }
                                },
                                required: ["attracted_by", "feeder_types"]
                            },
                            behavior: { type: "STRING" },
                            rarity: { type: "STRING", enum: ["Common", "Uncommon", "Rare", "Very Rare"] },
                            fact: { type: "STRING" },
                            key_facts: {
                                type: "OBJECT",
                                properties: {
                                    size: { type: "STRING", description: "Range in cm, e.g., '10-12 cm'" },
                                    wingspan: { type: "STRING", description: "Range in cm" },
                                    wing_shape: { type: "STRING", description: "e.g., 'Pointed', 'Rounded'" },
                                    life_expectancy: { type: "STRING", description: "Estimated Average lifespan" },
                                    colors: { type: "ARRAY", items: { type: "STRING" }, description: "Primary plumage colors" },
                                    tail_shape: { type: "STRING", description: "e.g., 'Square', 'Forked', 'Notched'" },
                                    weight: { type: "STRING", description: "Weight in grams" }
                                }
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
                            "key_facts",
                            "confidence"
                        ],
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

        if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.error("Unexpected Gemini response structure:", result);
            return createErrorResponse("Invalid response from AI", 502);
        }

        const birdData: BirdIdentificationResult = JSON.parse(result.candidates[0].content.parts[0].text);

        const duration = Date.now() - startTime;
        console.log(`Identification complete: ${birdData.name} (${birdData.confidence * 100}%) in ${duration}ms`);

        return createResponse(birdData);
    } catch (error: any) {
        console.error("Edge Function Error:", error);
        return createErrorResponse(error.message || "Internal Server Error", 500);
    }
});
