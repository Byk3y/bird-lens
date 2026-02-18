import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "./_shared/cors.ts";
import { enrichSpecies } from "./_shared/enrichment.ts";

interface MediaRequest {
    scientific_name: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const XENO_CANTO_API_KEY = Deno.env.get("XENO_CANTO_API_KEY");

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { scientific_name } = await req.json() as MediaRequest;

        if (!scientific_name) {
            throw new Error('scientific_name is required');
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

        const isStale = cached && (Date.now() - new Date(cached.updated_at).getTime() > 14 * 24 * 60 * 60 * 1000); // 14 days

        if (cached && !isStale) {
            console.log(`Cache hit for media: ${scientific_name}`);
            return new Response(JSON.stringify({
                image: {
                    url: cached.wikipedia_image || (cached.inat_photos?.[0]?.url) || null,
                    attribution: null
                },
                map: {
                    taxonKey: cached.gbif_taxon_key,
                    tileUrl: cached.gbif_taxon_key ? `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=${cached.gbif_taxon_key}&style=purpleYellow.poly` : null
                },
                inat_photos: cached.inat_photos || [],
                sounds: cached.sounds || []
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Cache miss/stale for media: ${scientific_name}. Fetching fresh...`);

        // 1. GBIF TaxonMatch for Map Integration (fast)
        const gbifMatchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientific_name)}`;
        const gbifResponse = await fetch(gbifMatchUrl);
        const gbifData = await gbifResponse.json();
        const taxonKey = gbifData.usageKey;

        // 2. Full Enrichment (iNat photos, sounds, gendered images)
        const media = await enrichSpecies(scientific_name, XENO_CANTO_API_KEY || "");

        // 3. Wikipedia Search for Image & Attribution (as fallback for main image)
        let wikipediaImage = media.wikipedia_image;
        let attribution = null;

        if (!wikipediaImage) {
            const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|pageprops|imageinfo&titles=${encodeURIComponent(scientific_name)}&generator=search&gsrsearch=${encodeURIComponent(scientific_name)}&gsrlimit=1&piprop=original&iiprop=extmetadata&iiextmetadatafilter=ObjectName|Artist|LicenseShortName|UsageTerms`;
            const wikiResponse = await fetch(wikiSearchUrl);
            const wikiData = await wikiResponse.json();

            if (wikiData.query && wikiData.query.pages) {
                const pageId = Object.keys(wikiData.query.pages)[0];
                const page = wikiData.query.pages[pageId];
                if (page.original) {
                    wikipediaImage = page.original.source;
                }
            }
        }

        // 4. Update Cache in background (or foreground since we need to return the data anyway)
        const { error: upsertError } = await supabase
            .from("species_meta")
            .upsert({
                scientific_name: scientific_name,
                inat_photos: media.inat_photos || [],
                sounds: media.sounds || [],
                male_image_url: media.male_image_url,
                female_image_url: media.female_image_url,
                juvenile_image_url: media.juvenile_image_url,
                wikipedia_image: wikipediaImage,
                gbif_taxon_key: taxonKey?.toString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'scientific_name' });

        if (upsertError) {
            console.error("Cache update error:", upsertError);
        }

        return new Response(JSON.stringify({
            image: {
                url: wikipediaImage || (media.inat_photos?.[0]?.url) || null,
                attribution: attribution
            },
            map: {
                taxonKey: taxonKey,
                tileUrl: taxonKey ? `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=${taxonKey}&style=purpleYellow.poly` : null
            },
            inat_photos: media.inat_photos || [],
            sounds: media.sounds || []
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Error in fetch-bird-media:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

