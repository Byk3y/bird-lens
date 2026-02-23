import { ResizeMode, Video } from 'expo-av';
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
                <TouchableOpacity
                    onPress={handleFinish}
                    style={styles.getStartedButton}
                    activeOpacity={0.8}
                    disabled={!isFinished}
                >
                    <Text style={styles.getStartedText}>Get Started</Text>
                </TouchableOpacity>
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
});
