import { Colors } from '@/constants/theme';
import React, { useEffect } from 'react';
import {
    Dimensions,
    StyleSheet,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VISUALIZER_HEIGHT = 160;
const BAR_COUNT = 45;
const BAR_GAP = 3;
const BAR_WIDTH = (SCREEN_WIDTH - 60 - (BAR_COUNT * BAR_GAP)) / BAR_COUNT;

const SoundBar = ({ index }: { index: number }) => {
    const height = useSharedValue(4);

    useEffect(() => {
        // Continuous wave effect for processing/analyzing state
        const delay = index * 50;
        const timeout = setTimeout(() => {
            height.value = withRepeat(
                withSequence(
                    withTiming(VISUALIZER_HEIGHT * (0.3 + Math.random() * 0.4), { duration: 500 }),
                    withTiming(4, { duration: 500 })
                ),
                -1,
                true
            );
        }, delay);

        return () => clearTimeout(timeout);
    }, [index]);

    const animatedStyle = useAnimatedStyle(() => ({
        height: height.value,
        opacity: withSpring(height.value > 10 ? 0.8 : 0.2),
    }));

    return (
        <Animated.View
            style={[
                styles.bar,
                { width: BAR_WIDTH },
                animatedStyle
            ]}
        />
    );
};

export const SoundCaptureWaveform: React.FC = () => {
    return (
        <View style={styles.container}>
            <View style={styles.barsContainer}>
                {Array.from({ length: BAR_COUNT }).map((_, i) => (
                    <SoundBar key={i} index={i} />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: VISUALIZER_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    barsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: BAR_GAP,
    },
    bar: {
        backgroundColor: Colors.primary,
        borderRadius: 2,
        minHeight: 4,
    },
});
