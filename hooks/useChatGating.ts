import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

const FREE_CHAT_LIMIT = 10;

interface ChatGating {
    /** True if the user cannot send more chat messages (not Pro AND out of credits) */
    isGated: boolean;
    /** Number of free chat messages remaining (0 if Pro) */
    remainingCredits: number;
    /** Total chat messages used */
    messagesUsed: number;
    /** Whether the gating data is still loading */
    isLoading: boolean;
    /** Increment the chat message count after a successful message */
    incrementCount: () => Promise<number>;
    /** Re-fetch the current count from the database */
    refetch: () => Promise<void>;
}

export function useChatGating(): ChatGating {
    const { user, isPro } = useAuth();
    const [messagesUsed, setMessagesUsed] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCount = useCallback(async () => {
        if (!user?.id) {
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('chat_messages_count')
                .eq('id', user.id)
                .single();

            if (error && error.code === 'PGRST116') {
                // No profile row yet (new anonymous user) — count is 0
                setMessagesUsed(0);
            } else if (data) {
                setMessagesUsed(data.chat_messages_count ?? 0);
            }
        } catch (err) {
            console.error('[useChatGating] Failed to fetch count:', err);
            setMessagesUsed(0);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchCount();
    }, [fetchCount]);

    const incrementCount = useCallback(async (): Promise<number> => {
        if (!user?.id) return messagesUsed;

        try {
            const { data, error } = await supabase.rpc('increment_chat_message_count', {
                p_user_id: user.id,
            });

            if (error) {
                console.error('[useChatGating] Failed to increment:', error);
                return messagesUsed;
            }

            const newCount = data as number;
            setMessagesUsed(newCount);
            return newCount;
        } catch (err) {
            console.error('[useChatGating] Increment error:', err);
            return messagesUsed;
        }
    }, [user?.id, messagesUsed]);

    const remainingCredits = Math.max(0, FREE_CHAT_LIMIT - messagesUsed);
    const isGated = !isPro && messagesUsed >= FREE_CHAT_LIMIT;

    return {
        isGated,
        remainingCredits,
        messagesUsed,
        isLoading,
        incrementCount,
        refetch: fetchCount,
    };
}
