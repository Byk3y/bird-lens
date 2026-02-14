import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, createErrorResponse, createResponse } from "./_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-3-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface BirdIdentificationRequest {
    image?: string;
    audio?: string;
}

interface BirdIdentificationResult {
    name: string;
    scientific_name: string;
    rarity: string;
    fact: string;
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

        console.log(`Starting identification using ${GEMINI_MODEL} for ${image ? "image" : "audio"}...`);
        const startTime = Date.now();

        const prompt = image
            ? "Identify the bird in this image. Return accurate ornithological data."
            : "Identify the bird singing in this audio clip. Return accurate ornithological data.";

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
                            rarity: { type: "STRING", enum: ["Common", "Uncommon", "Rare", "Very Rare"] },
                            fact: { type: "STRING" },
                            confidence: { type: "NUMBER" },
                        },
                        required: ["name", "scientific_name", "rarity", "fact", "confidence"],
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
