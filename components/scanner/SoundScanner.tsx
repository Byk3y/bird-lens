import { ScannerHeader } from '@/components/scanner/ScannerHeader';
import { Colors, Typography } from '@/constants/theme';
import React, { useEffect } from 'react';
import {
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VISUALIZER_HEIGHT = 160;
const BAR_COUNT = 45;
const BAR_GAP = 3;
const BAR_WIDTH = (SCREEN_WIDTH - 60 - (BAR_COUNT * BAR_GAP)) / BAR_COUNT;

interface SoundScannerProps {
    onBack: () => void;
    isRecording: boolean;
    formattedTime: string;
    hasRecording: boolean;
    isProcessing: boolean;
    meteringLevel: number;
    durationMillis: number;
    progressMessage?: string | null;
    error?: string | null;
    analysisData?: any;
}

const SoundBar = ({ meteringLevel, isRecording, isProcessing, index }: { index: number; meteringLevel: number; isRecording: boolean, isProcessing: boolean }) => {
    const height = useSharedValue(4);

    useEffect(() => {
        if (isRecording) {
            // Map metering level (-160 to 0) to height (4 to VISUALIZER_HEIGHT)
            const normalizedLevel = Math.max(0, (meteringLevel + 160) / 160);
            const randomVariance = 0.4 + Math.random() * 0.8;
            const targetHeight = Math.max(4, normalizedLevel * VISUALIZER_HEIGHT * randomVariance);

            height.value = withSpring(targetHeight, {
                damping: 15,
                stiffness: 120,
            });
        } else if (isProcessing) {
            // Create a wave effect across bars
            const delay = index * 50;
            setTimeout(() => {
                height.value = withRepeat(
                    withSequence(
                        withTiming(VISUALIZER_HEIGHT * (0.3 + Math.random() * 0.4), { duration: 500 }),
                        withTiming(4, { duration: 500 })
                    ),
                    -1,
                    true
                );
            }, delay);
        } else {
            height.value = withSpring(4);
        }
    }, [meteringLevel, isRecording, isProcessing]);

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

export const SoundScanner: React.FC<SoundScannerProps> = ({
    onBack,
    isRecording,
    formattedTime,
    hasRecording,
    isProcessing,
    meteringLevel,
    durationMillis,
    progressMessage,
    error,
}) => {
    const showHint = isRecording && durationMillis < 5000;
    return (
        <View style={styles.soundWrapper}>
            <ScannerHeader onBack={onBack} flash="off" onFlashToggle={() => { }} isDark />

            <View style={styles.mainContent}>
                {/* Visualizer Area */}
                <View style={styles.visualizerContainer}>
                    <View style={styles.barsContainer}>
                        {Array.from({ length: BAR_COUNT }).map((_, i) => (
                            <SoundBar
                                key={i}
                                index={i}
                                meteringLevel={meteringLevel}
                                isRecording={isRecording}
                                isProcessing={isProcessing}
                            />
                        ))}
                    </View>
                </View>

                {/* Center Content */}
                <View style={styles.infoSection}>
                    {!isRecording && !isProcessing && !hasRecording ? (
                        <View style={styles.idleState}>
                            <Text style={styles.stateTitle}>Ready to listen</Text>
                            <Text style={styles.stateSubtitle}>Place your phone near the sound source</Text>
                        </View>
                    ) : (
                        <View style={styles.activeState}>
                            {!isProcessing && !error && (
                                <View style={styles.timePill}>
                                    <View style={[styles.statusDot, isRecording && styles.recordingDot]} />
                                    <Text style={styles.timeText}>{formattedTime}</Text>
                                </View>
                            )}
                            <Text style={[styles.statusText, error ? styles.errorText : null]}>
                                {error
                                    ? "Service Unavailable"
                                    : (isProcessing
                                        ? (progressMessage || 'Analyzing vocalization...')
                                        : (isRecording ? 'Capturing audio...' : 'Audio Captured')
                                    )}
                            </Text>
                            {error && (
                                <Text style={styles.errorMessage}>
                                    {error}
                                </Text>
                            )}
                            {showHint && !isProcessing && (
                                <Text style={styles.hintText}>Record at least 5 seconds for best results</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>

        </View>
    );
};

const styles = StyleSheet.create({
    soundWrapper: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
        paddingBottom: 100, // Account for controls
    },
    visualizerContainer: {
        height: VISUALIZER_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
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
    infoSection: {
        alignItems: 'center',
        gap: 20,
    },
    idleState: {
        alignItems: 'center',
        gap: 8,
    },
    stateTitle: {
        ...Typography.h2,
        color: Colors.text,
        fontWeight: '800',
    },
    stateSubtitle: {
        ...Typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        opacity: 0.7,
    },
    activeState: {
        alignItems: 'center',
        gap: 16,
    },
    statusText: {
        ...Typography.label,
        color: Colors.textSecondary,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    errorText: {
        color: Colors.error,
        fontWeight: '600',
    },
    errorMessage: {
        ...Typography.body,
        color: Colors.error,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 20,
    },
    hintText: {
        ...Typography.caption,
        color: Colors.primary,
        fontWeight: '600',
        marginTop: -8,
    },
    timePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        gap: 10,
        borderWidth: 1.5,
        borderColor: Colors.border,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.textTertiary,
    },
    recordingDot: {
        backgroundColor: Colors.primary,
    },
    timeText: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        zIndex: 100,
    },
    processingText: {
        ...Typography.h3,
        color: Colors.text,
        fontWeight: '700',
    },
});
