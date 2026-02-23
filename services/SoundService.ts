import { supabase, supabaseAnonKey } from '@/lib/supabase';
import { BirdSound } from '@/types/scanner';

export const SoundService = {
    fetchSounds: async (scientificName: string): Promise<BirdSound[]> => {
        try {
            const { data, error } = await supabase.functions.invoke('fetch-bird-sounds', {
                body: { scientific_name: scientificName },
                headers: {
                    Authorization: `Bearer ${supabaseAnonKey}`
                }
            });

            if (error) throw error;
            return data.recordings || [];
        } catch (error) {
            console.error('Error fetching bird sounds:', error);
            return [];
        }
    }
};
