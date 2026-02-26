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
                    // Even smaller heights for tiny player
                    const heights = [6, 8, 7, 10, 8, 12, 10, 8, 7, 8, 6, 5];
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
                    <View pointerEvents="none">
                        <Pause size={10} color={Colors.primary} fill={Colors.primary} />
                    </View>
                ) : (
                    <View pointerEvents="none">
                        <Play size={10} color={Colors.primary} fill={Colors.primary} style={{ marginLeft: 1 }} />
                    </View>
                )}
            </TouchableOpacity>
        </BlurView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        height: 30,
        borderRadius: 15,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1.5,
        marginRight: 6,
    },
    bar: {
        width: 2,
        borderRadius: 1,
    },
    playButton: {
        width: 22,
        height: 22,
        borderRadius: 11,
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
