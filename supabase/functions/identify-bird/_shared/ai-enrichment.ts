import { cleanAndParseJson } from "./utils.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const GEMINI_MODEL = "google/gemini-2.0-flash-001";

/**
 * Helper to perform a fetch with a timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 25000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

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
    if (!OPENROUTER_API_KEY) {
        console.error("No OpenRouter API key provided");
        return null;
    }

    const openRouterModel = "openai/gpt-4o";
    const promptText = enrichmentPromptInstructions.replace("[[SPECIES_NAMES]]", scientificName);

    // Helper to attempt AI call
    const attemptEnrichment = async (isPrimary: boolean): Promise<Response> => {
        const model = isPrimary ? openRouterModel : GEMINI_MODEL;
        return await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": 'Bearer ' + OPENROUTER_API_KEY,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://bird-identifier.supabase.co",
                "X-Title": "Bird Identifier",
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: promptText }],
                response_format: { type: "json_object" }
            }),
        });
    };

    try {
        let response: Response;
        let isFallback = false;

        try {
            response = await attemptEnrichment(true);
            if (!response.ok) {
                const err = await response.text().catch(() => "unknown");
                console.warn('[Enrichment] OpenRouter failed ' + response.status + ': ' + err.substring(0, 100));
                throw new Error("OpenRouter failed");
            }
        } catch (err) {
            console.warn('[Enrichment] Falling back to Gemini...');
            isFallback = true;
            response = await attemptEnrichment(false);
            if (!response.ok) {
                throw new Error('Gemini also failed: ' + response.status);
            }
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) throw new Error("AI returned empty content");

        const parsed = cleanAndParseJson(content, "Enrichment");

        // Handle array or single object return
        const meta = parsed.birds?.[0] || parsed.candidates?.[0] || (Array.isArray(parsed) ? parsed[0] : (parsed.name ? parsed : null));

        if (meta) {
            console.log('[Enrichment] Successfully generated metadata for ' + scientificName + ' via ' + (isFallback ? 'Gemini' : 'OpenRouter'));
        }

        return meta;

    } catch (error) {
        console.error("Error generating bird metadata:", error);
        return null;
    }
}
export async function generateBatchBirdMetadata(scientificNames: string[]) {
    if (scientificNames.length === 0) return [];
    if (!OPENROUTER_API_KEY) return [];

    const promptText = enrichmentPromptInstructions.replace("[[SPECIES_NAMES]]", scientificNames.join(", "));

    const callAI = async () => {
        return await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "openai/gpt-4o",
                messages: [{ role: "user", content: promptText }],
                response_format: { type: "json_object" }
            }),
        });
    };

    try {
        const response = await callAI();
        if (!response.ok) return [];
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) return [];
        const parsed = cleanAndParseJson(content, "Batch-Enrichment");
        return parsed.birds || parsed.candidates || (Array.isArray(parsed) ? parsed : []);
    } catch (error) {
        console.error("Batch enrichment failed:", error);
        return [];
    }
}
