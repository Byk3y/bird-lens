import { supabase } from './supabase';

export type FeedbackType = 'like' | 'incorrect_id' | 'content_error' | 'suggestion';

export interface FeedbackData {
    user_id?: string | null;
    scientific_name: string;
    feedback_type: FeedbackType;
    section_context?: string | null;
    user_message?: string | null;
    media_url?: string | null;
    app_metadata?: Record<string, any>;
}

/**
 * Submits user feedback to Supabase.
 */
export async function submitFeedback(data: FeedbackData) {
    const { error } = await supabase
        .from('user_feedback')
        .insert([
            {
                user_id: data.user_id,
                scientific_name: data.scientific_name,
                feedback_type: data.feedback_type,
                section_context: data.section_context,
                user_message: data.user_message,
                media_url: data.media_url,
                app_metadata: {
                    platform: 'mobile',
                    ...data.app_metadata
                },
                status: 'new'
            }
        ]);

    if (error) {
        console.error('Error submitting feedback:', error);
        throw error;
    }

    return { success: true };
}
