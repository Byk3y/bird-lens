import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

let isConfigured = false;
let initPromise: Promise<void> | null = null;

/**
 * Configures the global audio mode for the app.
 * 
 * @param recordingEnabled - Whether audio recording is currently requested
 */
export async function configureAudioMode(recordingEnabled: boolean = false) {
    // If we are already configured in the requested mode, skip
    // (Wait for any existing configuration to finish first if it's in progress)
    if (initPromise) await initPromise;

    console.log(`[Audio] Configuring audio mode (recordingEnabled: ${recordingEnabled})...`);

    try {
        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            allowsRecordingIOS: recordingEnabled,
            interruptionModeIOS: recordingEnabled ? InterruptionModeIOS.DoNotMix : InterruptionModeIOS.MixWithOthers,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            shouldDuckAndroid: true,
        });

        isConfigured = true;
        console.log('[Audio] Audio mode configured successfully');
    } catch (error) {
        console.error('[Audio] Failed to configure audio mode:', error);
        throw error;
    }
}

/**
 * Initial configuration for the app startup.
 * Sets the default "mixing/non-recording" mode.
 */
export function initAudioConfig(): Promise<void> {
    if (initPromise) return initPromise;

    initPromise = configureAudioMode(false);
    return initPromise;
}

/**
 * Wait for audio to be initialized.
 * Use this in components that need to perform audio actions.
 */
export async function waitForAudioInit(): Promise<void> {
    if (isConfigured) return;
    if (initPromise) {
        await initPromise;
    } else {
        await initAudioConfig();
    }
}
