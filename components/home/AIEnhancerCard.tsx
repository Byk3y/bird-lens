import { Colors, Spacing } from '@/constants/theme';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import {
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {
    Gesture,
    GestureDetector
} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

import { useRouter } from 'expo-router';

export const AIEnhancerCard: React.FC = () => {
    const router = useRouter();
    const containerWidth = width * 0.38;
    const sliderPos = useSharedValue(0.6); // Start at 60% across (showing 60% blur, 40% sharp)

    const panGesture = Gesture.Pan()
        .onBegin((event) => {
            let newPos = event.x / containerWidth;
            if (newPos < 0.05) newPos = 0.05;
            if (newPos > 0.95) newPos = 0.95;
            sliderPos.value = withSpring(newPos, { damping: 20, stiffness: 200 });
        })
        .onUpdate((event) => {
            let newPos = event.x / containerWidth;
            if (newPos < 0.05) newPos = 0.05;
            if (newPos > 0.95) newPos = 0.95;
            sliderPos.value = newPos;
        })
        .activeOffsetX([-10, 10]);

    const sharpOverlayStyle = useAnimatedStyle(() => ({
        width: `${(1 - sliderPos.value) * 100}%`,
    }));

    const handleStyle = useAnimatedStyle(() => ({
        left: `${sliderPos.value * 100}%`,
    }));

    const handleStartPress = () => {
        router.push('/tutorial/from-blurry-to-brilliant');
    };

    return (
        <Pressable style={styles.enhancerCard} onPress={handleStartPress}>
            <GestureDetector gesture={panGesture}>
                <View style={styles.enhancerImageContainer}>
                    {/* Blurred Background (Before) */}
                    <Image
                        source={require('@/assets/images/golden_pheasant.webp')}
                        style={[styles.enhancerImage, { transform: [{ scaleX: -1 }] }]}
                        resizeMode="cover"
                        blurRadius={6}
                    />

                    {/* Sharp Overlay (After) */}
                    <Animated.View style={[styles.sharpOverlay, sharpOverlayStyle]}>
                        <Image
                            source={require('@/assets/images/golden_pheasant.webp')}
                            style={[styles.enhancerImage, { width: containerWidth, position: 'absolute', right: 0, transform: [{ scaleX: -1 }] }]}
                            resizeMode="cover"
                        />
                    </Animated.View>

                    {/* Slider Line */}
                    <Animated.View style={[styles.splitDivider, handleStyle]} />

                    {/* Slider Handle */}
                    <Animated.View style={[styles.splitHandle, handleStyle]}>
                        <View style={styles.handleLine} />
                    </Animated.View>
                </View>
            </GestureDetector>

            <View style={styles.enhancerContent}>
                <Text style={styles.enhancerTitle}>Turn your phone into a pro camera</Text>
                <View style={styles.startButton}>
                    <Text style={styles.startText}>Learn More</Text>
                    <ChevronRight color={Colors.primary} size={16} />
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    enhancerCard: {
        backgroundColor: Colors.white,
        marginHorizontal: 12,
        borderRadius: 16,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    enhancerImageContainer: {
        width: width * 0.38,
        height: 94,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#f1f5f9',
    },
    enhancerImage: {
        width: '100%',
        height: '100%',
    },
    sharpOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        overflow: 'hidden',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.5)',
    },
    splitDivider: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: 1.5,
        backgroundColor: Colors.white,
    },
    splitHandle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.white,
        marginLeft: -12,
        marginTop: -12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    handleLine: {
        width: 2,
        height: 10,
        backgroundColor: '#e2e8f0',
        borderRadius: 1,
    },
    enhancerContent: {
        flex: 1,
        padding: Spacing.md,
    },
    enhancerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
        lineHeight: 18,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    startText: {
        color: Colors.primary,
        fontWeight: '800',
        fontSize: 14,
    },
});
