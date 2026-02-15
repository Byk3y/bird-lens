import { supabase } from '@/lib/supabase';

import { BirdSound, INaturalistPhoto } from '@/types/scanner';

export interface BirdMedia {
    image: {
        url: string | null;
        attribution: {
            artist: string;
            license: string;
            license_url: string;
        } | null;
    };
    map: {
        taxonKey: number | null;
        tileUrl: string | null;
    };
    inat_photos?: INaturalistPhoto[];
    sounds?: BirdSound[];
}

export class MediaService {
    static async fetchBirdMedia(scientificName: string): Promise<BirdMedia> {
        const { data, error } = await supabase.functions.invoke('fetch-bird-media', {
            body: { scientific_name: scientificName },
        });

        if (error) {
            console.error('Error fetching bird media:', error);
            throw error;
        }

        return data;
    }
}
