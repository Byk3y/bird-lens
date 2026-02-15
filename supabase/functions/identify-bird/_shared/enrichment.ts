
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
        const res = await fetch(url);
        const data = await res.json();
        const taxon = data.results?.[0];
        if (!taxon?.taxon_photos) return [];

        return taxon.taxon_photos.slice(0, 5).map((tp: any) => ({
            id: tp.photo.id,
            url: tp.photo.medium_url,
            attribution: tp.photo.attribution,
            license_code: tp.photo.license_code
        }));
    } catch (e) {
        console.error("iNaturalist error:", e);
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
            if (u.startsWith("//")) return `https:${u}`;
            // Simpler fix for now, internal logic can be expanded if needed
            return u;
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
        }));
    } catch (e) {
        return [];
    }
}
