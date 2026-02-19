import { cleanAndParseJson } from "./utils.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const enrichmentPromptInstructions = `
For the following bird species, provide comprehensive field-guide quality metadata.
Species: [[SPECIES_NAMES]]

Return a JSON object with a "birds" array. Each bird must include:
- "name": Common name
- "scientific_name": Scientific name (for mapping)
- "habitat": Detailed ecological habitat description (vegetation, elevation, etc).
- "habitat_tags": Array of 1-3 short keywords (e.g., ["Forest", "Shrubland"]).
- "nesting_info": { 
    "description": "Materials, clutch size, and incubation info", 
    "location": "A single-word identifier for the specific nesting site (e.g., 'Tree', 'Ground', 'Cavity', 'Shrub', 'Cliff', 'Building')", 
    "type": "Nest structure (e.g., 'Cup', 'Platform', 'Scrape')" 
  }
- "identification_tips": { "male": "Visual markers for males", "female": "Visual markers for females", "juvenile": "Visual markers for juveniles" }
- "behavior": "One unique behavioral trait or interesting fact."
- "also_known_as": Array of strings (alternative names).
- "taxonomy": {
    "family": "Common name of family",
    "family_scientific": "Scientific name of family",
    "genus": "Scientific name of genus",
    "genus_description": "Commonly called [Common Name]",
    "order": "Scientific name of order",
    "order_description": "Common name of order"
  },
- "description": 2-3 sentence engaging overview.
- "diet": Primary diet description.
- "diet_tags": Array of simple keywords: ["Insects", "Seeds", "Fruit", "Nectar", "Small fish", "Small mammals", "Invertebrates", "Grains", "Carrion"].
- "conservation_status": "Global status (e.g., Least Concern, Vulnerable)."
- "key_facts": { 
    "size": "Length range in inches", 
    "wingspan": "Wingspan range in inches",
    "wing_shape": "e.g., Rounded, Pointed",
    "tail_shape": "e.g., Square, Forked",
    "colors": ["List", "Primary", "Colors"]
  }

MANDATORY: Do not return "Unknown" for any field. Provide your best expert ornithological data.
`;

export async function generateBirdMetadata(scientificName: string) {
    if (!OPENROUTER_API_KEY && !GEMINI_API_KEY) {
        console.error("No AI keys provided");
        return null;
    }

    const openRouterModel = "openai/gpt-4o";
    const promptText = enrichmentPromptInstructions.replace("[[SPECIES_NAMES]]", scientificName);

    // Helper to attempt AI call
    const attemptEnrichment = async (isPrimary: boolean): Promise<Response> => {
        if (isPrimary && OPENROUTER_API_KEY) {
            return await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://bird-identifier.supabase.co",
                    "X-Title": "Bird Identifier",
                },
                body: JSON.stringify({
                    model: openRouterModel,
                    messages: [{ role: "user", content: promptText }],
                    response_format: { type: "json_object" }
                }),
            });
        } else if (GEMINI_API_KEY) {
            return await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: { responseMimeType: "application/json" }
                }),
            });
        }
        throw new Error("No AI key available for this attempt");
    };

    try {
        let response: Response;
        let isFallback = false;

        try {
            response = await attemptEnrichment(true);
            if (!response.ok) {
                const err = await response.text().catch(() => "unknown");
                console.warn(`[Enrichment] OpenRouter failed ${response.status}: ${err.substring(0, 100)}`);
                throw new Error("OpenRouter failed");
            }
        } catch (err) {
            console.warn(`[Enrichment] Falling back to Gemini...`);
            isFallback = true;
            response = await attemptEnrichment(false);
            if (!response.ok) {
                throw new Error(`Gemini also failed: ${response.status}`);
            }
        }

        const data = await response.json();
        let content: string;

        if (!isFallback) {
            content = data.choices[0].message.content;
        } else {
            content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }

        if (!content) throw new Error("AI returned empty content");

        const parsed = cleanAndParseJson(content, "Enrichment");

        // Handle array or single object return
        const meta = parsed.birds?.[0] || parsed.candidates?.[0] || (Array.isArray(parsed) ? parsed[0] : (parsed.name ? parsed : (parsed.diet ? parsed : null)));

        if (meta) {
            console.log(`[Enrichment] Successfully generated metadata for ${scientificName} via ${isFallback ? 'Gemini' : 'OpenRouter'}`);
        }

        return meta;

    } catch (error) {
        console.error("Error generating bird metadata:", error);
        return null;
    }
}
