import { configureAudioMode, waitForAudioInit } from '@/lib/audioConfig';
import { Audio } from 'expo-av';
import { useCallback, useEffect, useState } from 'react';

export function useAudioRecording() {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [durationMillis, setDurationMillis] = useState(0);
    const [meteringLevel, setMeteringLevel] = useState(-160);
    const [recordingUri, setRecordingUri] = useState<string | null>(null);

    const startRecording = useCallback(async () => {
        try {
            await waitForAudioInit();
            await Audio.requestPermissionsAsync();
            await configureAudioMode(true);

            const { recording } = await Audio.Recording.createAsync(
                {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                    android: {
                        extension: '.wav',
                        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
                        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
                        sampleRate: 48000,
                        numberOfChannels: 1,
                        bitRate: 64000,
                    },
                    ios: {
                        extension: '.wav',
                        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
                        audioQuality: Audio.IOSAudioQuality.MAX,
                        sampleRate: 48000,
                        numberOfChannels: 1,
                        bitRate: 64000,
                        linearPCMBitDepth: 16,
                        linearPCMIsBigEndian: false,
                        linearPCMIsFloat: false,
                    },
                },
                (status) => {
                    setDurationMillis(status.durationMillis);
                    if (status.metering !== undefined) {
                        setMeteringLevel(status.metering);
                    }

                    // Auto-stop at 10 seconds to prevent Railway Varnish 503 errors
                    if (status.durationMillis >= 10000 && status.isRecording) {
                        recording.stopAndUnloadAsync().then(() => {
                            const uri = recording.getURI();
                            setRecordingUri(uri);
                            setRecording(null);
                            setIsRecording(false);

                            Audio.setAudioModeAsync({
                                allowsRecordingIOS: false,
                            }).then(() => configureAudioMode(false));
                        }).catch(err => console.error("Auto-stop failed", err));
                    }
                },
                100 // Progress interval
            );

            setRecording(recording);
            setIsRecording(true);
            setRecordingUri(null);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }, []);

    const stopRecording = useCallback(async () => {
        if (!recording) return;

        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecordingUri(uri);
            setRecording(null);

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });
            await configureAudioMode(false);
        } catch (err) {
            console.error('Failed to stop recording', err);
        } finally {
            setRecording(null);
            setIsRecording(false);
        }
    }, [recording]);

    const stopAndCleanup = useCallback(async () => {
        if (!recording) return;
        try {
            await recording.stopAndUnloadAsync();
        } catch (err) {
            // Silently fail if already unloaded or other state issue
        } finally {
            setRecording(null);
            setIsRecording(false);
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });
            await configureAudioMode(false);
        }
    }, [recording]);

    const formatTime = (millis: number) => {
        const seconds = Math.floor(millis / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const centiseconds = Math.floor((millis % 1000) / 10);

        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync().catch(() => {
                    // Ignore errors if already unloaded
                });
            }
        };
    }, [recording]);

    const clearRecording = useCallback(() => {
        setRecordingUri(null);
        setDurationMillis(0);
        setMeteringLevel(-160);
    }, []);

    return {
        isRecording,
        recordingUri,
        startRecording,
        stopRecording,
        stopAndCleanup,
        clearRecording,
        formattedTime: formatTime(durationMillis),
        durationMillis,
        meteringLevel,
    };
}
