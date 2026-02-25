import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

console.log("LOG: Function loading... Flux 2.0 version");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
    console.log(`LOG: Received ${req.method} request to enhance-image`);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!OPENROUTER_API_KEY) {
            console.error("LOG: OPENROUTER_API_KEY is missing from environment");
            return new Response(JSON.stringify({ error: "Configuration error: API key missing" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const body = await req.json();
        const { image, prompt: userPrompt } = body;

        if (!image) {
            console.error("LOG: Request missing image data");
            return new Response(JSON.stringify({ error: "Image is required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log("LOG: Image received, size:", image.length);

        // Default enhancement prompt if none provided
        const enhancementPrompt = userPrompt || "Enhance this bird photograph. Maintain the exact species and colors but make it ultra-high resolution, sharp, and detailed. Professional wildlife photography style, natural lighting, crystal-clear feather textures, and bokeh background if applicable.";

        console.log("LOG: Calling OpenRouter with model black-forest-labs/flux.2-pro");

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://bird-lens.vercel.app",
                "X-Title": "Bird Lens Enhancer",
            },
            body: JSON.stringify({
                model: "black-forest-labs/flux.2-pro",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: enhancementPrompt
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
                                }
                            }
                        ]
                    }
                ],
                modalities: ["image"]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`LOG: OpenRouter failed with status ${response.status}:`, errorText);
            return new Response(JSON.stringify({
                error: `AI service error: ${response.status}`,
                details: errorText
            }), {
                status: response.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const responseData = await response.json();
        console.log("LOG: Received successful response from OpenRouter");

        // OpenRouter Flux 2.0 response format - usually returns in message.images or content
        const enhancedImage = responseData.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
            responseData.choices?.[0]?.message?.content;

        if (!enhancedImage) {
            console.error("LOG: No image found in AI response", JSON.stringify(responseData));
            return new Response(JSON.stringify({
                error: "Model failed to generate an enhanced image",
                debug: responseData
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log("LOG: Successfully returning enhanced image");
        return new Response(JSON.stringify({ enhancedImage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("LOG: Catch-all error in enhance-image:", error);
        return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
