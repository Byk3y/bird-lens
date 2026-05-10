import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const PUSH_TOKEN_REGISTERED_KEY = '@push_token_registered';
const POST_ID_PROMPT_KEY = '@has_seen_post_id_notification_prompt';

// Project ID for Expo Push Token registration
const EAS_PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId ?? '9789b22b-8db4-46f3-a8f5-3066f7e38101';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permission from the user.
 * Returns true if permission is granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

/**
 * Check if notification permission has already been granted.
 */
export async function hasNotificationPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
}

/**
 * Register the device's Expo Push Token with the server.
 * Call this after notification permission is granted.
 * Idempotent — safe to call multiple times.
 */
export async function registerPushToken(userId: string): Promise<void> {
    try {
        // Get the Expo Push Token
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: EAS_PROJECT_ID,
        });

        const token = tokenData.data;
        if (!token) {
            console.warn('[notifications] No push token received');
            return;
        }

        console.log('[notifications] Registering push token:', token.slice(0, 20) + '...');

        // Upsert the token to the database
        const { error } = await supabase
            .from('push_tokens')
            .upsert(
                {
                    user_id: userId,
                    token,
                    platform: Platform.OS,
                    is_active: true,
                    last_used_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,token' }
            );

        if (error) {
            console.error('[notifications] Failed to register push token:', error);
            return;
        }

        await AsyncStorage.setItem(PUSH_TOKEN_REGISTERED_KEY, 'true');
        console.log('[notifications] Push token registered successfully');
    } catch (e) {
        console.warn('[notifications] Push token registration failed:', e);
    }
}

/**
 * Mark the user's push token as inactive (e.g., on sign out or account deletion).
 */
export async function unregisterPushToken(userId: string): Promise<void> {
    try {
        await supabase
            .from('push_tokens')
            .update({ is_active: false })
            .eq('user_id', userId);

        await AsyncStorage.removeItem(PUSH_TOKEN_REGISTERED_KEY);
        console.log('[notifications] Push token deactivated');
    } catch (e) {
        console.warn('[notifications] Failed to deactivate push token:', e);
    }
}

/**
 * Check if a push token has already been registered on this device.
 */
export async function isPushTokenRegistered(): Promise<boolean> {
    const val = await AsyncStorage.getItem(PUSH_TOKEN_REGISTERED_KEY);
    return val === 'true';
}

/**
 * Check if the post-first-ID notification prompt has been shown.
 */
export async function hasSeenPostIdPrompt(): Promise<boolean> {
    const val = await AsyncStorage.getItem(POST_ID_PROMPT_KEY);
    return val === 'true';
}

/**
 * Mark the post-first-ID notification prompt as shown.
 */
export async function markPostIdPromptSeen(): Promise<void> {
    await AsyncStorage.setItem(POST_ID_PROMPT_KEY, 'true');
}

/**
 * Try to silently register push token if permission is already granted.
 * Call on app launch after auth is ready.
 */
export async function tryRegisterPushTokenSilently(userId: string): Promise<void> {
    try {
        const alreadyRegistered = await isPushTokenRegistered();
        if (alreadyRegistered) return;

        const hasPermission = await hasNotificationPermission();
        if (!hasPermission) return;

        await registerPushToken(userId);
    } catch (e) {
        console.warn('[notifications] Silent push token registration failed:', e);
    }
}
