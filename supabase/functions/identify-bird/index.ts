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
        const authHeader = req.headers.get('Authorization') || req.headers.get('apikey');
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

        // --- 2. Prompt Definitions ---

        const fastPromptInstructions = `
Identify this bird with maximum scientific precision.
Provide the **Top 3 most probable species** candidates.
Return ONLY the following fields for each:
- "name": Common name
- "scientific_name": Scientific name
- "confidence": A number from 0-1
- "taxonomy": {
    "family": "Common name of family",
    "scientific_family": "Scientific name of family",
    "genus": "Scientific name of genus",
    "genus_description": "Commonly called [Common Name of Genus]"
  }
`;

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
- "diet_tags": Array of simple dietary keywords.
- "conservation_status": "Current global conservation status (e.g., Least Concern, Near Threatened, Vulnerable, Endangered)."
- "key_facts": { 
    "size": "value (e.g., 9-11 inches)", 
    "wingspan": "value (e.g., 15-20 inches)",
    "wing_shape": "value (e.g., Pointed, Broad)",
    "tail_shape": "value (e.g., Notched, Square)",
    "colors": ["Primary", "Colors", "As", "Array"]
  }
`;

        // Include current date for better seasonality-based identification
        const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const contextPrompt = `Current Date: ${currentDate}.\n\n`;

        const fastPrompt = image
            ? `${persona}\n\n${contextPrompt}Identify the bird in this image.\n${fastPromptInstructions}`
            : `${persona}\n\n${contextPrompt}Identify the bird in this audio clip.\n${fastPromptInstructions}`;

        let parts: any[] = [{ text: fastPrompt }];
        if (image) parts.push({ inline_data: { mime_type: "image/jpeg", data: image } });
        else if (audio) parts.push({ inline_data: { mime_type: "audio/mp3", data: audio } });

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // HEARTBEAT: Send immediate "waiting" signal
                    writeChunk(controller, { type: "progress", message: "Analyzing plumage and patterns..." });

                    let identificationResponse: Response | undefined;
                    let isFallback = false;
                    const openRouterModel = "openai/gpt-4o";

                    const attemptAI = async (isPrimary: boolean, promptText: string): Promise<Response> => {
                        if (isPrimary) {
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
                                            { type: "text", text: `${promptText}\n\nMANDATORY: Return a JSON object.` },
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
                                                                confidence: { type: "number" },
                                                                taxonomy: {
                                                                    type: "object",
                                                                    properties: {
                                                                        family: { type: "string" },
                                                                        scientific_family: { type: "string" },
                                                                        genus: { type: "string" }
                                                                    },
                                                                    required: ["family", "scientific_family", "genus"],
                                                                    additionalProperties: false
                                                                }
                                                            },
                                                            required: ["name", "scientific_name", "confidence", "taxonomy"],
                                                            additionalProperties: false
                                                        }
                                                    }
                                                },
                                                required: ["candidates"],
                                                additionalProperties: false
                                            }
                                        }
                                    }
                                }),
                            });
                        } else {
                            return await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    contents: [{ parts: [{ text: promptText }, ...(image ? [{ inline_data: { mime_type: "image/jpeg", data: image } }] : []), ...(audio ? [{ inline_data: { mime_type: "audio/mp3", data: audio } }] : [])] }],
                                    generationConfig: { responseMimeType: "application/json" }
                                }),
                            });
                        }
                    };

                    // PHASE 1: Fast Identification
                    try {
                        identificationResponse = await attemptAI(true, fastPrompt);
                        if (!identificationResponse.ok) throw new Error("Primary Fast ID failed");
                    } catch {
                        isFallback = true;
                        identificationResponse = await attemptAI(false, fastPrompt);
                    }

                    const fastResult = await identificationResponse.json();
                    let candidates: any[];

                    if (!isFallback) {
                        const content = fastResult.choices?.[0]?.message?.content;
                        if (!content) throw new Error("OpenRouter returned empty content");
                        const parsed = cleanAndParseJson(content, "OpenRouter");
                        candidates = parsed.candidates || [];
                    } else {
                        const content = fastResult.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (!content) throw new Error("Gemini returned empty content");
                        const parsed = cleanAndParseJson(content, "Gemini");
                        candidates = parsed.candidates || [];
                    }

                    candidates = candidates.slice(0, 3);
                    writeChunk(controller, { type: "candidates", data: candidates });
                    writeChunk(controller, { type: "progress", message: "Writing your field guide..." });

                    // PHASE 2: Parallel Background Enrichment
                    const xenoKey = XENO_CANTO_API_KEY || "";

                    const hasCandidates = candidates && candidates.length > 0;

                    // Heartbeat helper to keep the stream alive
                    const startHeartbeat = () => setInterval(() => {
                        try { writeChunk(controller, { type: "heartbeat" }); } catch { }
                    }, 5000);

                    // Helper for prioritized metadata enrichment
                    const fetchPrioritizedMetadata = async () => {
                        if (!hasCandidates) return;

                        const heartbeatId = startHeartbeat();
                        try {
                            // 1. Prioritize Top Candidate for instant UI satisfaction
                            const topCandidate = candidates[0];
                            const topPrompt = enrichmentPromptInstructions.replace("[[SPECIES_NAMES]]", topCandidate.scientific_name);
                            const topResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                                method: "POST",
                                headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    model: openRouterModel,
                                    messages: [{ role: "user", content: topPrompt }],
                                    response_format: { type: "json_object" }
                                }),
                            });

                            if (topResponse.ok) {
                                const data = await topResponse.json();
                                const parsed = cleanAndParseJson(data.choices[0].message.content, "Enrichment-Top");
                                const meta = parsed.birds?.[0] || parsed.candidates?.[0] || (Array.isArray(parsed) ? parsed[0] : parsed);
                                if (meta) writeChunk(controller, { type: "metadata", index: 0, data: meta });
                            }

                            // 2. Fetch others in the background if they exist
                            if (candidates.length > 1) {
                                const others = candidates.slice(1);
                                const speciesNames = others.map(c => c.scientific_name).join(", ");
                                const othersPrompt = enrichmentPromptInstructions.replace("[[SPECIES_NAMES]]", speciesNames);

                                const othersResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                                    method: "POST",
                                    headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        model: openRouterModel,
                                        messages: [{ role: "user", content: othersPrompt }],
                                        response_format: { type: "json_object" }
                                    }),
                                });

                                if (othersResponse.ok) {
                                    const data = await othersResponse.json();
                                    const parsed = cleanAndParseJson(data.choices[0].message.content, "Enrichment-Others");
                                    const metadataList = parsed.birds || parsed.candidates || (Array.isArray(parsed) ? parsed : []);

                                    others.forEach((cand, i) => {
                                        const idx = i + 1;
                                        const meta = metadataList.find((m: any) =>
                                            m.name?.toLowerCase() === cand.name.toLowerCase() ||
                                            m.scientific_name?.toLowerCase() === cand.scientific_name.toLowerCase()
                                        ) || metadataList[i];
                                        if (meta) writeChunk(controller, { type: "metadata", index: idx, data: meta });
                                    });
                                }
                            }
                        } finally {
                            clearInterval(heartbeatId);
                        }
                    };

                    // Run everything in parallel
                    await Promise.all([
                        fetchPrioritizedMetadata(),
                        ...(hasCandidates ? candidates.map(async (bird, index) => {
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
                                console.error(`Media enrichment failed for ${scientific_name}`, err);
                                writeChunk(controller, { type: "media", index, data: { inat_photos: [], sounds: [] } });
                            }
                        }) : [])
                    ]);

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
