import { useAlert } from '@/components/common/AlertProvider';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import ViewShot from 'react-native-view-shot';

export function useShareCard() {
    const viewShotRef = useRef<ViewShot>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const { showAlert } = useAlert();

    const captureCard = useCallback(async (): Promise<string | null> => {
        if (!viewShotRef.current?.capture) return null;
        try {
            setIsCapturing(true);
            const uri = await viewShotRef.current.capture();
            return uri;
        } catch (err) {
            console.error('Failed to capture card:', err);
            showAlert({
                title: 'Error',
                message: 'Failed to capture the share card.'
            });
            return null;
        } finally {
            setIsCapturing(false);
        }
    }, [showAlert]);

    const saveToPhotos = useCallback(async (onSuccess?: () => void) => {
        const uri = await captureCard();
        if (!uri) return;

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showAlert({
                    title: 'Permission Required',
                    message: 'Please allow access to your photo library to save share cards.'
                });
                return;
            }
            await MediaLibrary.saveToLibraryAsync(uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showAlert({
                title: 'Saved!',
                message: 'Your bird card has been saved to Photos.',
                actions: [
                    {
                        text: 'OK',
                        onPress: () => {
                            if (onSuccess) onSuccess();
                        }
                    }
                ]
            });
        } catch (err) {
            console.error('Failed to save to photos:', err);
            showAlert({
                title: 'Error',
                message: 'Failed to save to your photo library.'
            });
        }
    }, [captureCard, showAlert]);

    const shareCard = useCallback(async (): Promise<boolean> => {
        const uri = await captureCard();
        if (!uri) return false;

        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                showAlert({
                    title: 'Sharing not available',
                    message: 'Sharing is not supported on this device.'
                });
                return false;
            }
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Share your bird sighting',
            });
            return true;
        } catch (err) {
            console.error('Failed to share:', err);
            return false;
        }
    }, [captureCard, showAlert]);

    return {
        viewShotRef,
        isCapturing,
        saveToPhotos,
        shareCard,
    };
}
