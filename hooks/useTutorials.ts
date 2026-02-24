import { supabase } from '@/lib/supabase';
import { Tutorial } from '@/types/tutorial';
import { useQuery } from '@tanstack/react-query';

export function useTutorials() {
    return useQuery({
        queryKey: ['tutorials'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tutorials')
                .select('*')
                .order('id', { ascending: true });
            if (error) throw error;
            return data as Tutorial[];
        },
    });
}

export function useTutorial(slug: string) {
    return useQuery({
        queryKey: ['tutorial', slug],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tutorials')
                .select('*')
                .eq('slug', slug)
                .single();
            if (error) throw error;
            return data as Tutorial;
        },
        enabled: !!slug,
    });
}
