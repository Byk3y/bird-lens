import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { generateBirdMetadata } from "./_shared/ai-enrichment.ts";
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

        const { data: cached } = await supabase
            .from("species_meta")
            .select("*")
            .eq("scientific_name", scientific_name)
            .single();

        let identificationData = cached?.identification_data;
        // Check if cache is stale (14 days)
        const isStale = cached && (Date.now() - new Date(cached.updated_at).getTime() > 14 * 24 * 60 * 60 * 1000);

        // If cache is valid AND has metadata, return it
        if (cached && !isStale && identificationData) {
            console.log(`Cache hit for media & metadata: ${scientific_name}`);
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
                sounds: cached.sounds || [],
                male_image_url: cached.male_image_url || null,
                female_image_url: cached.female_image_url || null,
                juvenile_image_url: cached.juvenile_image_url || null,
                wikipedia_image: cached.wikipedia_image || null,
                metadata: identificationData
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Cache miss/partial for: ${scientific_name}. Stale: ${isStale}, Missing Meta: ${!identificationData}`);

        let media;
        let taxonKey = cached?.gbif_taxon_key;
        let wikipediaImage = cached?.wikipedia_image;

        // 1. Fetch Media (Images/Sounds) if needed
        if (!cached || isStale) {
            // GBIF TaxonMatch
            const gbifMatchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientific_name)}`;
            const gbifResponse = await fetch(gbifMatchUrl);
            const gbifData = await gbifResponse.json();
            taxonKey = gbifData.usageKey;

            // Full Enrichment
            media = await enrichSpecies(scientific_name, XENO_CANTO_API_KEY || "");

            // Wikipedia Fallback
            wikipediaImage = media.wikipedia_image;
            if (!wikipediaImage) {
                const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|pageprops|imageinfo&titles=${encodeURIComponent(scientific_name)}&generator=search&gsrsearch=${encodeURIComponent(scientific_name)}&gsrlimit=1&piprop=original&iiprop=extmetadata&iiextmetadatafilter=ObjectName|Artist|LicenseShortName|UsageTerms`;
                const wikiResponse = await fetch(wikiSearchUrl);
                const wikiData = await wikiResponse.json();
                if (wikiData.query && wikiData.query.pages) {
                    const pageId = Object.keys(wikiData.query.pages)[0];
                    const page = wikiData.query.pages[pageId];
                    if (page.original) wikipediaImage = page.original.source;
                }
            }
        } else {
            // Reuse existing media if only metadata was missing
            media = {
                inat_photos: cached.inat_photos,
                sounds: cached.sounds,
                male_image_url: cached.male_image_url,
                female_image_url: cached.female_image_url,
                juvenile_image_url: cached.juvenile_image_url,
                wikipedia_image: cached.wikipedia_image
            };
        }

        // 2. Fetch/Generate Metadata if missing
        if (!identificationData) {
            console.log(`Generating AI metadata for: ${scientific_name}`);
            identificationData = await generateBirdMetadata(scientific_name);
        }

        // 3. Upsert everything to Cache
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
                identification_data: identificationData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'scientific_name' });

        if (upsertError) console.error("Cache update error:", upsertError);

        return new Response(JSON.stringify({
            image: {
                url: wikipediaImage || (media.inat_photos?.[0]?.url) || null,
                attribution: null
            },
            map: {
                taxonKey: taxonKey,
                tileUrl: taxonKey ? `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=${taxonKey}&style=purpleYellow.poly` : null
            },
            inat_photos: media.inat_photos || [],
            sounds: media.sounds || [],
            male_image_url: media.male_image_url || null,
            female_image_url: media.female_image_url || null,
            juvenile_image_url: media.juvenile_image_url || null,
            wikipedia_image: wikipediaImage || null,
            metadata: identificationData
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

