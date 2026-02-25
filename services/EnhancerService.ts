import { supabase } from '../lib/supabase';

export class EnhancerService {
    /**
     * Sends an image to the Supabase Edge Function for AI enhancement.
     * @param base64Image The image data in base64 format (with or without data: prefix).
     * @param prompt Optional custom prompt for the enhancement.
     * @returns The enhanced image data (either a base64 string or a URL).
     */
    static async enhanceImage(base64Image: string, prompt?: string): Promise<string> {
        try {
            console.log('[EnhancerService] Invoking enhance-image edge function...');

            const { data, error } = await supabase.functions.invoke('enhance-image', {
                body: {
                    image: base64Image,
                    prompt
                },
            });

            if (error) {
                console.error('[EnhancerService] Edge Function error:', error);
                throw new Error(error.message || 'Failed to connect to enhancement service');
            }

            if (data?.error) {
                console.error('[EnhancerService] Service error:', data.error);
                throw new Error(data.error);
            }

            if (!data?.enhancedImage) {
                console.error('[EnhancerService] No image returned in response:', data);
                throw new Error('No enhanced image was returned from the service.');
            }

            console.log('[EnhancerService] Successfully received enhanced image');
            return data.enhancedImage;
        } catch (err: any) {
            console.error('[EnhancerService] Enhancement failed:', err);
            throw err;
        }
    }
}
