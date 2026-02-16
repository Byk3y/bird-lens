
const INAT_API_URL = "https://api.inaturalist.org/v1";
const WIKI_API_URL = "https://en.wikipedia.org/w/api.php";
const GBIF_API_URL = "https://api.gbif.org/v1";
const XENO_CANTO_API_URL = "https://xeno-canto.org/api/3/recordings";

export interface EnrichedMedia {
    inat_photos: any[];
    male_image_url: string | null;
    female_image_url: string | null;
    sounds: any[];
    wikipedia_image: string | null;
    gbif_taxon_key: string | null;
}

export async function enrichSpecies(scientificName: string, xenoCantoApiKey: string): Promise<EnrichedMedia> {
    console.log(`Enriching data for: ${scientificName}`);

    const [inatData, malePhoto, femalePhoto, wikiMedia, gbifData, sounds] = await Promise.all([
        fetchINatPhotos(scientificName),
        fetchINatGenderedPhoto(scientificName, "male"),
        fetchINatGenderedPhoto(scientificName, "female"),
        fetchWikipediaMedia(scientificName),
        fetchGBIFTaxonKey(scientificName),
        fetchXenoCantoSounds(scientificName, xenoCantoApiKey)
    ]);

    return {
        inat_photos: inatData,
        male_image_url: malePhoto,
        female_image_url: femalePhoto,
        sounds: sounds,
        wikipedia_image: wikiMedia.imageUrl,
        gbif_taxon_key: gbifData.taxonKey
    };
}

async function fetchINatPhotos(scientificName: string) {
    try {
        const url = `${INAT_API_URL}/taxa?q=${encodeURIComponent(scientificName)}&per_page=1&only_id=false`;
        console.log(`Fetching iNat photos for: ${scientificName} -> ${url}`);
        const res = await fetch(url);

        if (!res.ok) {
            console.error(`iNat API error: ${res.status} ${res.statusText}`);
            return [];
        }

        const data = await res.json();
        const taxon = data.results?.[0];

        if (!taxon) {
            console.warn(`iNat: No taxon found for ${scientificName}`);
            return [];
        }

        let photos: any[] = [];

        // 1. Get Taxon Photos
        if (taxon.taxon_photos && taxon.taxon_photos.length > 0) {
            photos = taxon.taxon_photos.map((tp: any) => ({
                id: tp.photo.id,
                url: tp.photo.medium_url,
                attribution: tp.photo.attribution,
                license_code: tp.photo.license_code
            }));
        }

        // 2. Add Default Photo if not present
        if (taxon.default_photo) {
            const defaultPhoto = {
                id: taxon.default_photo.id,
                url: taxon.default_photo.medium_url,
                attribution: taxon.default_photo.attribution,
                license_code: taxon.default_photo.license_code
            };
            if (!photos.some(p => p.id === defaultPhoto.id)) {
                photos.unshift(defaultPhoto);
            }
        }

        // 3. Fallback/Supplement with Observation Photos if needed
        if (photos.length < 8) {
            console.log(`iNat: Only found ${photos.length} taxon photos, fetching observations...`);
            const obsPhotos = await fetchObservationPhotos(scientificName, 10); // Fetch a few more to filter
            for (const p of obsPhotos) {
                if (!photos.some((existing) => existing.id === p.id) && photos.length < 8) {
                    photos.push(p);
                }
            }
        }

        console.log(`iNat: Returning ${photos.length} photos for ${scientificName}`);
        return photos;
    } catch (e) {
        console.error("iNaturalist catch error:", e);
        return [];
    }
}

async function fetchObservationPhotos(scientificName: string, count: number) {
    try {
        const url = `${INAT_API_URL}/observations?scientific_name=${encodeURIComponent(scientificName)}&quality_grade=research&photos=true&per_page=${count}&order_by=votes`;
        const res = await fetch(url);
        const data = await res.json();

        const photos: any[] = [];
        if (data.results) {
            for (const obs of data.results) {
                if (obs.photos && obs.photos.length > 0) {
                    // Get the best photo from the observation
                    const p = obs.photos[0];
                    photos.push({
                        id: p.id,
                        url: p.medium_url || p.url, // Fallback to url if medium_url missing
                        attribution: p.attribution,
                        license_code: p.license_code
                    });
                }
            }
        }
        return photos;
    } catch (e) {
        console.error("Error fetching observation photos:", e);
        return [];
    }
}

