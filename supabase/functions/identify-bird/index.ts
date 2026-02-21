import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateBatchBirdMetadata, generateBirdMetadata } from "./_shared/ai-enrichment.ts";
import { corsHeaders, createStreamResponse } from "./_shared/cors.ts";
import { enrichSpecies } from "./_shared/enrichment.ts";
import { cleanAndParseJson } from "./_shared/utils.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const XENO_CANTO_API_KEY = Deno.env.get("XENO_CANTO_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const GEMINI_MODEL = "google/gemini-2.0-flash-001";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface BirdIdentificationRequest {
    image?: string;
    imagePath?: string;
    audio?: string;
}

const writeChunk = (controller: ReadableStreamDefaultController, data: any) => {
    try {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
    } catch {
        // Stream might be closed
    }
};

/**
 * Helper to perform a fetch with a timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 45000): Promise<Response> {
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

        if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing");

        let body: BirdIdentificationRequest = await req.json();
        let image = body.image;
        let imagePath = body.imagePath;
        let audio = body.audio;

        console.log(`Request received. Image length: ${image?.length || 0}, ImagePath: ${imagePath}, Audio length: ${audio?.length || 0}`);

        if (!image && !imagePath && !audio) {
            return new Response(JSON.stringify({ error: "Either image, imagePath, or audio data is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // --- Download image from storage if only imagePath is provided ---
        if (!image && imagePath) {
            console.log(`Downloading image from storage: ${imagePath}`);
            const { data, error } = await supabase.storage.from('sightings').download(imagePath);
            if (error) {
                console.error("Storage download error:", error);
                throw new Error(`Failed to download image from storage: ${error.message}`);
            }
            const buffer = await data.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            image = encode(bytes);
            console.log(`Downloaded image. Base64 length: ${image.length}`);
        }

        const startTime = Date.now();
        const persona = "You are a world-class Expert Field Ornithologist and Nature Educator.";

        // --- 2. Prompt Definitions ---

        const fastPromptInstructions = `
Identify this bird with maximum scientific precision.
Provide the **Top 3 most probable species** candidates.

Return a JSON object with a "candidates" array. Each object in the array must include:
- "name": Common name
- "scientific_name": Scientific name
- "confidence": A number from 0-1
- "taxonomy": {
    "family": "Common name of family",
    "family_scientific": "Scientific name of family",
    "genus": "Scientific name of genus",
    "genus_description": "Commonly called [Common Name of Genus]",
    "order": "Scientific name of order",
    "order_description": "Common name of order"
  }

Example response format: {"candidates": [{"name": "...", "scientific_name": "...", "confidence": 0.95, "taxonomy": {...}}]}
`;

        const audioPromptInstructions = `
Identify the bird species in this audio clip with extreme precision.
MANDATORY: Analysis Step
Before identifying the species, analyze the following acoustic properties:
- Tone: Is it whistled, buzzy, harsh, or melodic?
- Rhythm: Continuous, pulsed, accelerated, or decelerated?
- Pitch: High-pitched, low-pitched, or sliding (up/down)?
- Frequency: Approximate frequency range if identifiable.

If the audio is mostly silence, wind, human speech, or non-bird noise, you MUST return a 0 confidence score or an empty candidates list. DO NOT HALLUCINATE A BIRD IF ONE IS NOT HEARD.

Provide the **Top 3 most probable species** candidates based ONLY on the audio evidence.

Return a JSON object with:
- "candidates": Array of objects (name, scientific_name, confidence, identifying_features, taxonomy)
- "audio_description": A brief summary of the acoustic features heard.

Example format: {"candidates": [{"name": "...", "scientific_name": "...", "confidence": 0.95, "identifying_features": "Two-note 'fee-bee' whistle...", "taxonomy": {...}}], "audio_description": "..."}
`;

        // Include current date for better seasonality-based identification
        const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const contextPrompt = `Current Date: ${currentDate}.\n\n`;

        const fastPrompt = image
            ? `${persona}\n\n${contextPrompt}Identify the bird in this image.\n${fastPromptInstructions}`
            : `${persona}\n\n${contextPrompt}Identify the bird in this audio clip.\n${audioPromptInstructions}`;

        const stream = new ReadableStream({
            async start(controller) {
                let heartbeatId: any;
                try {
                    // GLOBAL HEARTBEAT: Keep connection alive through all phases
                    heartbeatId = setInterval(() => {
                        writeChunk(controller, { type: "heartbeat" });
                    }, 10000);

                    // HEARTBEAT: Send immediate "waiting" signal
                    writeChunk(controller, { type: "progress", message: audio ? "Analyzing audio patterns..." : "Scanning image features..." });

                    // PHASE 1: Identification
                    const openRouterModel = "openai/gpt-4o";

                    const attemptAI = async (isPrimary: boolean, promptText: string): Promise<Response> => {
                        const isGemini = audio || !isPrimary;
                        const model = isGemini ? GEMINI_MODEL : openRouterModel;

                        console.log(`[AI] Routing to OpenRouter: ${model} (Audio: ${!!audio})`);

                        const contentParts: any[] = [
                            { type: "text", text: isGemini ? promptText : `${promptText}\n\nMANDATORY: Return a JSON object.` }
                        ];

                        if (image) {
                            contentParts.push({
                                type: "image_url",
                                image_url: { url: `data:image/webp;base64,${image}` }
                            });
                        }

                        if (audio) {
                            // Correct OpenRouter format for multimodal audio data (e.g. Gemini 2.0 Flash)
                            contentParts.push({
                                type: "input_audio",
                                input_audio: {
                                    data: audio,
                                    format: "m4a"
                                }
                            });
                        }

                        console.log(`[PHASE1] Requesting ${model} with ${contentParts.length} parts (Audio: ${!!audio}, Image: ${!!image})`);

                        return await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                                "Content-Type": "application/json",
                                "HTTP-Referer": "https://bird-identifier.supabase.co",
                                "X-Title": "Bird Identifier",
                            },
                            body: JSON.stringify({
                                model: model,
                                messages: [{
                                    role: "user",
                                    content: contentParts
                                }],
                                response_format: { type: "json_object" },
                                temperature: isGemini ? 0.1 : undefined
                            }),
                        });
                    };

                    let identificationResponse: Response | undefined;
                    let isGeminiUsed = false;
                    let birdNetCandidates: any[] = [];
                    let usedBirdNet = false;

                    try {
                        // If audio is present, try BirdNET first
                        if (audio) {
                            writeChunk(controller, { type: "progress", message: "Analyzing audio with BirdNET..." });
                            try {
                                // 1. Convert base64 audio to binary
                                const audioBytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));

                                // 2. Create FormData
                                const formData = new FormData();
                                const blob = new Blob([audioBytes], { type: 'audio/wav' });
                                formData.append('audio', blob, 'audio.wav');

                                console.log(`[PHASE1] Sending audio to BirdNET API. Bytes: ${audioBytes.length}`);

                                // 3. Call BirdNET API
                                const birdNetApiKey = Deno.env.get('BIRDNET_API_KEY');
                                const headers: Record<string, string> = {};
                                if (birdNetApiKey) {
                                    headers['Authorization'] = `Bearer ${birdNetApiKey}`;
                                }

                                const birdNetResponse = await fetchWithTimeout(
                                    "https://birdnet-inference-api-production-ed4a.up.railway.app/inference/",
                                    {
                                        method: "POST",
                                        headers,
                                        body: formData,
                                    },
                                    45000 // 45 second timeout for inference
                                );

                                if (!birdNetResponse.ok) {
                                    throw new Error(`BirdNET API failed with status ${birdNetResponse.status}`);
                                }

                                const birdNetJson = await birdNetResponse.json();
                                console.log(`[PHASE1] BirdNET Response:`, JSON.stringify(birdNetJson));

                                // 4. Map BirdNET response to our existing candidates format
                                // BirdNET returns: { "predictions": [ { "common_name": "...", "scientific_name": "...", "confidence": 0.95 } ] }
                                if (birdNetJson.predictions && Array.isArray(birdNetJson.predictions) && birdNetJson.predictions.length > 0) {
                                    birdNetCandidates = birdNetJson.predictions.map((p: any) => ({
                                        name: p.common_name,
                                        scientific_name: p.scientific_name,
                                        confidence: p.confidence,
                                        // We don't have full taxonomy from BirdNET directly, but it meets the basic UI contract
                                        identifying_features: `Identified via BirdNET acoustic analysis`,
                                    }));
                                    usedBirdNet = true;
                                    console.log(`[PHASE1] BirdNET successfully identified ${birdNetCandidates.length} candidates.`);
                                } else {
                                    throw new Error("BirdNET returned empty predictions array");
                                }

                            } catch (birdNetErr) {
                                console.warn("[PHASE1] BirdNET failed or returned empty. Falling back to Gemini:", birdNetErr);
                                // Fallback to Gemini
                                isGeminiUsed = true;
                                identificationResponse = await attemptAI(false, fastPrompt);
                                if (!identificationResponse.ok) {
                                    const errBody = await identificationResponse.text().catch(() => "unknown");
                                    throw new Error(`Fallback AI failed with status ${identificationResponse.status}: ${errBody}`);
                                }
                            }
                        } else {
                            // Image path: OpenRouter primary
                            isGeminiUsed = false;
                            identificationResponse = await attemptAI(true, fastPrompt);

                            if (!identificationResponse.ok) {
                                const errBody = await identificationResponse.text().catch(() => "unknown");
                                throw new Error(`Primary AI failed with status ${identificationResponse.status}: ${errBody}`);
                            }
                        }
                    } catch (err) {
                        console.warn("[PHASE1] Primary AI failed, checking fallback:", err);
                        // Only fallback if we haven't already used Gemini (and it wasn't audio, since audio already falls back to Gemini in its own block above)
                        if (!isGeminiUsed && !audio) {
                            isGeminiUsed = true;
                            try {
                                identificationResponse = await attemptAI(false, fastPrompt);
                                if (!identificationResponse.ok) {
                                    const errBody = await identificationResponse.text().catch(() => "unknown");
                                    throw new Error(`Fallback AI failed with status ${identificationResponse.status}: ${errBody}`);
                                }
                            } catch (innerErr) {
                                console.error("[PHASE1] Fallback AI also failed:", innerErr);
                                throw innerErr;
                            }
                        } else {
                            throw err;
                        }
                    }

                    let candidates: any[] = [];
                    let content: string = "";

                    if (usedBirdNet) {
                        candidates = birdNetCandidates;
                        content = JSON.stringify({ predictions: birdNetCandidates });
                        console.log(`[PHASE1] Using BirdNET candidates.`);
                        writeChunk(controller, { type: "progress", message: `Analysis: Acoustic analysis matched ${candidates.length} potential species.` });
                    } else {
                        if (!identificationResponse) {
                            throw new Error("All AI models failed to identify the bird. Please try again.");
                        }

                        const resultJson = await identificationResponse.json();
                        content = resultJson.choices?.[0]?.message?.content;

                        if (!content) {
                            console.error("[PHASE1] AI returned no content. Full response:", JSON.stringify(resultJson));
                            throw new Error("AI returned empty content.");
                        }

                        console.log(`[PHASE1] Raw AI Response Content: ${content}`);
                        console.log(`[PHASE1] AI response successfully parsed. Model: ${resultJson.model}`);

                        const parsed = cleanAndParseJson(content, resultJson.model || "OpenRouter");

                        // For audio, log the AI's acoustic description if available
                        if (audio && parsed.audio_description) {
                            console.log(`[PHASE1] Audio Analysis: ${parsed.audio_description}`);
                            // Optionally send this back as a progress message so user sees it
                            writeChunk(controller, { type: "progress", message: `Analysis: ${parsed.audio_description}` });
                        }

                        candidates = parsed.candidates || parsed.birds || parsed.species || parsed.results || (Array.isArray(parsed) ? parsed : []);
                    }

                    if (!candidates || candidates.length === 0) {
                        throw new Error(audio
                            ? "Could not identify any distinct bird sounds. Try recording closer to the source."
                            : "AI returned no bird candidates. Please try again with a clearer image.");
                    }

                    candidates = candidates.slice(0, 3);
                    writeChunk(controller, {
                        type: "candidates",
                        data: candidates,
                        raw_content: content // Return the raw AI content for debugging/metadata
                    });
                    writeChunk(controller, { type: "progress", message: "Consulting field guides..." });

                    // PHASE 2: Parallel Background Enrichment
                    const xenoKey = XENO_CANTO_API_KEY || "";
                    const hasCandidates = candidates && candidates.length > 0;

                    // Helper for prioritized metadata enrichment
                    const fetchPrioritizedMetadata = async () => {
                        if (!hasCandidates) return;
                        try {
                            const topCandidate = candidates[0];
                            const meta = await generateBirdMetadata(topCandidate.scientific_name);
                            if (meta) {
                                writeChunk(controller, { type: "metadata", index: 0, data: meta });
                            }

                            if (candidates.length > 1) {
                                const others = candidates.slice(1);
                                const otherNames = others.map((c: any) => c.scientific_name);
                                const batchMeta = await generateBatchBirdMetadata(otherNames);

                                if (batchMeta && batchMeta.length > 0) {
                                    others.forEach((cand: any, i: number) => {
                                        const idx = i + 1;
                                        const meta = batchMeta.find((m: any) =>
                                            m.scientific_name?.toLowerCase() === cand.scientific_name.toLowerCase() ||
                                            m.name?.toLowerCase() === cand.name.toLowerCase()
                                        ) || batchMeta[i];

                                        if (meta) {
                                            writeChunk(controller, { type: "metadata", index: idx, data: meta });
                                        }
                                    });
                                }
                            }
                        } catch (err) {
                            console.error("Metadata enrichment error:", err);
                        }
                    };

                    // Run everything in parallel
                    await Promise.all([
                        fetchPrioritizedMetadata(),
                        ...(hasCandidates ? candidates.map(async (bird: any, index: number) => {
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
                    clearInterval(heartbeatId);
                    controller.close();
                } catch (streamError: any) {
                    if (heartbeatId) clearInterval(heartbeatId);
                    console.error("[STREAM ERROR]", streamError);
                    try { writeChunk(controller, { type: "error", message: streamError.message }); } catch { }
                    controller.close();
                }
            }
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
