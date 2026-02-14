import { supabase } from '@/lib/supabase';

export interface BirdSound {
    id: string;
    url: string;
    waveform: string;
    location: string;
    country: string;
    type: string;
    quality: string;
    recorder: string;
    license: string;
    duration: string;
}

export const SoundService = {
    fetchSounds: async (scientificName: string): Promise<BirdSound[]> => {
        try {
            const { data, error } = await supabase.functions.invoke('fetch-bird-sounds', {
                body: { scientific_name: scientificName },
            });

            if (error) throw error;
            return data.recordings || [];
        } catch (error) {
            console.error('Error fetching bird sounds:', error);
            return [];
        }
    }
};
