import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const { image, audio } = await req.json();

        let prompt = "Identify the bird in this image. Return a JSON object with: { \"name\": \"Common Name\", \"scientific_name\": \"Scientific Name\", \"rarity\": \"Common/Rare\", \"fact\": \"One interesting fact\", \"confidence\": 0.95 }";

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
            prompt = "Identify the bird in this audio clip. Return a JSON object with: { \"name\": \"Common Name\", \"scientific_name\": \"Scientific Name\", \"rarity\": \"Common/Rare\", \"fact\": \"One interesting fact\", \"confidence\": 0.95 }";
            parts[0].text = prompt;
        }

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts }] }),
        });

        const result = await response.json();
        const textResponse = result.candidates[0].content.parts[0].text;

        // Extract JSON from markdown code blocks if present
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        const birdData = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Could not parse AI response" };

        return new Response(JSON.stringify(birdData), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }
});
