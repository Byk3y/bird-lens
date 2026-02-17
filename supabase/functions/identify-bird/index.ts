import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders, createStreamResponse } from "./_shared/cors.ts";
import { enrichSpecies } from "./_shared/enrichment.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const XENO_CANTO_API_KEY = Deno.env.get("XENO_CANTO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const GEMINI_MODEL = "gemini-2.0-flash"; // Fallback model
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface BirdIdentificationRequest {
    image?: string;
    audio?: string;
}

const writeChunk = (controller: ReadableStreamDefaultController, data: any) => {
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
};

// ---------- Helper: Search Cache (using species_meta table) ----------

async function getCachedMedia(scientificName: string) {
    try {
        const { data, error } = await supabase
            .from('species_meta')
            .select('inat_photos, sounds, male_image_url, female_image_url, wikipedia_image')
            .eq('scientific_name', scientificName)
            .maybeSingle();

        if (error) {
            console.error("Cache fetch error:", error);
            return null;
        }
        return data || null;
    } catch (e) {
        console.error("Cache error:", e);
        return null;
    }
}

async function setCachedMedia(scientificName: string, name: string, mediaData: any) {
    try {
        const { error } = await supabase
            .from('species_meta')
            .upsert({
                scientific_name: scientificName,
                common_name: name,
                inat_photos: mediaData.inat_photos || [],
                sounds: mediaData.sounds || [],
                male_image_url: mediaData.male_image_url || null,
                female_image_url: mediaData.female_image_url || null,
                wikipedia_image: mediaData.wikipedia_image || null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'scientific_name' });

        if (error) console.error("Cache save error:", error);
    } catch (e) {
        console.error("Cache save error:", e);
    }
}

// ---------- Helper: JSON Cleaning ----------

function cleanAndParseJson(text: string, source: string) {
    let clean = text;
    try {
        // 1. Remove markdown blocks
        clean = clean.replace(/```json\n?/, "").replace(/\n?```/, "").trim();

        // 2. Handle unescaped internal quotes (common in bird measurements like 8" or 10-12")
        // We replace any " that is preceded by a digit and not followed by a comma or closing brace
        clean = clean.replace(/(\d+)"/g, '$1 inches');
        clean = clean.replace(/(\d+)'/g, '$1 feet');

        // 3. Fix unescaped newlines and tabs inside strings
        clean = clean.replace(/(:\s*")([^"]*)(")/g, (match, p1, p2, p3) => {
            return p1 + p2.replace(/\n/g, "\\n").replace(/\t/g, "\\t") + p3;
        });

        // 4. Fix trailing commas
        clean = clean.replace(/,\s*([}\]])/g, "$1");

        // 5. Structure extraction (ensure we only parse the JSON object/array part)
        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');
        const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
        const lastBrace = clean.lastIndexOf('}');
        const lastBracket = clean.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);

        if (start !== -1 && end > start) {
            clean = clean.substring(start, end + 1);
        }

        return JSON.parse(clean);
    } catch (e: any) {
        console.error(`JSON Parse Error (${source}):`, e);
        console.error(`Attempted segment:`, clean.substring(0, 500) + "...");
        throw new Error(`Failed to parse ${source} AI response: ${e.message}`);
    }
}

