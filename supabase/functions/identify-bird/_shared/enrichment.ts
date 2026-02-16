// enrichment.ts — Media enrichment for bird identification
// Fetches photos from iNaturalist, gendered photos, Wikimedia Commons fallback, and sounds from Xeno-Canto

const INAT_API_URL = "https://api.inaturalist.org/v1";
const WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php";

// ---------- Types ----------

export interface INatPhoto {
    url: string;
    attribution: string;
    license: string;
}

export interface BirdSound {
    id: string;
    scientific_name: string;
    common_name: string;
    url: string;
    waveform: string;
    type: string;
    quality: string;
    recorder: string;
    license: string;
    duration: string;
    location: string;
    country: string;
}

export interface EnrichedMedia {
    inat_photos: INatPhoto[];
    male_image_url: string | null;
    female_image_url: string | null;
    sounds: BirdSound[];
    wikipedia_image: string | null;
}

// ---------- iNaturalist Photos ----------

/**
 * Fetches high-quality taxon photos from iNaturalist.
 * Uses taxa endpoint for species-level photos (more reliable than observations).
 */
async function fetchINatPhotos(scientificName: string): Promise<INatPhoto[]> {
    try {
        const query = scientificName.trim();
        const url = `${INAT_API_URL}/taxa?q=${encodeURIComponent(query)}&per_page=5`;
        const response = await fetch(url);
        if (!response.ok) return [];

        const data = await response.json();
        // Try to find an exact match first, otherwise take the first result
        const taxon = data.results?.find((t: any) => t.name.toLowerCase() === query.toLowerCase()) || data.results?.[0];

        if (!taxon) return [];

        // Collect all possible photos (taxon_photos or default_photo)
        let photos = taxon.taxon_photos || [];
        if (photos.length === 0 && taxon.default_photo) {
            photos = [{ photo: taxon.default_photo }];
        }

        if (photos.length === 0) return [];

        return photos.slice(0, 8).map((tp: any) => {
            const photo = tp.photo;
            const originalUrl = photo.url || photo.medium_url || photo.small_url || '';
            if (!originalUrl) return null;

            // Upgrade to large URLs for high quality
            const largeUrl = originalUrl.replace('/square.', '/large.').replace('/medium.', '/large.').replace('/small.', '/large.');

            return {
                url: largeUrl || originalUrl,
                attribution: photo.attribution || 'Unknown',
                license: photo.license_code || 'CC-BY-NC',
            };
        }).filter(Boolean);
    } catch (error) {
        console.error(`Error fetching iNat photos for ${scientificName}:`, error);
        return [];
    }
}

/**
 * Fetches gendered photos from iNaturalist observations.
 * Uses Annotation system: term_id=1 (Sex), term_value_id=2 (Male) / 3 (Female)
 */
async function fetchINatGenderedPhoto(scientificName: string, gender: "male" | "female"): Promise<string | null> {
    try {
        const termValueId = gender === "male" ? 2 : 3;
        const fields = "photos.url,photos.license_code,photos.attribution";
        const url = `${INAT_API_URL}/observations?taxon_name=${encodeURIComponent(scientificName)}&term_id=1&term_value_id=${termValueId}&quality_grade=research&per_page=1&order_by=votes&fields=${fields}`;

        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        const photo = data.results?.[0]?.photos?.[0];
        if (!photo?.url) return null;

        // Upgrade to large URL
        return photo.url.replace('/square.', '/large.').replace('/medium.', '/large.');
    } catch (error) {
        console.error(`Error fetching ${gender} photo for ${scientificName}:`, error);
        return null;
    }
}

// ---------- Wikimedia Commons Fallback ----------

/**
 * Fetches a high-quality image from Wikimedia Commons as a fallback.
 * Uses the search API to find images by scientific name.
 */
async function fetchWikimediaImage(scientificName: string): Promise<string | null> {
    try {
        const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            generator: 'search',
            gsrsearch: `${scientificName} bird`,
            gsrnamespace: '6', // File namespace
            gsrlimit: '3',
            prop: 'imageinfo',
            iiprop: 'url|mime',
            iiurlwidth: '1024',
        });

        const response = await fetch(`${WIKIMEDIA_API_URL}?${params}`);
        if (!response.ok) return null;

        const data = await response.json();
        if (!data.query?.pages) return null;

        // Find the first image result (not SVG/PDF)
        const pages = Object.values(data.query.pages) as any[];
        for (const page of pages) {
            const info = page.imageinfo?.[0];
            if (info && info.mime?.startsWith('image/') && !info.mime.includes('svg')) {
                return info.thumburl || info.url;
            }
        }
        return null;
    } catch (error) {
        console.error(`Error fetching Wikimedia image for ${scientificName}:`, error);
        return null;
    }
}

