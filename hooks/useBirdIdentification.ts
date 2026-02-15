import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { INaturalistService } from '@/services/INaturalistService';
import { BirdResult, INaturalistPhoto } from '@/types/scanner';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert } from 'react-native';

export const useBirdIdentification = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [candidates, setCandidates] = useState<BirdResult[]>([]);
    const [result, setResult] = useState<BirdResult | null>(null);
    const { user } = useAuth();

    const identifyBird = async (imageB64?: string, audioB64?: string) => {
        if (isProcessing) return;

        try {
            setIsProcessing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Real API Call
            const { data, error } = await supabase.functions.invoke('identify-bird', {
                body: { image: imageB64, audio: audioB64 },
            });

            if (error) throw error;

            const primaryResult = data as BirdResult;

            // Mocking additional candidates for the "Masterpiece" UI
            // In a real scenario, the backend should return this list.
            const mockCandidates: BirdResult[] = [
                {
                    ...primaryResult,
                    confidence: primaryResult.confidence,
                    images: [
                        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Rufous_Hummingbird_%28Selasphorus_rufus%29_-_01.jpg/440px-Rufous_Hummingbird_%28Selasphorus_rufus%29_-_01.jpg',
                        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Rufous_Hummingbird_-_02.jpg/440px-Rufous_Hummingbird_-_02.jpg',
                        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Selasphorus_rufus_mp.jpg/440px-Selasphorus_rufus_mp.jpg'
                    ]
                },
                {
                    ...primaryResult,
                    name: "Allen's Hummingbird",
                    scientific_name: "Selasphorus sasin",
                    confidence: 0.85,
                    description: "Similar to the Rufous Hummingbird but with a green back.",
                    images: [
                        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Allen%27s_Hummingbird_-_01.jpg/440px-Allen%27s_Hummingbird_-_01.jpg',
                        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Selasphorus_sasin_mp.jpg/440px-Selasphorus_sasin_mp.jpg'
                    ]
                },
                {
                    ...primaryResult,
                    name: "Broad-tailed Hummingbird",
                    scientific_name: "Selasphorus platycercus",
                    confidence: 0.65,
                    description: "Known for the metallic trill produced by its wings during flight.",
                    images: [
                        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Broad-tailed_Hummingbird_-_01.jpg/440px-Broad-tailed_Hummingbird_-_01.jpg',
                        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Selasphorus_platycercus_mp.jpg/440px-Selasphorus_platycercus_mp.jpg'
                    ]
                }
            ];

            setResult(primaryResult); // Keep primary result for backward compatibility if needed
            setCandidates(mockCandidates);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return primaryResult;
        } catch (error: any) {
            Alert.alert('Identification Failed', error.message);
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const saveSighting = async (bird: BirdResult, capturedImage?: string | null, inatPhotos: INaturalistPhoto[] = []) => {
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

            // Fetch gender-specific images for identification tips
            const [maleImg, femaleImg] = await Promise.all([
                INaturalistService.fetchGenderedPhoto(bird.scientific_name, 'male'),
                INaturalistService.fetchGenderedPhoto(bird.scientific_name, 'female')
            ]);

            // Clean and prepare metadata for permanent storage
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
                images: (bird.images || []).slice(0, 5), // Limit internal images
                inat_photos: (inatPhotos || []).slice(0, 8), // Persist the expert-vetted photos
                male_image_url: maleImg,
                female_image_url: femaleImg
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
    };

    return {
        isProcessing,
        isSaving,
        result,
        candidates,
        identifyBird,
        saveSighting,
        resetResult,
    };
};
