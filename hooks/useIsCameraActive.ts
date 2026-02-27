import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * A hook that returns true only if the current screen is focused AND the application is in the foreground.
 * Use this to conditionally unmount Expo Camera components to prevent battery drain and the green camera indicator
 * from staying on when navigating to other tabs or putting the app in the background.
 */
export function useIsCameraActive(): boolean {
    const isFocused = useIsFocused();
    const [isForeground, setIsForeground] = useState<boolean>(true); // Assume true initially

    useEffect(() => {
        // We only care about ensuring the app is active 
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            setIsForeground(nextAppState === 'active');
        };

        // Set initial state correctly just in case
        setIsForeground(AppState.currentState === 'active');

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
        };
    }, []);

    return isFocused && isForeground;
}
