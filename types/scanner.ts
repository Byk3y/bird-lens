export interface INaturalistPhoto {
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
    duration: string;
    recorder: string;
    country: string;
    location: string;
    date: string;
    sonogram: string;
    oscillogram: string;
    waveform: string;
    license: string;
    type: string;
    lat?: number;
    lon?: number;
}

export interface BirdResult {
    name: string;
    scientific_name: string;
    also_known_as: string[];
    taxonomy: {
        family: string;
        family_scientific: string;
        genus: string;
        genus_description: string;
        order?: string;
        order_description?: string;
    };
    identification_tips: {
        male: string;
        female: string;
        juvenile?: string;
    };
    male_image_url?: string;
    female_image_url?: string;
    juvenile_image_url?: string;
    description: string;
    diet: string;
    diet_tags: string[];
    habitat: string;
    habitat_tags: string[];
    nesting_info: {
        description: string;
        location: string;
        type: string;
    };
    feeder_info: {
        attracted_by: string[];
        feeder_types: string[];
    };
    behavior: string;
    rarity: string;
    distribution_area?: string;
    conservation_status?: string;
    key_facts?: {
        size?: string;
        wingspan?: string;
        wing_shape?: string;
        life_expectancy?: string;
        colors?: string[];
        tail_shape?: string;
        weight?: string;
    };
    confidence: number;
    error?: string;
    images?: string[]; // Array of image URLs for the species
    inat_photos?: INaturalistPhoto[];
    sounds?: BirdSound[];
    wikipedia_image?: string;
    gbif_taxon_key?: string;
    metadata?: Record<string, any>;
    audio_url?: string;
}

export type ScanMode = 'photo' | 'sound';
