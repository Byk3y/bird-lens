import { Colors } from '@/constants/theme';
import { BirdSound } from '@/services/SoundService';
import { Audio } from 'expo-av';
import { Pause, Play } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface WaveformPlayerProps {
    sound: BirdSound;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({ sound }) => {
    const [playback, setPlayback] = useState<Audio.Sound | null>(null);
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        return () => {
            if (playback) {
                playback.unloadAsync();
            }
        };
    }, [playback]);

    const handlePlayPause = async () => {
        if (!playback) {
            try {
                setLoading(true);
                const { sound: audioInstance } = await Audio.Sound.createAsync(
                    { uri: sound.url },
                    { shouldPlay: true },
                    (status) => setStatus(status)
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

    const progress = status?.positionMillis && status?.durationMillis
        ? status.positionMillis / status.durationMillis
        : 0;

    return (
        <View style={styles.card}>
            <View style={styles.mainRow}>
                <Pressable onPress={handlePlayPause} style={styles.playBtn}>
                    {loading ? (
                        <ActivityIndicator color={Colors.white} size="small" />
                    ) : status?.isPlaying ? (
                        <Pause color={Colors.white} size={22} fill={Colors.white} />
                    ) : (
                        <Play color={Colors.white} size={22} fill={Colors.white} />
                    )}
                </Pressable>

                <View style={styles.waveformContainer}>
                    {/* Background Waveform (Grey) */}
                    <Image
                        source={{ uri: sound.waveform }}
                        style={[styles.waveform, { tintColor: '#e2e8f0' }]}
                        resizeMode="stretch"
                    />
                    {/* Progress Waveform (Orange) */}
                    <View style={[styles.progressMask, { width: `${progress * 100}%` }]}>
                        <Image
                            source={{ uri: sound.waveform }}
                            style={[styles.waveform, { tintColor: '#f97316', width: 200 }]} // Width should match container
                            resizeMode="stretch"
                        />
                    </View>
                </View>

                <Text style={styles.duration}>{sound.duration}</Text>
            </View>

            {/* Meta Info */}
            <MotiView
                from={{ opacity: 0, height: 0 }}
                animate={{
                    opacity: status?.isPlaying || playback ? 1 : 0.6,
                    height: status?.isPlaying || playback ? 'auto' : 'auto'
                }}
                style={styles.metaInfo}
            >
                <Text style={styles.metaLine}>Recording location: {sound.country}</Text>
                <View style={styles.copyRow}>
                    <Text style={styles.copyright}>© copyright</Text>
                </View>
                <Text style={styles.metaLine}>
                    Recorded by <Text style={styles.recorderName}>{sound.recorder}</Text>. Original file has been cropped and compressed.
                </Text>
            </MotiView>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    playBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f97316',
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveformContainer: {
        flex: 1,
        height: 40,
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    waveform: {
        width: '100%',
        height: '100%',
    },
    progressMask: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        overflow: 'hidden',
    },
    duration: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        width: 45,
        textAlign: 'right',
    },
    metaInfo: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f8fafc',
    },
    metaLine: {
        fontSize: 12,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    copyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    copyright: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    recorderName: {
        color: '#f97316',
        textDecorationLine: 'underline',
    },
});
