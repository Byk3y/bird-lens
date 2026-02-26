import { Colors, Spacing, Typography } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundCaptureWaveform } from './SoundCaptureWaveform';

interface ScannerPreviewProps {
    imageUri: string | null;
    audioUri?: string | null;
    activeMode?: 'photo' | 'sound';
    isProcessing: boolean;
    progressMessage: string | null;
    error: string | null;
    onReset: () => void;
}

const { width, height } = Dimensions.get('window');

const PHOTO_MESSAGES = [
    "Wait for a moment...",
    "Analyzing plumage and patterns...",
    "Scanning bill and eye markings...",
    "Comparing against local species...",
    "Consulting field guide records...",
    "Refining taxonomic matches...",
    "Identifying unique field marks...",
];

const SOUND_MESSAGES = [
    "Wait for a moment...",
    "Analyzing acoustic patterns...",
    "Scanning frequency ranges...",
    "Consulting song archives...",
    "Isolating unique calls...",
    "Matching vocalizations...",
    "Refining auditory data...",
];

export const ScannerPreview: React.FC<ScannerPreviewProps> = ({
    imageUri,
    audioUri,
    activeMode = 'photo',
    isProcessing,
    progressMessage,
    error,
    onReset
}) => {
    const insets = useSafeAreaInsets();
    const scanLineY = useSharedValue(0);
    const ringRotation = useSharedValue(0);
    const [statusIndex, setStatusIndex] = useState(0);

    const messages = activeMode === 'sound' ? SOUND_MESSAGES : PHOTO_MESSAGES;

    useEffect(() => {
        if (isProcessing) {
            const interval = setInterval(() => {
                setStatusIndex((prev: number) => (prev + 1) % messages.length);
            }, 1800);
            return () => clearInterval(interval);
        } else {
            setStatusIndex(0);
        }
    }, [isProcessing, messages]);

    const displayMessage = progressMessage || messages[statusIndex];

    useEffect(() => {
        scanLineY.value = withRepeat(
            withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
        ringRotation.value = withRepeat(
            withTiming(360, { duration: 2000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const scanLineStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: scanLineY.value * (height * 0.5) }],
            opacity: scanLineY.value > 0.1 ? 1 : scanLineY.value * 10,
        };
    });

    const ringStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${ringRotation.value}deg` }],
        };
    });

    return (
        <View style={styles.container}>
            {/* Header / Close Button */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
                <TouchableOpacity
                    onPress={onReset}
                    style={styles.closeButton}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                    <View pointerEvents="none">
                        <X size={26} color={Colors.text} strokeWidth={2.5} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Main Image Container */}
            <View style={styles.imageContainer}>
                <View style={styles.frameContainer}>
                    {/* Corners */}
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {/* Image or Sound Spectrogram */}
                    <View style={styles.imageRelative}>
                        {activeMode === 'photo' && imageUri ? (
                            <Image
                                source={{ uri: `data:image/webp;base64,${imageUri}` }}
                                style={styles.image}
                            />
                        ) : (
                            <View style={[styles.image, { backgroundColor: '#1A1A1A' }]}>
                                <LinearGradient
                                    colors={['#1A1A1A', '#2D3436', '#1A1A1A']}
                                    style={StyleSheet.absoluteFill}
                                />
                                {activeMode === 'sound' && (
                                    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
                                        <SoundCaptureWaveform />
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Grid Overlay */}
                        <View style={styles.gridOverlay}>
                            {/* Horizontal grid lines */}
                            {[...Array(8)].map((_, i) => (
                                <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 12.5}%` }]} />
                            ))}
                            {/* Vertical grid lines */}
                            {[...Array(6)].map((_, i) => (
                                <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 16.6}%` }]} />
                            ))}
                        </View>

                        {/* Lens Flare / Vignette Effect */}
                        <View style={styles.lensOverlay} pointerEvents="none">
                            <LinearGradient
                                colors={['rgba(255,255,255,0.1)', 'transparent', 'rgba(0,0,0,0.2)']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                        </View>

                        {/* Scanning Laser */}
                        <Animated.View style={[styles.scanLine, scanLineStyle]}>
                            <LinearGradient
                                colors={
                                    error
                                        ? ['rgba(239, 68, 68, 0)', 'rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0)'] // Red if error
                                        : ['rgba(249, 115, 22, 0)', 'rgba(249, 115, 22, 0.8)', 'rgba(249, 115, 22, 0)'] // Orange if scanning
                                }
                                style={styles.gradient}
                            />
                        </Animated.View>
                    </View>
                </View>
            </View>

            {/* Scanning Indicator Section */}
            <View style={styles.bottomSection}>
                <View style={styles.scannerCircleContainer}>
                    <View style={styles.birdLensBorder}>
                        <View style={styles.birdLensInner}>
                            <LottieView
                                source={require('@/assets/animations/bird-loading.lottie')}
                                autoPlay
                                loop
                                style={{ width: 180, height: 180 }}
                            />
                            {/* Glass Highlight Overlay */}
                            <View style={styles.lensGlassHighlight} pointerEvents="none" />
                        </View>
                    </View>
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.analyzingText, error ? styles.errorTitle : null]}>
                        {error ? "Service Unavailable" : displayMessage}
                    </Text>
                    {error && (
                        <Text style={styles.errorMessage}>
                            {error}
                        </Text>
                    )}
                </View>
            </View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background,
        zIndex: 100,
        justifyContent: 'space-between',
        paddingTop: 0,
        paddingBottom: 120,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        alignItems: 'flex-start',
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -30,
    },
    frameContainer: {
        width: width * 0.75,
        height: height * 0.4,
        position: 'relative',
        padding: 4,
    },
    imageRelative: {
        flex: 1,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.1,
    },
    gridLineH: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#000',
    },
    gridLineV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: '#000',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: Colors.accent,
        borderWidth: 5,
        zIndex: 2,
    },
    topLeft: {
        top: -4,
        left: -4,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    topRight: {
        top: -4,
        right: -4,
        borderLeftWidth: 0,
        borderBottomWidth: 0,
    },
    bottomLeft: {
        bottom: -4,
        left: -4,
        borderRightWidth: 0,
        borderTopWidth: 0,
    },
    bottomRight: {
        bottom: -4,
        right: -4,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    scanLine: {
        width: '100%',
        height: 60,
        position: 'absolute',
        top: 0,
        zIndex: 3,
    },
    gradient: {
        flex: 1,
    },
    bottomSection: {
        alignItems: 'center',
        gap: 16,
    },
    scannerCircleContainer: {
        width: 160,
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    birdLensBorder: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 4,
        borderColor: '#E5E7EB', // Metallic grey border
        padding: 4,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    birdLensInner: {
        flex: 1,
        borderRadius: 76,
        backgroundColor: '#F9FAFB',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    lensGlassHighlight: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderTopLeftRadius: 76,
        borderBottomRightRadius: 76,
        borderLeftWidth: 2,
        borderTopWidth: 2,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        gap: 4,
    },
    analyzingText: {
        ...Typography.h3,
        color: Colors.text,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    errorTitle: {
        color: '#EF4444',
    },
    errorMessage: {
        ...Typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontSize: 14,
    },
    lensOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    }
});

