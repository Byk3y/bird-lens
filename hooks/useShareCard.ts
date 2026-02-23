import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';

export function useShareCard() {
    const viewShotRef = useRef<ViewShot>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const captureCard = useCallback(async (): Promise<string | null> => {
        if (!viewShotRef.current?.capture) return null;
        try {
            setIsCapturing(true);
            const uri = await viewShotRef.current.capture();
            return uri;
        } catch (err) {
            console.error('Failed to capture card:', err);
            Alert.alert('Error', 'Failed to capture the share card.');
            return null;
        } finally {
            setIsCapturing(false);
        }
    }, []);

    const saveToPhotos = useCallback(async () => {
        const uri = await captureCard();
        if (!uri) return;

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Please allow access to your photo library to save share cards.'
                );
                return;
            }
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert('Saved!', 'Your bird card has been saved to Photos.');
        } catch (err) {
            console.error('Failed to save to photos:', err);
            Alert.alert('Error', 'Failed to save to your photo library.');
        }
    }, [captureCard]);

    const shareCard = useCallback(async () => {
        const uri = await captureCard();
        if (!uri) return;

        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
                return;
            }
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Share your bird sighting',
            });
        } catch (err) {
            console.error('Failed to share:', err);
        }
    }, [captureCard]);

    return {
        viewShotRef,
        isCapturing,
        saveToPhotos,
        shareCard,
    };
}
