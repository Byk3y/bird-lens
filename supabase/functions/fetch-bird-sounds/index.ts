import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from '../_shared/cors.ts';
import { processXenoCantoRecordings } from "../_shared/utils.ts";

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
    'file-name': string;
}

interface XenoCantoResponse {
    numRecordings: string;
    numSpecies: string;
    page: number;
    numPages: number;
    recordings: XenoCantoRecording[];
}

const XENO_CANTO_API_KEY = Deno.env.get('XENO_CANTO_API_KEY');
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { scientific_name } = await req.json();

        if (!scientific_name) {
            throw new Error('scientific_name is required');
        }

        if (!XENO_CANTO_API_KEY) {
            throw new Error('XENO_CANTO_API_KEY is not configured');
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Supabase credentials missing");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Check Cache
        const { data: cached } = await supabase
            .from("species_meta")
            .select("*")
            .eq("scientific_name", scientific_name)
            .single();

        const isStale = cached && (Date.now() - new Date(cached.updated_at).getTime() > 7 * 24 * 60 * 60 * 1000);

        if (cached && !isStale && cached.sounds && cached.sounds.length > 0) {
            console.log(`Cache hit for sounds: ${scientific_name}`);
            return new Response(JSON.stringify({ recordings: cached.sounds }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Cache miss/stale for sounds: ${scientific_name}. Fetching fresh...`);

        // Xeno-canto API v3 query.
        // API key is REQUIRED for v3.
        // Query format uses tags: sp:"Genus species"
        const query = encodeURIComponent(`sp:"${scientific_name}" q:A`);
        const url = `https://xeno-canto.org/api/3/recordings?query=${query}&key=${XENO_CANTO_API_KEY}`;

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

        const results = processXenoCantoRecordings(data.recordings);

        console.log(`Found ${results.length} total recordings`);

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
