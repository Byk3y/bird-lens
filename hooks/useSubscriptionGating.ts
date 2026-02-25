import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

const FREE_IDENTIFICATION_LIMIT = 7;

interface SubscriptionGating {
    /** True if the user cannot use premium features (not Pro AND out of credits) */
    isGated: boolean;
    /** Number of free identifications remaining (0 if Pro) */
    remainingCredits: number;
    /** Total identifications used */
    identificationsUsed: number;
    /** Whether the gating data is still loading */
    isLoading: boolean;
    /** Increment the identification count after a successful scan */
    incrementCount: () => Promise<number>;
    /** Re-fetch the current count from the database */
    refetch: () => Promise<void>;
}

export function useSubscriptionGating(): SubscriptionGating {
    const { user, isPro } = useAuth();
    const [identificationsUsed, setIdentificationsUsed] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCount = useCallback(async () => {
        if (!user?.id) {
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('identifications_count')
                .eq('id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // No profile row yet (new anonymous user) — count is 0
                setIdentificationsUsed(0);
            } else if (data) {
                setIdentificationsUsed(data.identifications_count ?? 0);
            }
        } catch (err) {
            console.error('[useSubscriptionGating] Failed to fetch count:', err);
            // Graceful degradation: assume 0 so user isn't blocked
            setIdentificationsUsed(0);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchCount();
    }, [fetchCount]);

    const incrementCount = useCallback(async (): Promise<number> => {
        if (!user?.id) return identificationsUsed;

        try {
            const { data, error } = await supabase.rpc('increment_identification_count', {
                p_user_id: user.id,
            });

            if (error) {
                console.error('[useSubscriptionGating] Failed to increment:', error);
                return identificationsUsed;
            }

            const newCount = data as number;
            setIdentificationsUsed(newCount);
            return newCount;
        } catch (err) {
            console.error('[useSubscriptionGating] Increment error:', err);
            return identificationsUsed;
        }
    }, [user?.id, identificationsUsed]);

    const remainingCredits = Math.max(0, FREE_IDENTIFICATION_LIMIT - identificationsUsed);
    const isGated = !isPro && identificationsUsed >= FREE_IDENTIFICATION_LIMIT;

    return {
        isGated,
        remainingCredits,
        identificationsUsed,
        isLoading,
        incrementCount,
        refetch: fetchCount,
    };
}
