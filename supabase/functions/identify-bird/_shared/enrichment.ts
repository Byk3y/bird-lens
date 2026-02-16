
const INAT_API_URL = "https://api.inaturalist.org/v1";
const XENO_CANTO_API_URL = "https://xeno-canto.org/api/3/recordings";

export interface EnrichedMedia {
    inat_photos: any[];
    male_image_url: string | null;
    female_image_url: string | null;
    sounds: any[];
}

export async function enrichSpecies(scientificName: string, xenoCantoApiKey: string): Promise<EnrichedMedia> {
    console.log(`Enriching data for: ${scientificName}`);

    // Execute sequentially to minimize memory footprint
    // 1. iNaturalist Photos (potentially heaviest payload)
    const inatData = await fetchINatPhotos(scientificName);

    // 2. Gendered Photos (lightweight)
    const malePhoto = await fetchINatGenderedPhoto(scientificName, "male");
    const femalePhoto = await fetchINatGenderedPhoto(scientificName, "female");

    // 3. Xeno-Canto (medium - large JSON list)
    const sounds = await fetchXenoCantoSounds(scientificName, xenoCantoApiKey);

    return {
        inat_photos: inatData,
        male_image_url: malePhoto,
        female_image_url: femalePhoto,
        sounds: sounds
    };
}

async function fetchINatPhotos(scientificName: string) {
    try {
        // Use scientific_name search and filter by Aves (taxon_id 3 is Birds in iNat)
        const fields = "(id:!t,name:!t,taxon_photos:(photo:(id:!t,medium_url:!t,attribution:!t,license_code:!t)),default_photo:(id:!t,medium_url:!t,attribution:!t,license_code:!t))";
        const url = `${INAT_API_URL}/taxa?scientific_name=${encodeURIComponent(scientificName)}&iconic_taxa=Aves&per_page=1&fields=${fields}`;

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
            const obsPhotos = await fetchObservationPhotos(scientificName, 5); // Fetch fewer to save memory
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
        // Use field selection to strictly limit data returned to ONLY what we need
        const fields = "(id:!t,photos:(id:!t,medium_url:!t,attribution:!t,license_code:!t))";
        const url = `${INAT_API_URL}/observations?scientific_name=${encodeURIComponent(scientificName)}&quality_grade=research&photos=true&per_page=${count}&order_by=votes&fields=${fields}`;

        console.log(`iNat: Fetching observation photos (minimized)...`);
        const res = await fetch(url);
        const data = await res.json();

        const photos: any[] = [];
        if (data.results) {
            for (const obs of data.results) {
                if (obs.photos && obs.photos.length > 0) {
                    const p = obs.photos[0];
                    photos.push({
                        id: p.id,
                        url: p.medium_url || p.url,
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
        const fields = "(photos:(medium_url:!t))";
        const url = `${INAT_API_URL}/observations?scientific_name=${encodeURIComponent(scientificName)}&term_id=5&term_value_id=${gender === "male" ? 6 : 7}&quality_grade=research&per_page=1&order_by=votes&fields=${fields}`;
        const res = await fetch(url);
        const data = await res.json();
        return data.results?.[0]?.photos?.[0]?.medium_url || null;
    } catch (e) {
        return null;
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

        const songs = data.recordings.filter((r: any) => r.type.toLowerCase().includes("song")).slice(0, 1);
        const calls = data.recordings.filter((r: any) => r.type.toLowerCase().includes("call") && !r.type.toLowerCase().includes("song")).slice(0, 1);

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
