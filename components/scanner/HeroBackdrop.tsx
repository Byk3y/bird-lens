import { BirdResult } from '@/types/scanner';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface HeroBackdropProps {
    activeBird: BirdResult | null;
    heroImages: Record<string, string>;
    sourceMode: 'photo' | 'sound';
    capturedImage: string | null;
    isComparisonTab: boolean;
}

export const HeroBackdrop = React.memo(({
    activeBird,
    heroImages,
    sourceMode,
    capturedImage,
    isComparisonTab
}: HeroBackdropProps) => {
    return (
        <View style={StyleSheet.absoluteFill}>
            {activeBird && heroImages[activeBird.scientific_name] ? (
                <Image
                    source={{ uri: heroImages[activeBird.scientific_name] }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={500}
                    cachePolicy="memory-disk"
                />
            ) : sourceMode === 'photo' && capturedImage ? (
                <Image
                    source={{ uri: `data:image/webp;base64,${capturedImage}` } as any}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                />
            ) : sourceMode === 'sound' ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1A1A1A' }]}>
                    <LinearGradient
                        colors={['#1A1A1A', '#2D3436', '#1A1A1A']}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
            ) : isComparisonTab && capturedImage ? (
                <Image
                    source={{ uri: `data:image/webp;base64,${capturedImage}` } as any}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={500}
                    cachePolicy="memory-disk"
                />
            ) : null}
            <BlurView intensity={sourceMode === 'sound' ? 40 : 70} style={StyleSheet.absoluteFill} tint="dark" />
        </View>
    );
});
