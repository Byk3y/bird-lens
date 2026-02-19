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
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                    android: {
                        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
                        extension: '.m4a',
                        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                        audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    },
                    ios: {
                        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
                        extension: '.m4a',
                        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
                        audioQuality: Audio.IOSAudioQuality.MAX,
                    },
                },
                (status) => {
                    setDurationMillis(status.durationMillis);
                    if (status.metering !== undefined) {
                        setMeteringLevel(status.metering);
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
        } catch (err) {
            console.error('Failed to stop recording', err);
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
                recording.stopAndUnloadAsync();
            }
        };
    }, [recording]);

    return {
        isRecording,
        recordingUri,
        startRecording,
        stopRecording,
        formattedTime: formatTime(durationMillis),
        durationMillis,
        meteringLevel,
    };
}
