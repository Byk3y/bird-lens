import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const video = useRef<Video>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isLoading, setIsLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [showLocationStep, setShowLocationStep] = useState(false);

    const handleGetStarted = () => {
        setIsFinished(true); // Ensure video is marked as finished if they skip or finish
        setShowLocationStep(true);
    };

    const handleLocationPermission = async (enable: boolean) => {
        if (enable) {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                console.log('Location permission status:', status);
            } catch (err) {
                console.warn('Error requesting location:', err);
            }
        }
        router.push('/paywall');
    };

    const handleFinish = () => {
        router.push('/paywall');
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.didJustFinish && !isFinished) {
            setIsFinished(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    };

    return (
        <View style={styles.container}>
            {isLoading && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#F97316" />
                </View>
            )}

            <Video
                ref={video}
                style={styles.video}
                source={require('../assets/videos/birdsnap_intro.mp4')}
                useNativeControls={false}
                resizeMode={ResizeMode.COVER}
                isLooping={false}
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
                onLoadStart={() => setIsLoading(true)}
                onLoad={() => setIsLoading(false)}
                shouldPlay
            />

            <Animated.View style={[styles.overlay, { bottom: insets.bottom + 40, opacity: fadeAnim }]}>
                {!showLocationStep ? (
                    <TouchableOpacity
                        onPress={handleGetStarted}
                        style={styles.getStartedButton}
                        activeOpacity={0.8}
                        disabled={!isFinished}
                    >
                        <Text style={styles.getStartedText}>Get Started</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.locationStepContainer}>
                        <BlurView intensity={30} tint="dark" style={styles.locationCard}>
                            <View style={[styles.iconContainer, { backgroundColor: '#F97316' }]}>
                                <Ionicons name="location" size={32} color="#FFF" />
                            </View>

                            <Text style={styles.locationTitle}>Identify Local Birds</Text>
                            <Text style={styles.locationDescription}>
                                Enable location to see which species are common in your current region and seasonal patterns.
                            </Text>

                            <TouchableOpacity
                                onPress={() => handleLocationPermission(true)}
                                style={styles.allowButton}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.allowButtonText}>Allow Location</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleLocationPermission(false)}
                                style={styles.skipButton}
                                activeOpacity={0.6}
                            >
                                <Text style={styles.skipButtonText}>Maybe Later</Text>
                            </TouchableOpacity>
                        </BlurView>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loaderContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    video: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        left: 25,
        right: 25,
        alignItems: 'center',
    },
    getStartedButton: {
        backgroundColor: '#F97316',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    getStartedText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'PoppinsBold',
        fontWeight: '700',
    },
    locationStepContainer: {
        width: '100%',
        alignItems: 'center',
    },
    locationCard: {
        width: '100%',
        padding: 24,
        borderRadius: 32,
        overflow: 'hidden',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        // Premium shadow
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    locationTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'PoppinsBold',
        textAlign: 'center',
        marginBottom: 12,
    },
    locationDescription: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 10,
    },
    allowButton: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 25,
        alignItems: 'center',
        marginBottom: 12,
    },
    allowButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '600',
    },
    skipButton: {
        paddingVertical: 12,
        width: '100%',
        alignItems: 'center',
    },
    skipButtonText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        fontWeight: '500',
    },
});
