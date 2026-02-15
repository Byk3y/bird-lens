export interface INaturalistPhoto {
    url: string;
    attribution: string;
    license: string;
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
    };
    identification_tips: {
        male: string;
        female: string;
        juvenile?: string;
    };
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
    fact: string;
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
}

export type ScanMode = 'photo' | 'sound';
