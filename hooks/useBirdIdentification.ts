import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BirdResult } from '@/types/scanner';
import * as Haptics from 'expo-haptics';
import { fetch } from 'expo/fetch';
import { useState } from 'react';
import { Alert } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

/**
 * Parses a single line of NDJSON into a typed chunk.
 */
function parseNDJSONLine(line: string): { type: string;[key: string]: any } | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    try {
        return JSON.parse(trimmed);
    } catch {
        // Fallback: try to find the JSON object within the line
        try {
            const start = trimmed.indexOf('{');
            const end = trimmed.lastIndexOf('}');
            if (start !== -1 && end > start) {
                return JSON.parse(trimmed.substring(start, end + 1));
            }
        } catch {
            // Still failed
        }
        console.warn('Failed to parse NDJSON line:', trimmed.slice(0, 100));
        return null;
    }
}

/**
 * Maps raw candidate data + media into a BirdResult.
 */
function toBirdResult(bird: any, media?: any): BirdResult {
    return {
        ...bird,
        inat_photos: media?.inat_photos || [],
        male_image_url: media?.male_image_url,
        female_image_url: media?.female_image_url,
        sounds: media?.sounds || [],
        wikipedia_image: media?.wikipedia_image,
        gbif_taxon_key: media?.gbif_taxon_key,
    };
}