// ---------- Main Handler ----------

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");

        let body: BirdIdentificationRequest = await req.json();
        let image = body.image;
        let audio = body.audio;

        console.log(`Request received. Image length: ${image?.length || 0}, Audio length: ${audio?.length || 0}`);

        if (!image && !audio) {
            return new Response(JSON.stringify({ error: "Either image or audio data is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const startTime = Date.now();
        const persona = "You are a world-class Expert Field Ornithologist and Nature Educator.";
        const promptInstructions = `
Identify this bird with maximum scientific precision. 
Provide the **Top 3 most probable species** candidates. 

FIELD GUIDE QUALITY STANDARDS:
- "habitat": Provide a high-density ecological description. Include elevation ranges in meters, specific vegetation or forest types (e.g., subtropical highlands, montane forest gradients), and regional habitat variations. Focus on where a birder would physically find them.
- "nesting_info": Describe the "description" with field-guide precision: mention specific materials (moss, twigs, spiderwebs), clutch size (number of eggs), and "location" details (e.g., 2-5m high in a tree fork).
- "identification_tips": Provide actionable field marks (e.g., "look for the white eye-ring" or "flash of orange in flight").
- "feeder_info": Be specific about best food types (e.g., "Black oil sunflower seeds" vs just "seeds").

MANDATORY RULES:
1. Return exactly 3 candidates.
2. For measurements (size, wingspan), use the word "inches" or "cm" instead of symbols like " or '. (e.g., "5 inches" instead of 5"). This is critical for JSON stability.
3. Ensure every numeric confidence score is a decimal between 0 and 1.
4. "also_known_as" MUST be an array of strings.
5. "taxonomy", "identification_tips", "nesting_info", "feeder_info", and "key_facts" MUST be objects with the keys specified below.

JSON STRUCTURE TEMPLATE:
{
  "candidates": [
    {
      "name": "Common Name",
      "scientific_name": "Scientific Name",
      "also_known_as": ["Alt Name 1"],
      "taxonomy": {
        "family": "Family Name",
        "family_scientific": "Scientific Family",
        "genus": "Genus Name",
        "genus_description": "Brief genus overview",
        "order": "Order Name"
      },
      "identification_tips": { "male": "...", "female": "...", "juvenile": "..." },
      "description": "General summary",
      "diet": "Detailed diet",
      "diet_tags": ["Keyword 1"],
      "habitat": "Detailed ecological habitat description (include elevation, forest types, regional variants)",
      "habitat_tags": ["Keyword 1"],
      "nesting_info": { "description": "Construction materials and clutch details", "location": "Height and specific tree/ground placement", "type": "Cup, cavity, etc." },
      "feeder_info": { "attracted_by": ["Food 1"], "feeder_types": ["Type 1"] },
      "behavior": "Key field behaviors",
      "rarity": "Status level",
      "fact": "Interesting trivia",
      "distribution_area": "Geographic range",
      "conservation_status": "Status",
      "key_facts": {
        "size": "5-6 inches",
        "wingspan": "8-10 inches",
        "wing_shape": "Rounded",
        "life_expectancy": "10 years",
        "colors": ["Brown", "White"],
        "tail_shape": "Notched",
        "weight": "20 grams"
      },
      "confidence": 0.98
    }
  ]
}
`;

        const prompt = image
            ? `${persona}\n\nIdentify the bird in this image.\n${promptInstructions}`
            : `${persona}\n\nIdentify the bird in this audio clip.\n${promptInstructions}`;

        let parts: any[] = [{ text: prompt }];
        if (image) parts.push({ inline_data: { mime_type: "image/jpeg", data: image } });
        else if (audio) parts.push({ inline_data: { mime_type: "audio/mp3", data: audio } });

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // HEARTBEAT: Send immediate "waiting" signal
                    writeChunk(controller, { type: "progress", message: "AI is analyzing data..." });

                    let identificationResponse: Response | undefined;
                    let isFallback = false;
                    const openRouterModel = "openai/gpt-4o";

                    const attemptAI = async (isPrimary: boolean): Promise<Response> => {
                        if (isPrimary) {
                            console.log(`[STREAM] Primary: OpenRouter (${openRouterModel})...`);
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
                                    messages: [{
                                        role: "user",
                                        content: [
                                            { type: "text", text: `${prompt}\n\nMANDATORY: Return a JSON object with a key "candidates".` },
                                            ...(image ? [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }] : []),
                                            ...(audio ? [{ type: "audio_url", audio_url: { url: `data:audio/mp3;base64,${audio}` } }] : [])
                                        ]
                                    }],
                                    response_format: {
                                        type: "json_schema",
                                        json_schema: {
                                            name: "bird_identification",
                                            strict: true,
                                            schema: {
                                                type: "object",
                                                properties: {
                                                    candidates: {
                                                        type: "array",
                                                        items: {
                                                            type: "object",
                                                            properties: {
                                                                name: { type: "string" },
                                                                scientific_name: { type: "string" },
                                                                also_known_as: { type: "array", items: { type: "string" } },
                                                                taxonomy: {
                                                                    type: "object",
                                                                    properties: {
                                                                        family: { type: "string" },
                                                                        family_scientific: { type: "string" },
                                                                        genus: { type: "string" },
                                                                        genus_description: { type: "string" },
                                                                        order: { type: "string" }
                                                                    },
                                                                    required: ["family", "family_scientific", "genus", "genus_description", "order"],
                                                                    additionalProperties: false
                                                                },
                                                                identification_tips: {
                                                                    type: "object",
                                                                    properties: {
                                                                        male: { type: "string" },
                                                                        female: { type: "string" },
                                                                        juvenile: { type: "string" }
                                                                    },
                                                                    required: ["male", "female", "juvenile"],
                                                                    additionalProperties: false
                                                                },
                                                                description: { type: "string" },
                                                                diet: { type: "string" },
                                                                diet_tags: { type: "array", items: { type: "string" } },
                                                                habitat: { type: "string" },
                                                                habitat_tags: { type: "array", items: { type: "string" } },
                                                                nesting_info: {
                                                                    type: "object",
                                                                    properties: {
                                                                        description: { type: "string" },
                                                                        location: { type: "string" },
                                                                        type: { type: "string" }
                                                                    },
                                                                    required: ["description", "location", "type"],
                                                                    additionalProperties: false
                                                                },
                                                                feeder_info: {
                                                                    type: "object",
                                                                    properties: {
                                                                        attracted_by: { type: "array", items: { type: "string" } },
                                                                        feeder_types: { type: "array", items: { type: "string" } }
                                                                    },
                                                                    required: ["attracted_by", "feeder_types"],
                                                                    additionalProperties: false
                                                                },
                                                                behavior: { type: "string" },
                                                                rarity: { type: "string" },
                                                                fact: { type: "string" },
                                                                distribution_area: { type: "string" },
                                                                conservation_status: { type: "string" },
                                                                key_facts: {
                                                                    type: "object",
                                                                    properties: {
                                                                        size: { type: "string" },
                                                                        wingspan: { type: "string" },
                                                                        wing_shape: { type: "string" },
                                                                        life_expectancy: { type: "string" },
                                                                        colors: { type: "array", items: { type: "string" } },
                                                                        tail_shape: { type: "string" },
                                                                        weight: { type: "string" }
                                                                    },
                                                                    required: ["size", "wingspan", "wing_shape", "life_expectancy", "colors", "tail_shape", "weight"],
                                                                    additionalProperties: false
                                                                },
                                                                confidence: { type: "number" }
                                                            },
                                                            required: ["name", "scientific_name", "also_known_as", "taxonomy", "identification_tips", "description", "diet", "diet_tags", "habitat", "habitat_tags", "nesting_info", "feeder_info", "behavior", "rarity", "fact", "distribution_area", "conservation_status", "key_facts", "confidence"],
                                                            additionalProperties: false
                                                        }
                                                    }
                                                },
                                                required: ["candidates"],
                                                additionalProperties: false
                                            }
                                        }
                                    },
                                    provider: { order: ["OpenAI", "Google", "Vertex", "Groq"], allow_fallbacks: true }
                                }),
                            });
                        } else {
                            console.log(`[STREAM] Fallback: Direct Gemini (${GEMINI_MODEL})...`);
                            return await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    contents: [{ parts }],
                                    generationConfig: { responseMimeType: "application/json" }
                                }),
                            });
                        }
                    };

                    try {
                        if (!OPENROUTER_API_KEY) throw new Error("OpenRouter Key missing");
                        identificationResponse = await attemptAI(true);

                        // Check if primary succeeded but returned empty content (routing error)
                        if (identificationResponse.ok) {
                            const clone = identificationResponse.clone();
                            const result = await clone.json();
                            if (!result.choices?.[0]?.message?.content) {
                                throw new Error("Primary returned empty content");
                            }
                        } else if (identificationResponse.status === 429 || identificationResponse.status >= 500) {
                            throw new Error(`Primary fail: ${identificationResponse.status}`);
                        }
                    } catch (error) {
                        console.warn("Primary AI failed, trying fallback...", error.message);
                        isFallback = true;
                        identificationResponse = await attemptAI(false);
                    }

                    // CLEAR LARGE VARS
                    // @ts-ignore
                    image = null; audio = null; parts = null;

                    if (!identificationResponse || !identificationResponse.ok) {
                        const status = identificationResponse?.status;
                        const errorRaw = identificationResponse ? await identificationResponse.text() : "No response";
                        throw new Error(`AI error (${status}): ${errorRaw.substring(0, 100)}`);
                    }

                    const result = await identificationResponse.json();
                    let birdData: any[];

                    if (!isFallback) {
                        const content = result.choices?.[0]?.message?.content;
                        if (!content) throw new Error("Response content empty");
                        const parsed = cleanAndParseJson(content, "OpenRouter");
                        birdData = parsed.candidates || parsed.birds || (Array.isArray(parsed) ? parsed : [parsed]);
                    } else {
                        birdData = cleanAndParseJson(result.candidates[0].content.parts[0].text, "Gemini");
                    }

                    const candidates = birdData.slice(0, 3);
                    console.log(`Identified ${candidates.length} candidates.`);

                    // STEP 3: Send real candidates
                    writeChunk(controller, { type: "candidates", data: candidates });

                    // STEP 4: Enrich and Stream Media Chunks
                    const xenoKey = XENO_CANTO_API_KEY || "";
                    for (const [index, bird] of candidates.entries()) {
                        const { scientific_name, name } = bird;
                        try {
                            const cached = await getCachedMedia(scientific_name);
                            if (cached) {
                                writeChunk(controller, { type: "media", index, data: cached });
                            } else {
                                const media = await enrichSpecies(scientific_name, xenoKey);
                                writeChunk(controller, { type: "media", index, data: media });
                                setCachedMedia(scientific_name, name, media).catch(() => { });
                            }
                        } catch (err) {
                            console.error(`Enrichment failed for ${scientific_name}`, err);
                            writeChunk(controller, { type: "media", index, data: { inat_photos: [], sounds: [] } });
                        }
                    }

                    writeChunk(controller, { type: "done", duration: Date.now() - startTime });
                    controller.close();
                } catch (streamError: any) {
                    console.error("[STREAM ERROR]", streamError);
                    try { writeChunk(controller, { type: "error", message: streamError.message }); } catch { }
                    controller.close();
                }
            },
        });

        return createStreamResponse(stream);
    } catch (error: any) {
        console.error("Critical Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
