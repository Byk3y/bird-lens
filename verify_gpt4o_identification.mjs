import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env file
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
    console.error('Error: SUPABASE_URL not found in environment variables.');
    process.exit(1);
}

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/identify-bird`;
const TEST_IMAGE_URL = 'https://inaturalist-open-data.s3.amazonaws.com/photos/95545/medium.jpg';

async function verifyIdentification() {
    console.log(`Fetching test image from: ${TEST_IMAGE_URL}`);
    const imageResponse = await fetch(TEST_IMAGE_URL);
    const buffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    console.log('Calling identify-bird Edge Function...');
    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer dummy_token_for_verification',
        },
        body: JSON.stringify({
            image: base64Image
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error: ${response.status} - ${errorText}`);
        return;
    }

    console.log('Response received (Streaming NDJSON):');
    const reader = response.body;
    let decodedText = '';

    // Process stream
    for await (const chunk of reader) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n').filter(l => l.trim());
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                if (data.type === 'progress') {
                    console.log(`[PROGRESS] ${data.message}`);
                } else if (data.type === 'candidates') {
                    console.log('[RESULT] Candidates identified:');
                    data.data.forEach((c, i) => {
                        console.log(`${i + 1}. ${c.name} (${c.scientific_name}) - Confidence: ${c.confidence}`);
                    });
                } else if (data.type === 'media') {
                    console.log(`[MEDIA] Received for candidate ${data.index}`);
                } else if (data.type === 'done') {
                    console.log(`[DONE] Total duration: ${data.duration}ms`);
                } else if (data.type === 'error') {
                    console.error(`[ERROR] ${data.message}`);
                }
            } catch (e) {
                console.warn('Could not parse chunk as JSON:', line);
            }
        }
    }
}

verifyIdentification().catch(console.error);
