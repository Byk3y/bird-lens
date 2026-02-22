import { useAlert } from '@/components/common/AlertProvider';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { IdentificationService } from '@/services/IdentificationService';
import { BirdResult } from '@/types/scanner';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { fetch } from 'expo/fetch';
import { useState } from 'react';

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
    const [progressMessage, setProgressMessage] = useState<string | null>(null);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const { user, isLoading: isAuthLoading } = useAuth();
    const { showAlert } = useAlert();

    const identifyBird = async (imageB64?: string, audioB64?: string) => {
        if (isProcessing) return;

        try {
            const controller = new AbortController();
            setAbortController(controller);

            setIsProcessing(true);
            setError(null);
            setProgressMessage('Identifying...');
            // Light feedback for identification start
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Get session if it exists, but don't block for ghost users
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || SUPABASE_ANON_KEY;

            console.log('Identification request initiated...');

            // --- STREAMING FETCH ---
            const url = `${SUPABASE_URL}/functions/v1/identify-bird`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_ANON_KEY,
                    'x-client-info': 'supabase-js-expo',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    image: imageB64,
                    audio: audioB64
                }),
            });

            if (!response.ok) {
                const { message, status } = await IdentificationService.parseError(response);
                throw Object.assign(new Error(message), { status });
            }

            // Read the NDJSON stream line-by-line
            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body to read');

            let rawCandidates: any[] = [];
            let finalBirds: BirdResult[] = [];
            let rawAiResponse: string | null = null;

            await IdentificationService.processStream(reader, (chunk) => {
                switch (chunk.type) {
                    case 'progress':
                        console.log(`[Stream Progress] ${chunk.message}`);
                        setProgressMessage(chunk.message);
                        break;

                    case 'candidates': {
                        rawCandidates = chunk.data;
                        rawAiResponse = chunk.raw_content || null;
                        const initialBirds = rawCandidates.map((bird: any) =>
                            IdentificationService.toBirdResult(bird)
                        );
                        finalBirds = initialBirds;
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

                        // Choose the best image for the hero section
                        const heroUrl = media.inat_photos?.[0]?.url ||
                            media.male_image_url ||
                            media.wikipedia_image;

                        if (heroUrl && rawCandidates[index]) {
                            setHeroImages(prev => ({
                                ...prev,
                                [rawCandidates[index].scientific_name]: heroUrl,
                            }));
                        }

                        if (index === 0) {
                            setResult(prev => prev ? IdentificationService.toBirdResult(prev, media) : null);
                        }
                        console.log(`Received media for candidate ${index}: ${media.inat_photos?.length || 0} photos, fallback used: ${!media.inat_photos?.length && !!heroUrl}`);
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
                        setError(chunk.message || 'Identification failed. Please try again.');
                        break;
                }

                // If we have candidates and a raw response, attach it to the first bird
                // This will be used in saveSighting
                if (finalBirds.length > 0 && rawAiResponse) {
                    finalBirds[0].metadata = {
                        ...finalBirds[0].metadata,
                        raw_ai_response: rawAiResponse
                    };
                }
            });


            return finalBirds[0] || null;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Identification request cancelled by user');
                return null;
            }

            console.warn('Identification attempt status:', error.message || error);

            const status = error.status || error.context?.status || error.statusCode;
            const message = error.message;

            const isQuotaError = status === 429 ||
                message.includes('Quota') ||
                message.includes('RESOURCE_EXHAUSTED');

            if (isQuotaError) {
                showAlert({
                    title: 'AI is taking a nap 😴',
                    message: "We've hit the Google Gemini free tier limit. Please wait about 30-60 seconds and try your capture again."
                });
            } else {
                setError(message);
            }
            return null;
        } finally {
            setIsProcessing(false);
            setProgressMessage(null);
            setAbortController(null);
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

    const saveSighting = async (bird: BirdResult, capturedImage?: string | null, recordingUri?: string | null) => {
        if (isSaving) return;

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                setIsSaving(true);
                let imageUrl: string | null = null;
                let audioUrl: string | null = null;

                const { Buffer } = require('buffer');

                // Define upload tasks
                const uploadTasks = [];

                // Task 1: Image Upload
                if (capturedImage) {
                    uploadTasks.push((async () => {
                        const fileName = `images/${user?.id}/${Date.now()}.webp`;
                        const bytes = Buffer.from(capturedImage, 'base64');

                        const { error: uploadError } = await supabase.storage
                            .from('sightings')
                            .upload(fileName, bytes, {
                                contentType: 'image/webp',
                                upsert: true
                            });

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('sightings')
                            .getPublicUrl(fileName);

                        imageUrl = publicUrl;
                    })());
                }

                // Task 2: Audio Upload
                if (recordingUri) {
                    uploadTasks.push((async () => {
                        const fileName = `audio/${user?.id}/${Date.now()}.wav`;

                        // Read file as base64 using legacy file system and direct buffer conversion
                        const base64 = await FileSystem.readAsStringAsync(recordingUri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                        const audioBytes = Buffer.from(base64, 'base64');

                        const { error: audioUploadError } = await supabase.storage
                            .from('sightings')
                            .upload(fileName, audioBytes, {
                                contentType: 'audio/wav',
                                upsert: true
                            });

                        if (audioUploadError) throw audioUploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('sightings')
                            .getPublicUrl(fileName);

                        audioUrl = publicUrl;
                    })());
                }

                // Run uploads in parallel
                if (uploadTasks.length > 0) {
                    await Promise.all(uploadTasks);
                }

                // Map bird result to sighting structure
                const sightingData = IdentificationService.mapBirdToSighting(bird, user?.id || '', audioUrl);

                // Add image_url if uploaded
                if (imageUrl) {
                    sightingData.image_url = imageUrl;
                }

                const { error } = await supabase.from('sightings').insert(sightingData);

                if (error) throw error;

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                return true;
            } catch (error: any) {
                console.error(`Save error (attempt ${attempts}):`, error);

                // Only alert on final attempt or if error is not a network timeout
                const isRetryable = error.message?.includes('timed out') || error.status === 408 || error.name === 'StorageUnknownError';

                if (attempts >= maxAttempts || !isRetryable) {
                    showAlert({
                        title: 'Save Error',
                        message: attempts >= maxAttempts
                            ? 'Saving timed out after multiple attempts. Please check your connection and try again.'
                            : error.message
                    });
                    return false;
                }

                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } finally {
                setIsSaving(false);
            }
        }
    };

    const resetResult = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
        }
        setResult(null);
        setCandidates([]);
        setEnrichedCandidates([]);
        setHeroImages({});
        setProgressMessage(null);
    };

    return {
        isProcessing,
        isSaving,
        result,
        candidates,
        enrichedCandidates,
        heroImages,
        error,
        progressMessage,
        identifyBird,
        enrichCandidate,
        updateHeroImage,
        saveSighting,
        resetResult,
    };
};
