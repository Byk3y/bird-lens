export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createResponse(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    });
}

export function createErrorResponse(message: string, status = 500) {
    return createResponse({ error: message }, status);
}

/**
 * Creates a streaming NDJSON response.
 * Each chunk is a JSON object on its own line.
 */
export function createStreamResponse(stream: ReadableStream) {
    return new Response(stream, {
        status: 200,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

/**
 * Writes a single NDJSON chunk to the stream controller.
 */
export function writeChunk(controller: ReadableStreamDefaultController, data: Record<string, any>) {
    const line = JSON.stringify(data) + '\n';
    controller.enqueue(new TextEncoder().encode(line));
}
