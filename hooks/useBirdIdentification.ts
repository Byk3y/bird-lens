import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BirdResult } from '@/types/scanner';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert } from 'react-native';

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
            // This prevents the 401 Unauthorized race condition on cold starts
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

            // Real API Call
            const { data, error } = await supabase.functions.invoke('identify-bird', {
                body: { image: imageB64, audio: audioB64 },
            });

            if (error) throw error;

            // Map the enriched media data from the server response
            const birdCandidates = (data as any[]).map(bird => ({
                ...bird,
                inat_photos: bird.media?.inat_photos || [],
                male_image_url: bird.media?.male_image_url,
                female_image_url: bird.media?.female_image_url,
                sounds: bird.media?.sounds || [],
                wikipedia_image: bird.media?.wikipedia_image,
                gbif_taxon_key: bird.media?.gbif_taxon_key
            })) as BirdResult[];

            const primaryResult = birdCandidates[0];

            // Pre-populate hero images for all candidates
            const initialHeroImages: Record<string, string> = {};
            birdCandidates.forEach(bird => {
                if (bird.inat_photos && bird.inat_photos.length > 0) {
                    initialHeroImages[bird.scientific_name] = bird.inat_photos[0].url;
                }
            });

            setResult(primaryResult);
            setCandidates(birdCandidates);
            setEnrichedCandidates(birdCandidates); // Already enriched by server
            setHeroImages(initialHeroImages);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return primaryResult;
        } catch (error: any) {
            // Use warn instead of error to avoid intrusive Expo dev-mode overlays
            console.warn('Identification attempt status:', error.message || error);

            // Extract status code - Supabase FunctionsHttpError usually has .status
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

                // Convert base64 to binary using Buffer (more reliable for images)
                const { Buffer } = require('buffer');
                const bytes = Buffer.from(capturedImage, 'base64');

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('sightings')
                    .upload(fileName, bytes, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('sightings')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
            }

            // Clean and prepare metadata for permanent storage
            // Note: Media (inat_photos, sounds, etc.) is already in the bird object from our server-side enrichment
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