async function fetchINatGenderedPhoto(scientificName: string, gender: string) {
    try {
        const url = `${INAT_API_URL}/observations?scientific_name=${encodeURIComponent(scientificName)}&term_id=5&term_value_id=${gender === "male" ? 6 : 7}&quality_grade=research&per_page=1&order_by=votes`;
        const res = await fetch(url);
        const data = await res.json();
        return data.results?.[0]?.photos?.[0]?.medium_url || null;
    } catch (e) {
        return null;
    }
}

async function fetchWikipediaMedia(scientificName: string) {
    try {
        const url = `${WIKI_API_URL}?action=query&format=json&prop=pageimages|pageprops&titles=${encodeURIComponent(scientificName)}&generator=search&gsrsearch=${encodeURIComponent(scientificName)}&gsrlimit=1&piprop=original`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.query?.pages) {
            const pageId = Object.keys(data.query.pages)[0];
            const page = data.query.pages[pageId];
            return {
                imageUrl: page.original?.source || null
            };
        }
        return { imageUrl: null };
    } catch (e) {
        return { imageUrl: null };
    }
}

async function fetchGBIFTaxonKey(scientificName: string) {
    try {
        const url = `${GBIF_API_URL}/species/match?name=${encodeURIComponent(scientificName)}`;
        const res = await fetch(url);
        const data = await res.json();
        return { taxonKey: data.usageKey || null };
    } catch (e) {
        return { taxonKey: null };
    }
}

async function fetchXenoCantoSounds(scientificName: string, apiKey: string) {
    try {
        const query = encodeURIComponent(`sp:"${scientificName}" q:A`);
        const url = `${XENO_CANTO_API_URL}?query=${query}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.recordings) return [];

        const fixUrl = (u: string, rec?: any) => {
            if (!u) return "";

            let finalUrl = u.startsWith("//") ? `https:${u}` : u;
            const osciUrl = rec?.osci?.large || rec?.osci?.medium || rec?.osci?.small;

            // If it's a generic xeno-canto.org/ID/download link, 
            // try to construct the direct uploaded path which is more AVPlayer friendly.
            if (finalUrl.includes('xeno-canto.org') && finalUrl.endsWith('/download') && osciUrl) {
                const match = osciUrl.match(/sounds\/uploaded\/([^/]+)\//);
                if (match && match[1]) {
                    const dir = match[1];
                    const idMatch = finalUrl.match(/xeno-canto\.org\/(\d+)\/download/);
                    if (idMatch && idMatch[1]) {
                        const id = idMatch[1];
                        // If we have the exact filename, use it. Otherwise fallback to XC+ID.mp3
                        const fileName = rec?.["file-name"] || `XC${id}.mp3`;
                        return `https://xeno-canto.org/sounds/uploaded/${dir}/${fileName}`;
                    }
                }
            }
            return finalUrl;
        };

        const songs = data.recordings.filter((r: any) => r.type.toLowerCase().includes("song")).slice(0, 2);
        const calls = data.recordings.filter((r: any) => r.type.toLowerCase().includes("call") && !r.type.toLowerCase().includes("song")).slice(0, 2);

        return [...songs, ...calls].map((rec: any) => ({
            id: rec.id,
            url: fixUrl(rec.file, rec),
            waveform: fixUrl(rec.osci?.large || rec.osci?.medium || ""),
            type: rec.type.toLowerCase().includes("song") ? "song" : "call",
            duration: rec.length,
            attribution: rec.rec,
            license: rec.lic
        })).filter(sound => sound.url && !sound.url.includes('/download'));
    } catch (e) {
        return [];
    }
}
