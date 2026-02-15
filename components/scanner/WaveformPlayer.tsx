import { Colors } from '@/constants/theme';
import { BirdSound } from '@/types/scanner';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Pause, Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

interface WaveformPlayerProps {
    sound: BirdSound;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({ sound }) => {
    const [playback, setPlayback] = useState<Audio.Sound | null>(null);
    const [status, setStatus] = useState<AVPlaybackStatusSuccess | null>(null);
    const [loading, setLoading] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        return () => {
            if (playback) {
                playback.unloadAsync();
            }
        };
    }, [playback]);

    const handlePlayPause = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (!playback) {
            try {
                setLoading(true);
                const { sound: audioInstance } = await Audio.Sound.createAsync(
                    {
                        uri: sound.url,
                        headers: {
                            'User-Agent': 'BirdLensApp/1.0'
                        }
                    },
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                setPlayback(audioInstance);
                setLoading(false);
            } catch (error) {
                console.error('Error loading sound:', error);
                setLoading(false);
            }
            return;
        }

        if (status?.isPlaying) {
            await playback.pauseAsync();
        } else {
            if (status?.didJustFinish) {
                await playback.replayAsync();
            } else {
                await playback.playAsync();
            }
        }
    };

    const onPlaybackStatusUpdate = (newStatus: AVPlaybackStatus) => {
        if (newStatus.isLoaded) {
            setStatus(newStatus);
        }
    };

    const handleSeek = async (event: any) => {
        if (!playback || !status?.durationMillis || containerWidth === 0) return;

        const touchX = event.nativeEvent.locationX;
        const seekRatio = Math.max(0, Math.min(1, touchX / containerWidth));
        const seekPosition = seekRatio * status.durationMillis;

        await playback.setPositionAsync(seekPosition);
        Haptics.selectionAsync();
    };

    const progressValue = (status?.positionMillis && status?.durationMillis
        ? status.positionMillis / status.durationMillis
        : 0);

    return (
        <View style={styles.card}>
            <Pressable
                onPress={handlePlayPause}
                style={({ pressed }) => [
                    styles.playBtn,
                    pressed && { opacity: 0.8 }
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                ) : status?.isPlaying ? (
                    <Pause color={Colors.white} size={12} fill={Colors.white} />
                ) : (
                    <Play color={Colors.white} size={12} fill={Colors.white} style={{ marginLeft: 2 }} />
                )}
            </Pressable>

            <View style={styles.waveformContainer}>
                <Pressable
                    style={styles.interactionLayer}
                    onPress={handleSeek}
                    onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                >
                    <View style={styles.barsRow}>
                        {Array.from({ length: 90 }).map((_, i) => {
                            // Seeded pseudo-randomness for a "real" looking organic wave
                            const seed = parseInt(sound.id.slice(-4), 16) || 0;
                            const t = i / 90;

                            // Layer multiple frequencies for "organic" complexity
                            const baseWave = Math.sin(t * 10 + seed * 0.1) * 0.4;
                            const detailWave = Math.sin(t * 25 + seed * 0.5) * 0.3;
                            const jitter = (Math.sin(t * 100 + seed) * 0.2);

                            // Combine and normalize to container height (24px)
                            const amplitude = Math.abs(baseWave + detailWave + jitter);
                            const height = 5 + (amplitude * 18); // Increased baseline and peaks

                            const isPlayed = (i / 90) < progressValue;

                            return (
                                <View
                                    key={i}
                                    style={[
                                        styles.waveBar,
                                        {
                                            height,
                                            backgroundColor: isPlayed ? Colors.primary : '#E5E7EB',
                                            width: 2, // Slimmer for high-fidelity density
                                            borderRadius: 1
                                        }
                                    ]}
                                />
                            );
                        })}
                    </View>
                </Pressable>
            </View>

            <Text style={styles.durationText}>{sound.duration}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 100,
        height: 40,
        paddingHorizontal: 10,
        marginBottom: 8,
        // Premium soft shadow
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    playBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveformContainer: {
        flex: 1,
        height: 24,
        marginHorizontal: 12,
        justifyContent: 'center',
    },
    interactionLayer: {
        height: '100%',
        width: '100%',
        position: 'relative',
        justifyContent: 'center',
    },
    barsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    waveBar: {
        width: 3,
        borderRadius: 1.5,
    },
    waveformBase: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    progressFill: {
        height: '100%',
        overflow: 'hidden',
    },
    durationText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A1A',
        fontVariant: ['tabular-nums'],
    },
});