// ---------- Xeno-Canto Sounds ----------

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
    osci: { small: string; medium: string; large: string };
    'file-name': string;
}

function fixXenoCantoUrl(url: string, rec?: XenoCantoRecording): string {
    if (!url) return '';
    let finalUrl = url.startsWith('//') ? `https:${url}` : url;

    const osciUrl = rec?.osci?.large || rec?.osci?.medium || rec?.osci?.small;
    if (finalUrl.includes('xeno-canto.org') && finalUrl.endsWith('/download') && osciUrl) {
        const match = osciUrl.match(/sounds\/uploaded\/([^/]+)\//);
        if (match?.[1]) {
            const dir = match[1];
            const idMatch = finalUrl.match(/xeno-canto\.org\/(\d+)\/download/);
            if (idMatch?.[1]) {
                const fileName = rec?.['file-name'] || `XC${idMatch[1]}.mp3`;
                return `https://xeno-canto.org/sounds/uploaded/${dir}/${fileName}`;
            }
        }
    }
    return finalUrl;
}

async function fetchXenoCantoSounds(scientificName: string, apiKey: string): Promise<BirdSound[]> {
    try {
        if (!apiKey) {
            console.warn('XENO_CANTO_API_KEY not set, skipping sounds');
            return [];
        }

        const query = encodeURIComponent(`sp:"${scientificName}" q:A`);
        const url = `https://xeno-canto.org/api/3/recordings?query=${query}&key=${apiKey}`;

        const response = await fetch(url);
        if (!response.ok) return [];

        const data = await response.json();
        if (!data.recordings?.length) return [];

        const isSong = (r: XenoCantoRecording) => r.type.toLowerCase().includes('song');
        const isCall = (r: XenoCantoRecording) => r.type.toLowerCase().includes('call') && !isSong(r);

        const mapRecording = (rec: XenoCantoRecording, type: string): BirdSound => {
            const osci = rec.osci?.large || rec.osci?.medium || rec.osci?.small || '';
            return {
                id: rec.id,
                scientific_name: `${rec.gen} ${rec.sp}`,
                common_name: rec.en,
                url: fixXenoCantoUrl(rec.file, rec),
                waveform: fixXenoCantoUrl(osci),
                type,
                quality: rec.q,
                recorder: rec.rec,
                license: rec.lic,
                duration: rec.length,
                location: rec.loc,
                country: rec.cnt,
            };
        };

        const songs = data.recordings.filter(isSong).slice(0, 2).map((r: XenoCantoRecording) => mapRecording(r, 'song'));
        const calls = data.recordings.filter(isCall).slice(0, 2).map((r: XenoCantoRecording) => mapRecording(r, 'call'));

        return [...songs, ...calls];
    } catch (error) {
        console.error(`Error fetching sounds for ${scientificName}:`, error);
        return [];
    }
}

// ---------- Main Enrichment Function ----------

/**
 * Enriches a species with media data.
 * Fetches sequentially to minimize memory footprint within edge function limits.
 */
export async function enrichSpecies(scientificName: string, xenoCantoApiKey: string): Promise<EnrichedMedia> {
    console.log(`Enriching data for: ${scientificName}`);

    // 1. iNaturalist Taxon Photos
    const inatPhotos = await fetchINatPhotos(scientificName);

    // 2. Wikimedia Commons fallback if iNat photos are sparse
    let wikipediaImage: string | null = null;
    if (inatPhotos.length < 3) {
        wikipediaImage = await fetchWikimediaImage(scientificName);
    }

    // 3. Gendered Photos (lightweight)
    const malePhoto = await fetchINatGenderedPhoto(scientificName, "male");
    const femalePhoto = await fetchINatGenderedPhoto(scientificName, "female");

    // 4. Xeno-Canto Sounds
    const sounds = await fetchXenoCantoSounds(scientificName, xenoCantoApiKey);

    return {
        inat_photos: inatPhotos,
        male_image_url: malePhoto,
        female_image_url: femalePhoto,
        sounds,
        wikipedia_image: wikipediaImage,
    };
}
