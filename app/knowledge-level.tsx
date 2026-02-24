import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const LEVELS = [
    { id: 'Novice', label: 'Novice' },
    { id: 'Advanced beginner', label: 'Advanced beginner' },
    { id: 'Proficient', label: 'Proficient' },
    { id: 'Expert', label: 'Expert' },
];

export default function KnowledgeLevelScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleContinue = async () => {
        if (!selectedLevel || !user) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    knowledge_level: selectedLevel,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;
            router.back();
        } catch (error) {
            console.error('Error saving knowledge level:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft color="#000000" size={26} strokeWidth={2.5} />
                </Pressable>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>
                    What's your <Text style={styles.titleBold}>knowledge level</Text>{'\n'}with bird?
                </Text>

                <View style={styles.optionsContainer}>
                    {LEVELS.map((level) => (
                        <Pressable
                            key={level.id}
                            style={styles.optionCard}
                            onPress={() => setSelectedLevel(level.id)}
                        >
                            <View style={styles.optionRow}>
                                <View style={[
                                    styles.radio,
                                    selectedLevel === level.id && styles.radioSelected
                                ]}>
                                    {selectedLevel === level.id && <View style={styles.radioInner} />}
                                </View>
                                <Text style={[
                                    styles.optionLabel,
                                    selectedLevel === level.id && styles.optionLabelSelected
                                ]}>
                                    {level.label}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </View>

                <View style={styles.footer}>
                    <Pressable
                        onPress={handleContinue}
                        disabled={!selectedLevel || isSaving}
                    >
                        <LinearGradient
                            colors={['#FF3B30', '#FF9500']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[
                                styles.continueBtn,
                                (!selectedLevel || isSaving) && { opacity: 0.5 }
                            ]}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.continueText}>Continue</Text>
                            )}
                        </LinearGradient>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 8,
        height: 50,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Inter_400Regular',
        color: '#000000',
        textAlign: 'center',
        lineHeight: 34,
        marginBottom: 60,
    },
    titleBold: {
        fontFamily: 'Outfit_600SemiBold',
    },
    optionsContainer: {
        gap: 16,
    },
    optionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F2F2F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
    },
    radioSelected: {
        borderColor: '#FF3B30',
        backgroundColor: '#FFFFFF',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF3B30',
    },
    optionLabel: {
        fontSize: 18,
        fontFamily: 'Outfit_600SemiBold',
        color: '#FF7A45', // Brand-ish orange for labels in ref image
    },
    optionLabelSelected: {
        color: '#FF3B30',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 24,
        right: 24,
    },
    continueBtn: {
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.9,
    },
    continueText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontFamily: 'Outfit_600SemiBold',
    },
});
