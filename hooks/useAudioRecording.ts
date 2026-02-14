import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useAudioRecording() {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingUri, setRecordingUri] = useState<string | null>(null);
    const [durationMillis, setDurationMillis] = useState(0);
    const timerRef = useRef<any>(null);

    // Use a ref to track if recording is actually active to avoid double-unload
    const isActiveRef = useRef(false);

    const startRecording = useCallback(async () => {
        try {
            // Request permissions if not already granted
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                console.warn('Audio permission not granted');
                return;
            }

            // Configure audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Reset state
            setDurationMillis(0);
            setRecordingUri(null);

            // Create and start recording
            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setIsRecording(true);
            isActiveRef.current = true;

            // Start timer
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setDurationMillis((prev) => prev + 100);
            }, 100);

        } catch (err) {
            console.error('Failed to start recording', err);
            setIsRecording(false);
            isActiveRef.current = false;
        }
    }, []);

    const stopRecording = useCallback(async () => {
        if (!recording || !isActiveRef.current) return;

        try {
            isActiveRef.current = false;
            setIsRecording(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            // Check status before unloading
            const status = await recording.getStatusAsync();
            if (status.canRecord || status.isRecording) {
                await recording.stopAndUnloadAsync();
            }

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

    // Single cleanup effect for unmount and recording changes
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            // Cleanup recording if it was left active
            if (isActiveRef.current && recording) {
                recording.getStatusAsync().then(status => {
                    if (status.canRecord || status.isRecording) {
                        recording.stopAndUnloadAsync().catch(err => {
                            console.log('Cleanup: error unloading recording', err);
                        });
                    }
                }).catch(() => { });
            }
        };
    }, [recording]);

    const formatTime = (millis: number) => {
        const seconds = Math.floor(millis / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const centiseconds = Math.floor((millis % 1000) / 10);

        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    return {
        isRecording,
        recordingUri,
        startRecording,
        stopRecording,
        formattedTime: formatTime(durationMillis),
        durationMillis
    };
}
