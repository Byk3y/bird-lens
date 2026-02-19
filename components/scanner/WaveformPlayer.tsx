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
import { AttributionWebView } from '../shared/profile/AttributionWebView';

interface WaveformPlayerProps {
    sound: BirdSound;
    activeSoundId?: string | null;
    onPlay?: (id: string) => void;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({ sound, activeSoundId, onPlay }) => {
    const [playback, setPlayback] = useState<Audio.Sound | null>(null);
    const [status, setStatus] = useState<AVPlaybackStatusSuccess | null>(null);
    const [loading, setLoading] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const [webViewVisible, setWebViewVisible] = useState(false);
    const [webViewUrl, setWebViewUrl] = useState('');
    const [webViewTitle, setWebViewTitle] = useState('');

    // Stop playback if another sound becomes active
    useEffect(() => {
        if (activeSoundId && activeSoundId !== sound.id && playback && status?.isPlaying) {
            playback.pauseAsync();
        }
    }, [activeSoundId, playback, status?.isPlaying, sound.id]);

    useEffect(() => {
        return () => {
            if (playback) {
                playback.unloadAsync();
            }
        };
    }, [playback]);

    const handlePlayPause = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Notify parent that this sound is trying to play
        if (onPlay) {
            onPlay(sound.id);
        }

        if (!playback) {
            try {
                setLoading(true);

                // Add MP3 extension hint for Xeno-Canto URLs to help iOS AVPlayer
                let loadUrl = sound.url;
                if (loadUrl.includes('xeno-canto.org') && !loadUrl.toLowerCase().includes('.mp3')) {
                    loadUrl = loadUrl.includes('?') ? `${loadUrl}&ext=.mp3` : `${loadUrl}?ext=.mp3`;
                }

                console.log(`Loading sound: ${loadUrl}`);
                const { sound: audioInstance } = await Audio.Sound.createAsync(
                    { uri: loadUrl },
                    { shouldPlay: true, volume: 1.0 },
                    onPlaybackStatusUpdate
                );
                setPlayback(audioInstance);
                setLoading(false);
            } catch (error) {
                console.error(`Error loading sound from ${sound.url}:`, error);
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

    const isActive = activeSoundId === sound.id;

    return (
        <>
            <View style={[styles.playerContainer, isActive && styles.activePlayerContainer]}>
                <View style={[styles.card, isActive && styles.activeCard]}>
                    <Pressable
                        onPress={handlePlayPause}
                        style={({ pressed }) => [
                            styles.playBtn,
                            pressed && { opacity: 0.8 }
                        ]}
                    >
                        {loading || (status && !status.isPlaying && status.isBuffering) ? (
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

                {isActive && (
                    <View style={styles.attributionContainer}>
                        <Text style={styles.attrLocation}>
                            Recording location:{sound.location || sound.country}
                        </Text>

                        <View style={styles.copyrightRow}>
                            <Text style={styles.copyrightIcon}>©</Text>
                            <Text style={styles.copyrightText}>copyright</Text>
                        </View>

                        <Text style={styles.attrRecordedBy}>
                            Recorded by{' '}
                            <Text
                                style={styles.recorderLink}
                                onPress={() => {
                                    setWebViewUrl(`https://www.xeno-canto.org/explore?query=${encodeURIComponent(sound.recorder)}`);
                                    setWebViewTitle(sound.recorder);
                                    setWebViewVisible(true);
                                }}
                            >
                                {sound.recorder}
                            </Text>
                            . Original file has been cropped and compressed.
                        </Text>
                    </View>
                )}
            </View>

            <AttributionWebView
                visible={webViewVisible}
                url={webViewUrl}
                title={webViewTitle}
                onClose={() => setWebViewVisible(false)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    playerContainer: {
        backgroundColor: Colors.white,
        borderRadius: 100, // Circular when inactive
        marginBottom: 12,
        // Premium "beautiful" soft shadow
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
    },
    activePlayerContainer: {
        borderRadius: 24, // More rectangular when active
        paddingBottom: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        paddingHorizontal: 10,
    },
    activeCard: {
        marginBottom: 8,
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
    durationText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A1A',
        fontVariant: ['tabular-nums'],
    },
    attributionContainer: {
        paddingHorizontal: 12,
        gap: 6,
    },
    attrLocation: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    copyrightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    copyrightIcon: {
        fontSize: 18,
        color: '#666',
    },
    copyrightText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '400',
    },
    attrRecordedBy: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    recorderLink: {
        color: '#BA6526',
        textDecorationLine: 'underline',
        fontWeight: '500',
    },
});


