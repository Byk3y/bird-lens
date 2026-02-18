import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders, createStreamResponse } from "./_shared/cors.ts";
import { enrichSpecies } from "./_shared/enrichment.ts";
import { cleanAndParseJson } from "./_shared/utils.ts";

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
            .select('inat_photos, sounds, male_image_url, female_image_url, juvenile_image_url, wikipedia_image')
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
                juvenile_image_url: mediaData.juvenile_image_url || null,
                wikipedia_image: mediaData.wikipedia_image || null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'scientific_name' });

        if (error) console.error("Cache save error:", error);
    } catch (e) {
        console.error("Cache save error:", e);
    }
}

// ---------- Helper: JSON Cleaning ----------

// (Moved to _shared/utils.ts)

// ---------- Main Handler ----------

serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        // --- 1. Internal Auth Check ---
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "No authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

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
- "habitat": Provide a high-density ecological description. Include elevation ranges in meters, specific vegetation, forest types, and regional variations in habitat. Mention if it's primary or secondary forest.
- "nesting_info": Describe specific materials used (e.g., spider webs, mud, twigs), clutch size (typical number of eggs), and specific location details (e.g., "fork of a tree", "cliff ledge", "cavity").
- "identification_tips": Provide clear, actionable field marks. 
    - Describe the specific shape of the bill and tail.
    - Mention prominent wing bars or eye rings.
    - Describe the flight pattern if distinctive.
- **SMART GENDER/AGE DIFFERENTIATION**: 
    - Only provide "female" or "juvenile" identification tips if they differ significantly from the male/adult. 
    - If genders are monomorphic (look identical), set "female" to null.
    - If juveniles look like adults, set "juvenile" to null.
    - NEVER provide filler like "Similar to male."

MANDATORY RULES:
1. Return exactly 3 candidates.
2. For measurements, use "inches" or "cm" only.
3. confidence: decimal 0-1.
4. "also_known_as": array of strings.
5. "taxonomy", "identification_tips", "nesting_info", "feeder_info", and "key_facts" MUST be objects.

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
      "habitat": "Detailed ecological habitat description (include elevation, vegetation, regional variants)",
      "habitat_tags": ["Keyword 1"],
      "nesting_info": { "description": "Construction materials and clutch details", "location": "Precise placement details", "type": "Cup, cavity, etc." },
      "feeder_info": { "attracted_by": ["Food 1"], "feeder_types": ["Type 1"] },
      "behavior": "Key field behaviors",
      "rarity": "Status level (Common, Uncommon, Rare)",
      "fact": "Interesting trivia",
      "distribution_area": "Geographic range",
      "conservation_status": "IUCN Status (e.g., Least Concern, Vulnerable)",
      "key_facts": {
        "size": "5-6 inches",
        "wingspan": "8-10 inches",
        "wing_shape": "Rounded/Pointed/Broad",
        "life_expectancy": "10 years",
        "colors": ["Brown", "White"],
        "tail_shape": "Notched/Square/Forked",
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
                                                                        male: { type: ["string", "null"] },
                                                                        female: { type: ["string", "null"] },
                                                                        juvenile: { type: ["string", "null"] }
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
                    } catch (error: any) {
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
