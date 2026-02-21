// enrichment.ts — Media enrichment for bird identification
// Fetches photos from iNaturalist, gendered photos, Wikimedia Commons fallback, and sounds from Xeno-Canto
import { fixXenoCantoUrl } from "./utils.ts";

const INAT_API_URL = "https://api.inaturalist.org/v1";
const WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php";

/**
 * Helper to perform a fetch with a timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// ---------- Types ----------

export interface INatPhoto {
    url: string;
    attribution: string;
    license: string;
    id?: string | number;
    provider?: 'inaturalist' | 'wikimedia';
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
    juvenile_image_url: string | null;
    sounds: BirdSound[];
    wikipedia_image: string | null;
}

// ---------- iNaturalist Filtering ----------

/**
 * Helper to determine if an observation is appropriate for display.
 * Excludes dead animals, museum specimens, and research samples.
 */
function isAppropriateObservation(obs: any): boolean {
    if (!obs) return false;

    // 1. Check annotations for Life Stage = Dead
    // term_id 17 is "Alive or Dead", term_value_id 19 is "Dead"
    const deadAnnotation = obs.annotations?.find((a: any) => a.term_id === 17 && a.controlled_value_id === 19);
    if (deadAnnotation) return false;

    // 2. Check tags for problematic keywords
    const badTags = ['dead', 'specimen', 'museum', 'plucked', 'carcass', 'roadkill', 'skull', 'bones', 'research'];
    const tags = (obs.tags || []).map((t: string) => t.toLowerCase());
    if (tags.some((t: string) => badTags.includes(t))) return false;

    // 3. Scan description for problematic keywords
    const description = (obs.description || '').toLowerCase();
    if (badTags.some(word => description.includes(word))) return false;

    return true;
}

// ---------- iNaturalist Photos ----------

/**
 * Helper to fetch basic taxon information (ID and Rank)
 */
async function fetchTaxonInfo(scientificName: string): Promise<{ id: number; rank: string; name: string } | null> {
    try {
        const query = scientificName.trim();
        // 1. Try exact scientific name match first with rank filter
        const searchUrl = INAT_API_URL + '/taxa?q=' + encodeURIComponent(scientificName) + '&rank=species,subspecies&per_page=10';
        const response = await fetchWithTimeout(searchUrl);
        if (!response.ok) return null;

        const data = await response.json();

        // Find best match: exact scientific name, or contains it
        const matches = data.results || [];
        const exactMatch = matches.find((t: any) => t.name.toLowerCase() === scientificName.toLowerCase());

        if (exactMatch) return exactMatch;

        // Fallback to first result if it seems related
        const first = matches[0];
        if (first && (first.name.toLowerCase().includes(scientificName.toLowerCase()) ||
            scientificName.toLowerCase().includes(first.name.toLowerCase()))) {
            return first;
        }

        return null;
    } catch (error) {
        console.error('Error fetching taxon info for ' + scientificName + ':', error);
        return null;
    }
}

/**
 * Fetches high-quality taxon photos from iNaturalist.
 */
async function fetchINatPhotos(taxonId: number): Promise<INatPhoto[]> {
    try {
        // Fetch full taxon details to get all taxon_photos
        const detailUrl = INAT_API_URL + '/taxa/' + taxonId;
        const detailResponse = await fetchWithTimeout(detailUrl);
        if (!detailResponse.ok) return [];

        const detailData = await detailResponse.json();
        const fullTaxon = detailData.results?.[0];

        if (!fullTaxon) return [];

        // Collect all possible photos (taxon_photos or default_photo)
        let photos = fullTaxon.taxon_photos || [];
        if (photos.length === 0 && fullTaxon.default_photo) {
            photos = [{ photo: fullTaxon.default_photo }];
        }

        if (photos.length === 0) return [];

        // Limit to 6 images as requested (1 main + 5 gallery)
        return photos.slice(0, 6).map((tp: any) => {
            const photo = tp.photo;
            const originalUrl = photo.url || photo.medium_url || photo.small_url || '';
            if (!originalUrl) return null;

            // Upgrade to large URLs for high quality
            const largeUrl = originalUrl.replace('/square.', '/large.').replace('/medium.', '/large.').replace('/small.', '/large.');

            return {
                url: largeUrl || originalUrl,
                attribution: photo.attribution || 'Unknown',
                license: photo.license_code || 'CC-BY-NC',
                id: photo.id,
                provider: 'inaturalist'
            };
        }).filter(Boolean);
    } catch (error) {
        console.error('Error fetching iNat photos for taxon ' + taxonId + ':', error);
        return [];
    }
}

/**
 * Fetches gendered photos from iNaturalist observations.
 * Uses Annotation system: term_id=9 (Sex), term_value_id=11 (Male) / 10 (Female)
 */
async function fetchINatGenderedPhoto(taxonId: number, gender: "male" | "female"): Promise<string | null> {
    try {
        const termValueId = gender === "male" ? 11 : 10;
        const fields = "photos.url,photos.license_code,photos.attribution,annotations,tags,description";
        // Filter out bad tags directly in API
        const notTags = "dead,specimen,museum,plucked,research,roadkill,carcass";
        const url = INAT_API_URL + '/observations?taxon_id=' + taxonId + '&term_id=9&term_value_id=' + termValueId + '&quality_grade=research&per_page=5&order_by=votes&not_tag=' + notTags + '&fields=' + fields;

        const response = await fetchWithTimeout(url);
        if (!response.ok) return null;

        const data = await response.json();
        if (!data.results?.length) return null;

        // Find the first appropriate candidate
        const candidate = data.results.find(isAppropriateObservation);
        const photo = candidate?.photos?.[0];
        if (!photo?.url) return null;

        // Upgrade to large URL
        return photo.url.replace('/square.', '/large.').replace('/medium.', '/large.').replace('/small.', '/large.');
    } catch (error) {
        console.error('Error fetching ' + gender + ' photo for taxon ' + taxonId + ':', error);
        return null;
    }
}

