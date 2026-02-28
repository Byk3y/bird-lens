import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateBatchBirdMetadata, generateBirdMetadata } from "../_shared/ai-enrichment.ts";
import { corsHeaders, createStreamResponse } from "../_shared/cors.ts";
import { enrichSpecies } from "../_shared/enrichment.ts";
import { addWavHeader, cleanAndParseJson, isWavHeaderPresent, mapBirdNetToCandidates } from "../_shared/utils.ts";

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
    location?: string;
}

const writeChunk = (controller: ReadableStreamDefaultController, data: unknown) => {
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

const CACHE_TTL_DAYS = 14;

async function getCachedMedia(scientificName: string) {
    try {
        const { data, error } = await supabase
            .from('species_meta')
            .select('inat_photos, sounds, male_image_url, female_image_url, juvenile_image_url, wikipedia_image, updated_at, identification_data')
            .eq('scientific_name', scientificName.trim())
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

async function setCachedMedia(scientificName: string, name: string, mediaData: any) { // @ts-ignore: mediaData has a complex structure from enrichSpecies
    try {
        const { error } = await supabase
            .from('species_meta')
            .upsert({
                scientific_name: scientificName.trim(),
                common_name: name.trim(),
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
        // JWT verification is handled by Supabase (verify_jwt: true)
        // No manual auth header check needed

        if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing");

        let body: BirdIdentificationRequest = await req.json();
        let image = body.image;
        let imagePath = body.imagePath;
        let audio = body.audio;
        let location = body.location;

        // --- Input size validation ---
        const MAX_IMAGE_BASE64_LENGTH = 15_000_000;  // ~10MB decoded
        const MAX_AUDIO_BASE64_LENGTH = 2_000_000;   // ~1.5MB decoded

        if (image && image.length > MAX_IMAGE_BASE64_LENGTH) {
            return new Response(JSON.stringify({ error: "Image too large. Maximum 10MB." }), {
                status: 413,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        if (audio && audio.length > MAX_AUDIO_BASE64_LENGTH) {
            return new Response(JSON.stringify({ error: "Audio too large. Maximum 1.5MB." }), {
                status: 413,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log('Request received. Image length: ' + (image?.length || 0) + ', ImagePath: ' + imagePath + ', Audio length: ' + (audio?.length || 0));

        if (!image && !imagePath && !audio) {
            return new Response(JSON.stringify({ error: "Either image, imagePath, or audio data is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // --- Download image from storage if only imagePath is provided ---
        if (!image && imagePath) {
            console.log('Downloading image from storage: ' + imagePath);
            const { data, error } = await supabase.storage.from('sightings').download(imagePath);
            if (error) {
                console.error("Storage download error:", error);
                throw new Error('Failed to download image from storage: ' + error.message);
            }
            const buffer = await data.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            image = encode(bytes);
            console.log('Downloaded image. Base64 length: ' + (image?.length || 0));
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
- "also_known_as": Array of strings (2-4 alternative common names)
- "taxonomy": {
    "family": "Common name of family",
    "family_scientific": "Scientific name of family",
    "genus": "Scientific name of genus",
    "genus_description": "A single short string: the common name for the genus group (e.g. 'Goldfinches' for genus Spinus)",
    "order": "Scientific name of order",
    "order_description": "Common name of order"
  }

Example response format: {"candidates": [{"name": "...", "scientific_name": "...", "confidence": 0.95, "also_known_as": ["..."], "taxonomy": {...}}]}
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

        const locationContext = location
            ? `The user is currently located in ${location}. Use location as a secondary hint only — if the visual evidence clearly identifies a species not common to this region, trust the visual evidence first. Only use location to break ties between equally likely candidates.`
            : '';

        const contextPrompt = `Today is ${currentDate}. ${locationContext}\n\n`;

        const fastPrompt = image
            ? persona + '\n\n' + contextPrompt + 'Identify the bird in this image.\n' + fastPromptInstructions
            : persona + '\n\n' + contextPrompt + 'Identify the bird in this audio clip.\n' + audioPromptInstructions;

        const stream = new ReadableStream({
            async start(controller) {
                let heartbeatId: any; // ReturnType<typeof setInterval> mismatch between environments
                try {
                    // GLOBAL HEARTBEAT: Keep connection alive through all phases
                    heartbeatId = setInterval(() => {
                        writeChunk(controller, { type: "heartbeat" });
                    }, 10000);

                    // HEARTBEAT: Send immediate "waiting" signal
                    writeChunk(controller, { type: "progress", message: audio ? "Analyzing acoustic patterns with BirdNET..." : "Scanning image features..." });

                    // PHASE 1: Identification
                    const PRIMARY_MODEL = GEMINI_MODEL;
                    const QWEN_MODEL = "qwen/qwen2.5-vl-72b-instruct";
                    const ERROR_FALLBACK_MODEL = "openai/gpt-4o";

                    const processIdentificationResponse = async (response: Response, isAudio: boolean) => {
                        const resultJson = await response.json().catch((jsonErr: any) => {
                            console.error("[PHASE1] Error reading AI response JSON:", jsonErr);
                            throw new Error("Failed to parse AI response body. The connection may have been closed.");
                        });

                        const content = resultJson.choices?.[0]?.message?.content;

                        if (!content) {
                            console.error("[PHASE1] AI returned no content. Full response:", JSON.stringify(resultJson));
                            throw new Error("AI returned empty content.");
                        }

                        console.log('[PHASE1] Raw AI Response Content: ' + content);
                        console.log('[PHASE1] AI response successfully parsed. Model: ' + resultJson.model);

                        const parsed = cleanAndParseJson(content, resultJson.model || "OpenRouter");

                        // For audio, log the AI's acoustic description if available
                        if (isAudio && parsed.audio_description) {
                            console.log('[PHASE1] Audio Analysis: ' + parsed.audio_description);
                        }

                        let candidates = parsed.candidates || parsed.birds || parsed.species || parsed.results || (Array.isArray(parsed) ? parsed : []);

                        if (!candidates || candidates.length === 0) {
                            throw new Error("AI returned no bird candidates.");
                        }

                        return { candidates, content, audio_description: parsed.audio_description };
                    };

                    const attemptAI = async (model: string, promptText: string): Promise<Response> => {
                        console.log('[AI] Routing to OpenRouter: ' + model);

                        const contentParts: any[] = [
                            { type: "text", text: model.includes("gemini") ? promptText : promptText + '\n\nMANDATORY: Return a JSON object.' }
                        ];

                        if (image) {
                            contentParts.push({
                                type: "image_url",
                                image_url: { url: 'data:image/webp;base64,' + image }
                            });
                        }

                        console.log('[PHASE1] Requesting ' + model + ' with ' + contentParts.length + ' parts (Image: ' + !!image + ')');

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
                                messages: [{
                                    role: "user",
                                    content: contentParts
                                }],
                                response_format: { type: "json_object" },
                                temperature: 0.1
                            }),
                        });
                    };

                    let identificationResponse: Response | undefined;
                    let birdNetCandidates: any[] = [];
                    let usedBirdNet = false;
                    let candidates: any[] = [];
                    let content: string = "";

                    try {
                        // If audio is present, try BirdNET first
                        if (audio) {
                            writeChunk(controller, { type: "progress", message: "Analyzing audio with BirdNET..." });

                            // 1. Convert base64 audio to binary
                            let audioBytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));


                            // 1.5. Trim audio to max 10 seconds (480,000 bytes at 48kHz mono 16-bit) to prevent Railway 503 limits
                            const MAX_BYTES = 500000;
                            const TRIM_BYTES = 480000;
                            if (audioBytes.length > MAX_BYTES) {
                                console.log(`[PHASE1] Audio bytes (${audioBytes.length}) exceeded max allowed size. Trimming to ${TRIM_BYTES} bytes.`);
                                audioBytes = audioBytes.slice(0, TRIM_BYTES);
                            }

                            // 2. Detect existing WAV header
                            const hasWavHeader = isWavHeaderPresent(audioBytes);
                            let wavBytes: Uint8Array;

                            if (hasWavHeader) {
                                console.log('[PHASE1] Existing WAV header detected. Not adding redundant header.');
                                wavBytes = audioBytes;
                            } else {
                                console.log('[PHASE1] No WAV header detected. Adding one...');
                                wavBytes = addWavHeader(audioBytes);
                            }

                            const blob = new Blob([wavBytes], { type: 'audio/wav' });

                            console.log('[PHASE1] Sending audio to BirdNET API. Original Bytes: ' + audioBytes.length + ', Final Bytes: ' + wavBytes.length);

                            const maxAttempts = 3;
                            let attempt = 0;
                            let lastError: any = null;

                            while (attempt < maxAttempts) {
                                attempt++;
                                try {
                                    if (attempt > 1) {
                                        console.log(`[PHASE1] Retrying BirdNET (Attempt ${attempt}/${maxAttempts})...`);
                                        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s backoff
                                    }

                                    // 2. Create FormData (re-create each time to be safe)
                                    const formData = new FormData();
                                    formData.append('file', blob, 'audio.wav');

                                    // 3. Call BirdNET API
                                    const birdNetApiKey = Deno.env.get('BIRDNET_API_KEY');
                                    const headers = new Headers();
                                    if (birdNetApiKey) {
                                        headers.append('Authorization', 'Bearer ' + birdNetApiKey);
                                    }

                                    console.log(`[PHASE1] BirdNET Attempt ${attempt} - Sending ${wavBytes.length} bytes`);

                                    const birdNetResponse = await fetchWithTimeout(
                                        "https://birdnet-inference-api-production-ed4a.up.railway.app/inference/",
                                        {
                                            method: "POST",
                                            headers,
                                            body: formData,
                                        },
                                        60000 // 60 second timeout for inference
                                    );

                                    if (!birdNetResponse.ok) {
                                        const errorBody = await birdNetResponse.text().catch(() => "unknown");
                                        console.error(`[PHASE1] BirdNET attempt ${attempt} failed with status ${birdNetResponse.status}: ${errorBody}`);
                                        throw new Error(`BirdNET API failed with status ${birdNetResponse.status}`);
                                    }

                                    // 4. Parse response body safely
                                    const birdNetJson = await birdNetResponse.json().catch((jsonErr: any) => {
                                        console.error(`[PHASE1] Error reading BirdNET JSON on attempt ${attempt}:`, jsonErr);
                                        throw new Error(`Error reading BirdNET response body: ${jsonErr.message}`);
                                    });

                                    console.log('[PHASE1] BirdNET Response received successfully.');

                                    // 5. Map BirdNET response to our existing candidates format
                                    if (birdNetJson && birdNetJson.predictions && Array.isArray(birdNetJson.predictions)) {
                                        console.log('[PHASE1] BirdNET Predictions:', JSON.stringify(birdNetJson.predictions.slice(0, 3)));

                                        birdNetCandidates = mapBirdNetToCandidates(birdNetJson);

                                        if (birdNetCandidates.length > 0) {
                                            usedBirdNet = true;
                                            break; // Success!
                                        } else {
                                            throw new Error("Could not identify any distinct bird sounds. Please try recording closer to the source.");
                                        }
                                    } else {
                                        throw new Error("BirdNET returned an empty or invalid response format.");
                                    }
                                } catch (err: any) {
                                    lastError = err;
                                    console.warn(`[PHASE1] BirdNET attempt ${attempt} failed:`, err.message);
                                }
                            }

                            if (!usedBirdNet) {
                                throw lastError || new Error("BirdNET acoustic analysis failed after all retries.");
                            }

                        } else {
                            // Image path: Primary model
                            identificationResponse = await attemptAI(PRIMARY_MODEL, fastPrompt);

                            if (!identificationResponse.ok) {
                                const errBody = await identificationResponse.text().catch(() => "unknown");
                                throw new Error('Primary AI failed with status ' + identificationResponse.status + ': ' + errBody);
                            }

                            const processed = await processIdentificationResponse(identificationResponse, !!audio);
                            candidates = processed.candidates;
                            content = processed.content;

                            // CHANGE 3: Confidence-Based Fallback (now uses Qwen)
                            const primaryConfidence = candidates[0]?.confidence || 0;
                            let finalAudioDescription = processed.audio_description;

                            if (primaryConfidence < 0.60) {
                                console.log(`[PHASE1] Primary confidence ${primaryConfidence} < 0.60. Requesting fallback (Qwen) for comparison.`);
                                try {
                                    const fallbackResponse = await attemptAI(QWEN_MODEL, fastPrompt);
                                    if (fallbackResponse.ok) {
                                        const processedFallback = await processIdentificationResponse(fallbackResponse, !!audio);
                                        const fallbackConfidence = processedFallback.candidates[0]?.confidence || 0;

                                        if (fallbackConfidence > primaryConfidence) {
                                            console.log(`[PHASE1] Fallback (Qwen) won (${fallbackConfidence} > ${primaryConfidence}). Using fallback results.`);
                                            candidates = processedFallback.candidates;
                                            content = processedFallback.content;
                                            finalAudioDescription = processedFallback.audio_description;
                                        } else {
                                            console.log(`[PHASE1] Primary (Gemini) stayed winner (${primaryConfidence} >= ${fallbackConfidence}). Sticking with primary.`);
                                        }
                                    }
                                } catch (err) {
                                    console.warn("[PHASE1] Confidence fallback effort (Qwen) failed - sticking with primary results:", err);
                                }
                            }

                            if (finalAudioDescription) {
                                writeChunk(controller, { type: "progress", message: 'Analysis: ' + finalAudioDescription });
                            }
                        }
                    } catch (err) {
                        console.warn("[PHASE1] Primary pipeline failed, checking emergency fallback (GPT-4o):", err);
                        // Final safety net for when everything above crashes or fails completely
                        try {
                            identificationResponse = await attemptAI(ERROR_FALLBACK_MODEL, fastPrompt);
                            if (!identificationResponse.ok) {
                                const errBody = await identificationResponse.text().catch(() => "unknown");
                                throw new Error('Emergency Fallback AI failed with status ' + identificationResponse.status + ': ' + errBody);
                            }

                            const processed = await processIdentificationResponse(identificationResponse, !!audio);
                            candidates = processed.candidates;
                            content = processed.content;
                            if (processed.audio_description) {
                                writeChunk(controller, { type: "progress", message: 'Analysis: ' + processed.audio_description });
                            }
                        } catch (innerErr) {
                            console.error("[PHASE1] Emergency Fallback AI also failed:", innerErr);
                            throw innerErr;
                        }
                    }

                    if (usedBirdNet) {
                        candidates = birdNetCandidates;
                        content = JSON.stringify({ predictions: birdNetCandidates });
                        console.log('[PHASE1] Using BirdNET candidates.');
                        writeChunk(controller, { type: "progress", message: 'Analysis: Acoustic analysis matched ' + candidates.length + ' potential species.' });
                    }

                    if (!candidates || candidates.length === 0) {
                        throw new Error(audio
                            ? "Could not identify any distinct bird sounds. Try recording closer to the source."
                            : "AI returned no bird candidates. Please try again with a clearer image.");
                    }

                    candidates = candidates.slice(0, 3);

                    // --- PRE-POPULATE METADATA FROM CACHE ---
                    // If we have a top candidate, check if we have recent metadata in the cache
                    // to eliminate the "skeleton" state on the ProfileHeader.
                    const topCandidate = candidates[0];
                    if (topCandidate && topCandidate.scientific_name) {
                        try {
                            const cacheResult = await getCachedMedia(topCandidate.scientific_name);
                            if (cacheResult && cacheResult.updated_at) {
                                const updatedAt = new Date(cacheResult.updated_at);
                                const now = new Date();
                                const diffDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

                                if (diffDays < CACHE_TTL_DAYS && cacheResult.identification_data) {
                                    const idData = cacheResult.identification_data as any;
                                    // Only merge if we have the critical fields that eliminate skeletons
                                    if (idData.also_known_as || idData.genus_description) {
                                        console.log(`[CACHE] Hit! Pre-populating metadata for ${topCandidate.scientific_name}`);
                                        candidates[0] = {
                                            ...topCandidate,
                                            also_known_as: idData.also_known_as || topCandidate.also_known_as,
                                            taxonomy: {
                                                ...topCandidate.taxonomy,
                                                genus_description: idData.genus_description || topCandidate.taxonomy?.genus_description
                                            }
                                        };
                                    }
                                }
                            }
                        } catch (cacheErr) {
                            console.warn("[CACHE] Meta lookup failed (non-critical):", cacheErr);
                        }
                    }

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
                                            m.scientific_name?.toLowerCase() === cand.scientific_name?.toLowerCase() ||
                                            m.name?.toLowerCase() === cand.name?.toLowerCase()
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
                            const scientific_name = bird.scientific_name?.trim();
                            const name = bird.name?.trim();
                            if (!scientific_name) return;
                            try {
                                const cached = await getCachedMedia(scientific_name);
                                // Implementation Plan: 14-day TTL check
                                const isStale = cached && (Date.now() - new Date(cached.updated_at).getTime() > 14 * 24 * 60 * 60 * 1000);

                                if (cached && !isStale) {
                                    writeChunk(controller, { type: "media", index, data: cached });
                                } else {
                                    if (isStale) console.log(`[TTL] Cache stale for ${scientific_name} (updated ${cached.updated_at}), refreshing...`);
                                    const media = await enrichSpecies(scientific_name, xenoKey);
                                    writeChunk(controller, { type: "media", index, data: media });
                                    setCachedMedia(scientific_name, name, media).catch(() => { });
                                }
                            } catch (err) {
                                console.error('Media enrichment failed for ' + scientific_name, err);
                                writeChunk(controller, { type: "media", index, data: { inat_photos: [], sounds: [] } });
                            }
                        }) : [])
                    ]);

                    writeChunk(controller, { type: "done", duration: Date.now() - startTime });
                    clearInterval(heartbeatId);
                    controller.close();
                } catch (streamError: any) { // @ts-ignore: Deno.serve error type
                    if (heartbeatId) clearInterval(heartbeatId);
                    console.error("[STREAM ERROR]", streamError);
                    try { writeChunk(controller, { type: "error", message: "We couldn't identify the bird this time. Please try again with a clearer image or audio recording." }); } catch { /* ignore stream close */ }
                    controller.close();
                }
            }
        });

        return createStreamResponse(stream);
    } catch (error: any) { // Type 'unknown' requires casting for .message access
        console.error("Critical Error:", error);
        return new Response(JSON.stringify({ error: "We couldn't identify the bird this time. Please try again with a clearer image or audio recording." }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
