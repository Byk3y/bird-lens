import { supabase } from '@/lib/supabase';
import { BirdResult } from '@/types/scanner';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert } from 'react-native';

export const useBirdIdentification = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState<BirdResult | null>(null);

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
                species_name: bird.name,
                scientific_name: bird.scientific_name,
                rarity: bird.rarity,
                fact: bird.fact,
                confidence: bird.confidence,
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
