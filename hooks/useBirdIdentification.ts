import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { IdentificationService } from '@/services/IdentificationService';
import { BirdResult } from '@/types/scanner';
import * as Haptics from 'expo-haptics';
import { fetch } from 'expo/fetch';
import { useState } from 'react';
import { Alert } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';


export const useBirdIdentification = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [candidates, setCandidates] = useState<BirdResult[]>([]);
    const [enrichedCandidates, setEnrichedCandidates] = useState<BirdResult[]>([]);
    const [result, setResult] = useState<BirdResult | null>(null);
    const [heroImages, setHeroImages] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const { user, isLoading: isAuthLoading } = useAuth();

    const identifyBird = async (imageB64?: string, audioB64?: string) => {
        if (isProcessing) return;

        try {
            setIsProcessing(true);
            setError(null);
            // Light feedback for identification start (shutter already handled in UI)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
                const msg = 'No active session. Please try logging in again.';
                setError(msg);
                throw new Error(msg);
            }

            console.log('Identification request with token:', session.access_token.substring(0, 10) + '...');

            // --- STREAMING FETCH ---
            const url = `${SUPABASE_URL}/functions/v1/identify-bird`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': SUPABASE_ANON_KEY,
                    'x-client-info': 'supabase-js-expo',
                },
                body: JSON.stringify({ image: imageB64, audio: audioB64 }),
            });

            if (!response.ok) {
                const { message, status } = await IdentificationService.parseError(response);
                throw Object.assign(new Error(message), { status });
            }

            // Read the NDJSON stream line-by-line
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body to read');

            let rawCandidates: any[] = [];

            await IdentificationService.processStream(reader, (chunk) => {
                switch (chunk.type) {
                    case 'progress':
                        console.log(`[Stream Progress] ${chunk.message}`);
                        break;

                    case 'candidates': {
                        rawCandidates = chunk.data;
                        const initialBirds = rawCandidates.map((bird: any) =>
                            IdentificationService.toBirdResult(bird)
                        );
                        setResult(initialBirds[0] || null);
                        setCandidates(initialBirds);
                        setEnrichedCandidates(initialBirds);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        console.log(`Received ${initialBirds.length} candidates`);
                        break;
                    }

                    case 'media': {
                        const { index, data: media } = chunk;
                        setEnrichedCandidates(prev => {
                            const next = [...prev];
                            if (next[index]) {
                                next[index] = IdentificationService.toBirdResult(next[index], media);
                            }
                            return next;
                        });

                        if (media.inat_photos?.length > 0 && rawCandidates[index]) {
                            setHeroImages(prev => ({
                                ...prev,
                                [rawCandidates[index].scientific_name]: media.inat_photos[0].url,
                            }));
                        }

                        if (index === 0) {
                            setResult(prev => prev ? IdentificationService.toBirdResult(prev, media) : null);
                        }
                        console.log(`Received media for candidate ${index}: ${media.inat_photos?.length || 0} photos`);
                        break;
                    }

                    case 'metadata': {
                        const { index, data: metadata } = chunk;
                        setEnrichedCandidates(prev => {
                            const next = [...prev];
                            if (next[index]) {
                                next[index] = { ...next[index], ...metadata };
                            }
                            return next;
                        });

                        if (index === 0) {
                            setResult(prev => prev ? { ...prev, ...metadata } : null);
                        }
                        console.log(`Received metadata enrichment for candidate ${index}`);
                        break;
                    }

                    case 'done':
                        console.log(`Stream complete in ${chunk.duration}ms`);
                        break;

                    case 'error':
                        console.error('Stream error from server:', chunk.message);
                        break;
                }
            });


            return result;
        } catch (error: any) {
            console.warn('Identification attempt status:', error.message || error);

            const status = error.status || error.context?.status || error.statusCode;
            const message = error.message;

            const isQuotaError = status === 429 ||
                message.includes('Quota') ||
                message.includes('RESOURCE_EXHAUSTED');

            if (isQuotaError) {
                Alert.alert(
                    'AI is taking a nap 😴',
                    'We\'ve hit the Google Gemini free tier limit. Please wait about 30-60 seconds and try your capture again.',
                    [{ text: 'Got it' }]
                );
            } else {
                setError(message);
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

            // Map bird result to sighting structure
            const sightingData = IdentificationService.mapBirdToSighting(bird, user?.id || '');

            // Add image_url if uploaded
            if (imageUrl) {
                sightingData.image_url = imageUrl;
            }

            const { error } = await supabase.from('sightings').insert(sightingData);

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
        error,
        identifyBird,
        enrichCandidate,
        updateHeroImage,
        saveSighting,
        resetResult,
    };
};
