import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from './_shared/cors.ts';

interface XenoCantoRecording {
    id: string;
    gen: string;
    sp: string;
    en: string;
    cnt: string;
    loc: string;
    file: string;
    q: string;
    type: string;
    rec: string;
    lic: string;
    length: string;
    osci: {
        small: string;
        medium: string;
        large: string;
    };
}

interface XenoCantoResponse {
    numRecordings: string;
    numSpecies: string;
    page: number;
    numPages: number;
    recordings: XenoCantoRecording[];
}

const XENO_CANTO_API_KEY = Deno.env.get('XENO_CANTO_API_KEY');

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { scientific_name } = await req.json();

        if (!scientific_name) {
            throw new Error('scientific_name is required');
        }

        // Xeno-canto API v2/v3 query.
        // Note: API key is typically used for specific endpoints or higher limits.
        // We'll include it as a param if provided.
        const query = encodeURIComponent(`sci:"${scientific_name}" q:A`);
        const url = `https://xeno-canto.org/api/2/recordings?q=${query}${XENO_CANTO_API_KEY ? `&key=${XENO_CANTO_API_KEY}` : ''}`;

        console.log(`Fetching sounds for: ${scientific_name}`);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Xeno-canto API error: ${response.statusText}`);
        }

        const data: XenoCantoResponse = await response.json();

        if (!data.recordings || data.recordings.length === 0) {
            return new Response(JSON.stringify({ recordings: [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Specific Filtering: 3 Songs and 1 Call
        const isSong = (rec: XenoCantoRecording) => rec.type.toLowerCase().includes('song');
        const isCall = (rec: XenoCantoRecording) => rec.type.toLowerCase().includes('call');

        const songs = data.recordings
            .filter(isSong)
            .slice(0, 3)
            .map(rec => ({
                id: rec.id,
                url: rec.file,
                waveform: rec.osci.large,
                type: 'song',
                quality: rec.q,
                recorder: rec.rec,
                license: rec.lic,
                duration: rec.length,
                location: rec.loc,
                country: rec.cnt
            }));

        const calls = data.recordings
            .filter(isCall)
            .slice(0, 1)
            .map(rec => ({
                id: rec.id,
                url: rec.file,
                waveform: rec.osci.large,
                type: 'call',
                quality: rec.q,
                recorder: rec.rec,
                license: rec.lic,
                duration: rec.length,
                location: rec.loc,
                country: rec.cnt
            }));

        const results = [...songs, ...calls];

        console.log(`Found ${songs.length} songs and ${calls.length} calls`);

        return new Response(JSON.stringify({ recordings: results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Error fetching sounds:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
