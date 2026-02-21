import { Colors } from '@/constants/theme';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Pause, Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

interface MiniAudioPlayerProps {
    uri: string;
}

export const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = ({ uri }) => {
    const [playback, setPlayback] = useState<Audio.Sound | null>(null);
    const [status, setStatus] = useState<AVPlaybackStatusSuccess | null>(null);
    const [loading, setLoading] = useState(false);

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
                    { uri },
                    { shouldPlay: true, volume: 1.0 },
                    onPlaybackStatusUpdate
                );
                setPlayback(audioInstance);
                setLoading(false);
            } catch (error) {
                console.error(`Error loading sound from ${uri}:`, error);
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

    const progressValue = (status?.positionMillis && status?.durationMillis
        ? status.positionMillis / status.durationMillis
        : 0);

    return (
        <BlurView intensity={30} tint="light" style={styles.container}>
            <View style={styles.waveform}>
                {Array.from({ length: 12 }).map((_, i) => {
                    // Less aggressive heights to fit smaller container
                    const heights = [8, 12, 10, 16, 12, 18, 14, 12, 10, 12, 8, 6];
                    const h = heights[i % heights.length];
                    const isPlayed = (i / 12) < progressValue;

                    return (
                        <View
                            key={i}
                            style={[
                                styles.bar,
                                {
                                    height: h,
                                    backgroundColor: isPlayed ? '#D946EF' : '#A21CAF', // Magenta/Purple gradient feel
                                    opacity: isPlayed ? 1 : 0.4
                                }
                            ]}
                        />
                    );
                })}
            </View>

            <TouchableOpacity
                onPress={handlePlayPause}
                style={styles.playButton}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                ) : status?.isPlaying ? (
                    <Pause size={14} color={Colors.primary} fill={Colors.primary} />
                ) : (
                    <Play size={14} color={Colors.primary} fill={Colors.primary} style={{ marginLeft: 2 }} />
                )}
            </TouchableOpacity>
        </BlurView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 38,
        borderRadius: 19,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginRight: 8,
    },
    bar: {
        width: 2.5,
        borderRadius: 1.25,
    },
    playButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
});
