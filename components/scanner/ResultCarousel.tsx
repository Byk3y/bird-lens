import { Colors } from '@/constants/theme';
import { Image } from 'expo-image';
import { Activity, Camera, Image as ImageIcon } from 'lucide-react-native';
import React from 'react';
import { Animated, Text, View } from 'react-native';
import { ITEM_WIDTH, SPACER_WIDTH, styles } from './IdentificationResult.styles';

interface ResultCarouselProps {
    scrollX: Animated.Value;
    onScroll: (...args: any[]) => void;
    carouselItemsWithComparison: any[];
    heroImages: Record<string, string>;
    sourceMode: 'photo' | 'sound';
    capturedImage: string | null;
    recordingUri?: string | null;
}

export const ResultCarousel = React.memo(({
    scrollX,
    onScroll,
    carouselItemsWithComparison,
    heroImages,
    sourceMode,
    capturedImage,
    recordingUri
}: ResultCarouselProps) => {
    return (
        <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH}
            decelerationRate="fast"
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[
                styles.carouselContent,
                { paddingHorizontal: SPACER_WIDTH }
            ]}
        >
            {carouselItemsWithComparison.map((item: any, index: number) => {
                const inputRange = [
                    (index - 1) * ITEM_WIDTH,
                    index * ITEM_WIDTH,
                    (index + 1) * ITEM_WIDTH,
                ];

                // MANDATORY PRESERVATION: Animation Constants
                const scale = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.8, 1, 0.8],
                    extrapolate: 'clamp',
                });

                const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.8, 1, 0.8],
                    extrapolate: 'clamp',
                });

                const isBird = item.scientific_name !== undefined;

                return (
                    <Animated.View key={index} style={[
                        styles.birdSlide,
                        { transform: [{ scale }], opacity, width: ITEM_WIDTH }
                    ]}>
                        <View style={styles.mainCircle}>
                            {isBird ? (
                                heroImages[item.scientific_name] ? (
                                    <Image
                                        source={{ uri: heroImages[item.scientific_name] }}
                                        style={styles.circleImage}
                                        cachePolicy="memory-disk"
                                    />
                                ) : (
                                    <View style={[styles.circleImage, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
                                        <ImageIcon color="#666" size={40} />
                                    </View>
                                )
                            ) : (
                                sourceMode === 'photo' && capturedImage ? (
                                    <Image
                                        source={{ uri: capturedImage }}
                                        style={styles.circleImage}
                                        cachePolicy="memory-disk"
                                    />
                                ) : sourceMode === 'sound' && recordingUri ? (
                                    <View style={[styles.circleImage, { backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' }]}>
                                        <Activity color={Colors.primary} size={48} />
                                        <Text style={{ color: Colors.white, fontSize: 12, marginTop: 8, fontWeight: '600' }}>YOUR CAPTURE</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.circleImage, { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
                                        <Camera color="#666" size={48} />
                                    </View>
                                )
                            )}
                        </View>
                    </Animated.View>
                );
            })}
        </Animated.ScrollView>
    );
});