/**
 * Fetches juvenile photos from iNaturalist observations.
 * Uses Annotation system: term_id=1 (Life Stage), term_value_id=8 (Juvenile)
 */
async function fetchINatJuvenilePhoto(taxonId: number): Promise<string | null> {
    try {
        const fields = "photos.url,photos.license_code,photos.attribution,annotations,tags,description";
        // Filter out bad tags directly in API
        const notTags = "dead,specimen,museum,plucked,research,roadkill,carcass";
        const url = INAT_API_URL + '/observations?taxon_id=' + taxonId + '&term_id=1&term_value_id=8&quality_grade=research&per_page=5&order_by=votes&not_tag=' + notTags + '&fields=' + fields;

        const response = await fetchWithTimeout(url);
        if (!response.ok) return null;

        const data = await response.json();
        if (!data.results?.length) return null;

        // Find the first appropriate candidate
        const candidate = data.results.find(isAppropriateObservation);
        const photo = candidate?.photos?.[0];
        if (!photo?.url) return null;

        // Upgrade to large URL
        return photo.url.replace('/square.', '/large.').replace('/medium.', '/large.').replace('/small.', '/large.');
    } catch (error) {
        console.error('Error fetching juvenile photo for taxon ' + taxonId + ':', error);
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
            gsrsearch: scientificName + ' bird',
            gsrnamespace: '6', // File namespace
            gsrlimit: '3',
            prop: 'imageinfo',
            iiprop: 'url|mime',
            iiurlwidth: '1024',
        });

        const response = await fetchWithTimeout(WIKIMEDIA_API_URL + '?' + params);
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
        console.error('Error fetching Wikimedia image for ' + scientificName + ':', error);
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

// (Moved to utils.ts)

async function fetchXenoCantoSounds(scientificName: string, apiKey: string): Promise<BirdSound[]> {
    try {
        if (!apiKey) {
            console.warn('XENO_CANTO_API_KEY not set, skipping sounds');
            return [];
        }

        const query = encodeURIComponent('sp:"' + scientificName + '" q:A');
        const url = 'https://xeno-canto.org/api/3/recordings?query=' + query + '&key=' + apiKey;

        const response = await fetchWithTimeout(url);
        if (!response.ok) return [];

        const data = await response.json();
        if (!data.recordings?.length) return [];

        const isSong = (r: XenoCantoRecording) => r.type.toLowerCase().includes('song');
        const isCall = (r: XenoCantoRecording) => r.type.toLowerCase().includes('call') && !isSong(r);

        const mapRecording = (rec: XenoCantoRecording, type: string): BirdSound => {
            const osci = rec.osci?.large || rec.osci?.medium || rec.osci?.small || '';
            return {
                id: rec.id,
                scientific_name: rec.gen + ' ' + rec.sp,
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
        console.error('Error fetching sounds for ' + scientificName + ':', error);
        return [];
    }
}

// ---------- Main Enrichment Function ----------

/**
 * Enriches a species with media data.
 * Fetches sequentially to minimize memory footprint within edge function limits.
 */
export async function enrichSpecies(scientificName: string, xenoCantoApiKey: string): Promise<EnrichedMedia> {
    console.log('Enriching data for: ' + scientificName);

    // 1. Get Taxon ID and Rank first to see if it's a species
    const taxonInfo = await fetchTaxonInfo(scientificName);
    const isSpecies = taxonInfo && (taxonInfo.rank === "species" || taxonInfo.rank === "subspecies");

    if (!taxonInfo) {
        return { inat_photos: [], male_image_url: null, female_image_url: null, juvenile_image_url: null, sounds: [], wikipedia_image: null };
    }

    // 2. Fetch basic photos and sounds in parallel
    // We only fetch sex/age specific photos if it's a species-level taxon
    const [inatPhotos, malePhoto, femalePhoto, juvenilePhoto, sounds] = await Promise.all([
        fetchINatPhotos(taxonInfo.id),
        isSpecies ? fetchINatGenderedPhoto(taxonInfo.id, "male") : Promise.resolve(null),
        isSpecies ? fetchINatGenderedPhoto(taxonInfo.id, "female") : Promise.resolve(null),
        isSpecies ? fetchINatJuvenilePhoto(taxonInfo.id) : Promise.resolve(null),
        fetchXenoCantoSounds(scientificName, xenoCantoApiKey)
    ]);

    // Wikimedia fallback if needed
    let wikipediaImage: string | null = null;
    if (inatPhotos.length < 3) {
        wikipediaImage = await fetchWikimediaImage(scientificName);
    }

    return {
        inat_photos: inatPhotos,
        male_image_url: malePhoto,
        female_image_url: femalePhoto,
        juvenile_image_url: juvenilePhoto,
        sounds,
        wikipedia_image: wikipediaImage,
    };
}
