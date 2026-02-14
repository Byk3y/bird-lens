import { Colors, Spacing, Typography } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Bird, X } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

interface ScannerPreviewProps {
    imageUri: string;
    onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const ScannerPreview: React.FC<ScannerPreviewProps> = ({ imageUri, onClose }) => {
    const scanLineY = useSharedValue(0);
    const ringRotation = useSharedValue(0);

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
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <X color={Colors.white} size={28} />
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

                    {/* Image with subtle grid effect */}
                    <View style={styles.imageRelative}>
                        <Image
                            source={{ uri: `data:image/jpeg;base64,${imageUri}` }}
                            style={styles.image}
                        />

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

                        {/* Scanning Laser */}
                        <Animated.View style={[styles.scanLine, scanLineStyle]}>
                            <LinearGradient
                                colors={['rgba(249, 115, 22, 0)', 'rgba(249, 115, 22, 0.8)', 'rgba(249, 115, 22, 0)']}
                                style={styles.gradient}
                            />
                        </Animated.View>
                    </View>
                </View>
            </View>

            {/* Scanning Indicator Section */}
            <View style={styles.bottomSection}>
                <View style={styles.scannerCircleContainer}>
                    {/* Rotating Ring */}
                    <Animated.View style={[styles.scannerRing, ringStyle]}>
                        <LinearGradient
                            colors={[Colors.accent, 'transparent']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                    </Animated.View>

                    {/* Inner Content */}
                    <View style={styles.scannerInner}>
                        <View style={styles.birdIconContainer}>
                            <Bird color={Colors.accent} size={40} />
                        </View>
                    </View>
                </View>
                <Text style={styles.analyzingText}>Scanning species...</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.95)',
        zIndex: 100,
        justifyContent: 'space-between',
        paddingVertical: 60,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        alignItems: 'flex-start',
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    frameContainer: {
        width: width * 0.85,
        height: height * 0.5,
        position: 'relative',
        padding: 4,
    },
    imageRelative: {
        flex: 1,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#111',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.15,
    },
    gridLineH: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: Colors.white,
    },
    gridLineV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: Colors.white,
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
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerRing: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 70,
        borderWidth: 2,
        borderColor: 'rgba(249, 115, 22, 0.3)',
    },
    scannerInner: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    birdIconContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#fff7ed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    analyzingText: {
        ...Typography.h3,
        color: Colors.white,
        fontWeight: 'bold',
    },
});

