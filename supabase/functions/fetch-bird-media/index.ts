import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "./_shared/cors.ts";

interface MediaRequest {
    scientific_name: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

        const isStale = cached && (Date.now() - new Date(cached.updated_at).getTime() > 7 * 24 * 60 * 60 * 1000);

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

        // 1. Wikipedia Search for Image & Attribution
        const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|pageprops|imageinfo&titles=${encodeURIComponent(scientific_name)}&generator=search&gsrsearch=${encodeURIComponent(scientific_name)}&gsrlimit=1&piprop=original&iiprop=extmetadata&iiextmetadatafilter=ObjectName|Artist|LicenseShortName|UsageTerms`;

        const wikiResponse = await fetch(wikiSearchUrl);
        const wikiData = await wikiResponse.json();

        let imageUrl = null;
        let attribution = null;

        if (wikiData.query && wikiData.query.pages) {
            const pageId = Object.keys(wikiData.query.pages)[0];
            const page = wikiData.query.pages[pageId];

            if (page.original) {
                imageUrl = page.original.source;
            }

            // Get attribution from imageinfo if available
            // Note: This often requires a second call if the first one doesn't return full extmetadata for the specific file
            const fileTitle = page.pageimage ? `File:${page.pageimage}` : null;
            if (fileTitle) {
                const attrUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=extmetadata`;
                const attrRes = await fetch(attrUrl);
                const attrData = await attrRes.json();
                if (attrData.query && attrData.query.pages) {
                    const attrPageId = Object.keys(attrData.query.pages)[0];
                    const metadata = attrData.query.pages[attrPageId].imageinfo?.[0]?.extmetadata;
                    if (metadata) {
                        attribution = {
                            artist: metadata.Artist?.value || "Unknown",
                            license: metadata.LicenseShortName?.value || "CC BY-SA",
                            license_url: metadata.UsageTerms?.value || ""
                        };
                    }
                }
            }
        }

        // 2. GBIF TaxonMatch for Map Integration
        const gbifMatchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientific_name)}`;
        const gbifResponse = await fetch(gbifMatchUrl);
        const gbifData = await gbifResponse.json();

        const taxonKey = gbifData.usageKey;

        return new Response(JSON.stringify({
            image: {
                url: imageUrl,
                attribution: attribution
            },
            map: {
                taxonKey: taxonKey,
                tileUrl: taxonKey ? `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=${taxonKey}&style=purpleYellow.poly` : null
            }
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