export const useBirdIdentification = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [candidates, setCandidates] = useState<BirdResult[]>([]);
    const [enrichedCandidates, setEnrichedCandidates] = useState<BirdResult[]>([]);
    const [result, setResult] = useState<BirdResult | null>(null);
    const [heroImages, setHeroImages] = useState<Record<string, string>>({});
    const { user, isLoading: isAuthLoading } = useAuth();

    const identifyBird = async (imageB64?: string, audioB64?: string) => {
        if (isProcessing) return;

        try {
            setIsProcessing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Wait for auth session if it's still initializing
            if (isAuthLoading || !user) {
                console.log('Waiting for auth session before identification...');
                let attempts = 0;
                while ((isAuthLoading || !user) && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                }

                if (isAuthLoading || !user) {
                    throw new Error('Authentication timed out. Please try again.');
                }
                console.log('Auth session ready after', attempts * 0.5, 's');
            }

            // Get a fresh session to ensure the JWT hasn't expired
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session?.access_token) {
                console.warn('Session retrieval failed:', sessionError);
                throw new Error('No active session. Please try logging in again.');
            }

            // --- STREAMING FETCH ---
            const url = `${SUPABASE_URL}/functions/v1/identify-bird`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
                },
                body: JSON.stringify({ image: imageB64, audio: audioB64 }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Edge Function Error (${response.status}):`, errorText);

                if (response.status === 401 || response.status === 403) {
                    throw new Error('Unauthorized. Your session may have expired. Please restart the app.');
                }

                let errorMessage = `Server error (${response.status})`;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                } catch {
                    // Use the generic error message
                }

                if (response.status === 429) {
                    throw Object.assign(new Error(errorMessage), { status: 429 });
                }
                throw new Error(errorMessage);
            }

            // Read the NDJSON stream line-by-line
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body to read');

            const decoder = new TextDecoder();
            let buffer = '';
            let rawCandidates: any[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep the incomplete line in the buffer

                for (const line of lines) {
                    const chunk = parseNDJSONLine(line);
                    if (!chunk) continue;

                    switch (chunk.type) {
                        case 'progress': {
                            console.log(`[Stream Progress] ${chunk.message}`);
                            break;
                        }

                        case 'candidates': {
                            // First chunk: bird identification data (no media yet)
                            rawCandidates = chunk.data;
                            const initialBirds = rawCandidates.map((bird: any) => toBirdResult(bird));

                            setResult(initialBirds[0] || null);
                            setCandidates(initialBirds);
                            setEnrichedCandidates(initialBirds);

                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            console.log(`Received ${initialBirds.length} candidates`);
                            break;
                        }

                        case 'media': {
                            // Progressive media chunks: update the specific candidate
                            const { index, data: media } = chunk;

                            setEnrichedCandidates(prev => {
                                const next = [...prev];
                                if (next[index]) {
                                    next[index] = toBirdResult(rawCandidates[index], media);
                                }
                                return next;
                            });

                            // Update hero image for this candidate
                            if (media.inat_photos?.length > 0 && rawCandidates[index]) {
                                setHeroImages(prev => ({
                                    ...prev,
                                    [rawCandidates[index].scientific_name]: media.inat_photos[0].url,
                                }));
                            }

                            // Update primary result if this is the first candidate
                            if (index === 0) {
                                setResult(prev => prev ? toBirdResult(rawCandidates[0], media) : null);
                            }

                            console.log(`Received media for candidate ${index}: ${media.inat_photos?.length || 0} photos, ${media.sounds?.length || 0} sounds`);
                            break;
                        }

                        case 'done': {
                            console.log(`Stream complete in ${chunk.duration}ms`);
                            break;
                        }

                        case 'error': {
                            console.error('Stream error from server:', chunk.message);
                            break;
                        }
                    }
                }
            }

            // Process any remaining data in the buffer
            if (buffer.trim()) {
                const chunk = parseNDJSONLine(buffer);
                if (chunk?.type === 'done') {
                    console.log(`Stream complete in ${chunk.duration}ms`);
                }
            }

            return result;
        } catch (error: any) {
            console.warn('Identification attempt status:', error.message || error);

            const status = error.status || error.context?.status || error.statusCode;
            const isQuotaError = status === 429 ||
                error.message?.includes('429') ||
                error.message?.includes('Quota') ||
                error.message?.includes('RESOURCE_EXHAUSTED');

            if (isQuotaError) {
                Alert.alert(
                    'AI is taking a nap 😴',
                    'We\'ve hit the Google Gemini free tier limit. Please wait about 30-60 seconds and try your capture again.',
                    [{ text: 'Got it' }]
                );
            } else {
                Alert.alert(
                    'Identification Failed',
                    error.message || 'An unexpected error occurred. Please try again later.'
                );
            }
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const enrichCandidate = (index: number, data: Partial<BirdResult>) => {
        setEnrichedCandidates(prev => {
            const next = [...prev];
            if (next[index]) {
                next[index] = { ...next[index], ...data };
            }
            return next;
        });
    };

    const updateHeroImage = (scientificName: string, url: string) => {
        setHeroImages(prev => ({ ...prev, [scientificName]: url }));
    };

    const saveSighting = async (bird: BirdResult, capturedImage?: string | null) => {
        if (isSaving) return;

        try {
            setIsSaving(true);
            let imageUrl = null;

            // Upload image if provided
            if (capturedImage) {
                const fileName = `${user?.id}/${Date.now()}.jpg`;

                const { Buffer } = require('buffer');
                const bytes = Buffer.from(capturedImage, 'base64');

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('sightings')
                    .upload(fileName, bytes, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('sightings')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
            }

            // Clean and prepare metadata for storage
            const metadata: Record<string, any> = {
                also_known_as: bird.also_known_as || [],
                taxonomy: bird.taxonomy,
                identification_tips: bird.identification_tips,
                description: bird.description,
                diet: bird.diet,
                diet_tags: bird.diet_tags || [],
                habitat: bird.habitat,
                habitat_tags: bird.habitat_tags || [],
                nesting_info: bird.nesting_info,
                feeder_info: bird.feeder_info,
                behavior: bird.behavior,
                images: bird.images || [],
                inat_photos: bird.inat_photos || [],
                male_image_url: bird.male_image_url,
                female_image_url: bird.female_image_url,
                sounds: bird.sounds || [],
                wikipedia_image: bird.wikipedia_image,
                gbif_taxon_key: bird.gbif_taxon_key
            };

            const { error } = await supabase.from('sightings').insert({
                user_id: user?.id,
                species_name: bird.name,
                scientific_name: bird.scientific_name,
                rarity: bird.rarity,
                fact: bird.fact,
                confidence: bird.confidence,
                image_url: imageUrl,
                metadata: metadata
            });

            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return true;
        } catch (error: any) {
            console.error('Save error:', error);
            Alert.alert('Error', error.message);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const resetResult = () => {
        setResult(null);
        setCandidates([]);
        setEnrichedCandidates([]);
        setHeroImages({});
    };

    return {
        isProcessing,
        isSaving,
        result,
        candidates,
        enrichedCandidates,
        heroImages,
        identifyBird,
        enrichCandidate,
        updateHeroImage,
        saveSighting,
        resetResult,
    };
};
