import { cleanAndParseJson } from "./utils.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const enrichmentPromptInstructions = `
For the following bird species, provide comprehensive field-guide quality metadata.
Species: [[SPECIES_NAMES]]

Return a JSON object with a "birds" array. Each bird must include:
- "name": Common name (for mapping)
- "habitat": Detailed ecological habitat description.
- "habitat_tags": Array of 1-3 short keywords for the habitat (e.g., ["Rainforest", "Montane"]).
- "nesting_info": { 
    "description": "Comprehensive materials/clutch info", 
    "location": "A short 2-4 word summary of where it nests", 
    "type": "Nest type" 
  }
- "identification_tips": { "male": "Tips for males", "female": "Tips for females", "juvenile": "Tips for juveniles" }
- "behavior": "One memorably punchy behavioral fact, distinct from diet."
- "also_known_as": Array of strings.
- "description": 2-3 sentence overview.
- "diet": Primary diet description.
- "diet_tags": Array of simple dietary keywords. Use specific terms like ["Aquatic plants", "Small fish", "Invertebrates", "Small mammals", "Crustaceans", "Reptiles & Amphibians", "Carrion", "Grains", "Buds & Shoots", "Insects", "Fruit", "Seeds", "Nectar"] where applicable for consistent visual mapping.
- "conservation_status": "Current global conservation status (e.g., Least Concern, Near Threatened, Vulnerable, Endangered)."
- "key_facts": { 
    "size": "value (e.g., 9-11 inches)", 
    "wingspan": "value (e.g., 15-20 inches)",
    "wing_shape": "value (e.g., Pointed, Broad)",
    "tail_shape": "value (e.g., Notched, Square)",
    "colors": ["Primary", "Colors", "As", "Array"]
  }
`;

export async function generateBirdMetadata(scientificName: string) {
    if (!OPENROUTER_API_KEY) {
        console.error("OPENROUTER_API_KEY is missing");
        return null;
    }

    const openRouterModel = "openai/gpt-4o";
    const prompt = enrichmentPromptInstructions.replace("[[SPECIES_NAMES]]", scientificName);

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://bird-identifier.supabase.co",
                "X-Title": "Bird Identifier",
            },
            body: JSON.stringify({
                model: openRouterModel,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouter failed: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const parsed = cleanAndParseJson(content, "Enrichment");

        // Handle array or single object return
        const meta = parsed.birds?.[0] || parsed.candidates?.[0] || (Array.isArray(parsed) ? parsed[0] : parsed);
        return meta;

    } catch (error) {
        console.error("Error generating bird metadata:", error);
        return null;
    }
}
