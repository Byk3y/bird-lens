import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BirdResult } from '@/types/scanner';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert } from 'react-native';

export const useBirdIdentification = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState<BirdResult | null>(null);
    const { user } = useAuth();

    const identifyBird = async (imageB64?: string, audioB64?: string) => {
        if (isProcessing) return;

        try {
            setIsProcessing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const { data, error } = await supabase.functions.invoke('identify-bird', {
                body: { image: imageB64, audio: audioB64 },
            });

            if (error) throw error;

            setResult(data as BirdResult);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return data as BirdResult;
        } catch (error: any) {
            Alert.alert('Identification Failed', error.message);
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const saveSighting = async (bird: BirdResult) => {
        if (isSaving) return;

        try {
            setIsSaving(true);
            const { error } = await supabase.from('sightings').insert({
                user_id: user?.id,
                species_name: bird.name,
                scientific_name: bird.scientific_name,
                rarity: bird.rarity,
                fact: bird.fact,
                confidence: bird.confidence,
                metadata: {
                    also_known_as: bird.also_known_as,
                    taxonomy: bird.taxonomy,
                    identification_tips: bird.identification_tips,
                    description: bird.description,
                    diet: bird.diet,
                    diet_tags: bird.diet_tags,
                    habitat: bird.habitat,
                    habitat_tags: bird.habitat_tags,
                    nesting_info: bird.nesting_info,
                    feeder_info: bird.feeder_info,
                    behavior: bird.behavior,
                }
            });

            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Saved!', `${bird.name} added to your collection.`);
            setResult(null);
            return true;
        } catch (error: any) {
            Alert.alert('Error', error.message);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const resetResult = () => setResult(null);

    return {
        isProcessing,
        isSaving,
        result,
        identifyBird,
        saveSighting,
        resetResult,
    };
};
