import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateBatchBirdMetadata, generateBirdMetadata } from "./_shared/ai-enrichment.ts";
import { corsHeaders, createStreamResponse } from "./_shared/cors.ts";
import { enrichSpecies } from "./_shared/enrichment.ts";
import { cleanAndParseJson, isWavHeaderPresent } from "./_shared/utils.ts";

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

async function getCachedMedia(scientificName: string) {
    try {
        const { data, error } = await supabase
            .from('species_meta')
            .select('inat_photos, sounds, male_image_url, female_image_url, juvenile_image_url, wikipedia_image')
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

/**
 * Adds a WAV header to a raw PCM byte array.
 * Assumes 16-bit, Mono, 48000Hz as per useAudioRecording.ts iOS/Android settings.
 */
function addWavHeader(pcmData: Uint8Array, sampleRate = 48000, channels = 1, bitDepth = 16): Uint8Array {
    const dataLength = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // RIFF header
    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, (sampleRate * channels * bitDepth) / 8, true);
    view.setUint16(32, (channels * bitDepth) / 8, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Copy PCM data
    new Uint8Array(buffer, 44).set(pcmData);
    return new Uint8Array(buffer);
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

        const contextPrompt = 'Current Date: ' + currentDate + '.\n\n';

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
                    const openRouterModel = "openai/gpt-4o";

                    const attemptAI = async (isPrimary: boolean, promptText: string): Promise<Response> => {
                        const isGemini = !isPrimary;
                        const model = isGemini ? GEMINI_MODEL : openRouterModel;

                        console.log('[AI] Routing to OpenRouter: ' + model);

                        const contentParts: any[] = [
                            { type: "text", text: isGemini ? promptText : promptText + '\n\nMANDATORY: Return a JSON object.' }
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

                                        const extractedCandidates: any[] = [];

                                        // 5a. Iterate through all time segments
                                        birdNetJson.predictions.forEach((segment: any) => {
                                            if (segment.species && Array.isArray(segment.species)) {
                                                // 5b. Iterate through species identified in this segment
                                                segment.species.forEach((speciesEntry: any) => {
                                                    const rawName = speciesEntry.species_name;
                                                    const probability = speciesEntry.probability;

                                                    // 5c. Filter low confidence & missing data
                                                    if (rawName && probability !== undefined && probability >= 0.1) {
                                                        const firstUnderscoreIdx = rawName.indexOf('_');
                                                        if (firstUnderscoreIdx !== -1) {
                                                            const scientificName = rawName.substring(0, firstUnderscoreIdx).trim();
                                                            const commonName = rawName.substring(firstUnderscoreIdx + 1).trim();

                                                            if (scientificName && commonName) {
                                                                extractedCandidates.push({
                                                                    name: commonName,
                                                                    scientific_name: scientificName,
                                                                    confidence: probability,
                                                                    identifying_features: `Identified via BirdNET acoustic analysis`,
                                                                    taxonomy: {}
                                                                });
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        });

                                        // 5d. Sort across all segments by confidence descending
                                        extractedCandidates.sort((a, b) => b.confidence - a.confidence);

                                        // 5e. Remove duplicates (taking the highest confidence for a species)
                                        const uniqueCandidates: any[] = [];
                                        const seenNames = new Set<string>();
                                        for (const candidate of extractedCandidates) {
                                            if (!seenNames.has(candidate.scientific_name)) {
                                                seenNames.add(candidate.scientific_name);
                                                uniqueCandidates.push(candidate);
                                            }
                                        }

                                        // 5f. Take top 3
                                        birdNetCandidates = uniqueCandidates.slice(0, 3);

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
                            // Image path: OpenRouter primary
                            isGeminiUsed = false;
                            identificationResponse = await attemptAI(true, fastPrompt);

                            if (!identificationResponse.ok) {
                                const errBody = await identificationResponse.text().catch(() => "unknown");
                                throw new Error('Primary AI failed with status ' + identificationResponse.status + ': ' + errBody);
                            }
                        }
                    } catch (err) {
                        console.warn("[PHASE1] Primary AI or BirdNET failed, checking fallback:", err);
                        // Only fallback if we haven't already used Gemini
                        if (!isGeminiUsed) {
                            isGeminiUsed = true;
                            try {
                                identificationResponse = await attemptAI(false, fastPrompt);
                                if (!identificationResponse.ok) {
                                    const errBody = await identificationResponse.text().catch(() => "unknown");
                                    throw new Error('Fallback AI failed with status ' + identificationResponse.status + ': ' + errBody);
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
                        console.log('[PHASE1] Using BirdNET candidates.');
                        writeChunk(controller, { type: "progress", message: 'Analysis: Acoustic analysis matched ' + candidates.length + ' potential species.' });
                    } else {
                        if (!identificationResponse) {
                            throw new Error("All AI models failed to identify the bird. Please try again.");
                        }

                        const resultJson = await identificationResponse.json().catch((jsonErr: any) => {
                            console.error("[PHASE1] Error reading AI response JSON:", jsonErr);
                            throw new Error("Failed to parse AI response body. The connection may have been closed.");
                        });

                        content = resultJson.choices?.[0]?.message?.content;

                        if (!content) {
                            console.error("[PHASE1] AI returned no content. Full response:", JSON.stringify(resultJson));
                            throw new Error("AI returned empty content.");
                        }

                        console.log('[PHASE1] Raw AI Response Content: ' + content);
                        console.log('[PHASE1] AI response successfully parsed. Model: ' + resultJson.model);

                        const parsed = cleanAndParseJson(content, resultJson.model || "OpenRouter");

                        // For audio, log the AI's acoustic description if available
                        if (audio && parsed.audio_description) {
                            console.log('[PHASE1] Audio Analysis: ' + parsed.audio_description);
                            // Optionally send this back as a progress message so user sees it
                            writeChunk(controller, { type: "progress", message: 'Analysis: ' + parsed.audio_description });
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
                                if (cached) {
                                    writeChunk(controller, { type: "media", index, data: cached });
                                } else {
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
                    try { writeChunk(controller, { type: "error", message: streamError.message }); } catch { /* ignore stream close */ }
                    controller.close();
                }
            }
        });

        return createStreamResponse(stream);
    } catch (error: any) { // Type 'unknown' requires casting for .message access
        console.error("Critical Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
