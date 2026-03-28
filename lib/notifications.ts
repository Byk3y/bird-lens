import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const MORNING_ACTIVATION_KEY = '@has_scheduled_morning_activation';
const TRIAL_CLEANUP_KEY = '@trial_reminder_cleanup_done';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function requestNotificationPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

/**
 * Schedule a local notification for 8:00 AM to nudge the user to try the app.
 * Only schedules once per user (guarded by AsyncStorage flag).
 */
export async function scheduleMorningActivation(): Promise<void> {
    try {
        const already = await AsyncStorage.getItem(MORNING_ACTIVATION_KEY);
        if (already) return;

        const now = new Date();
        const hour = now.getHours();

        // Determine target date: if currently 6-9 AM (peak bird hours) or after 9 AM,
        // schedule for tomorrow. If before 6 AM, schedule for today.
        const target = new Date(now);
        if (hour >= 6) {
            target.setDate(target.getDate() + 1);
        }
        target.setHours(8, 0, 0, 0);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'The morning birds are out! 🌅',
                body: 'Step outside and tap the microphone to discover who\u2019s singing near you.',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                year: target.getFullYear(),
                month: target.getMonth() + 1, // expo-notifications uses 1-indexed months
                day: target.getDate(),
                hour: 8,
                minute: 0,
                repeats: false,
            },
        });

        await AsyncStorage.setItem(MORNING_ACTIVATION_KEY, 'true');
    } catch (e) {
        console.warn('Failed to schedule morning activation:', e);
    }
}

/**
 * One-time cleanup: cancel any lingering trial reminder notifications
 * from the previous version of the app. Safe to call on every launch.
 */
export async function cleanupLegacyReminders(): Promise<void> {
    try {
        const done = await AsyncStorage.getItem(TRIAL_CLEANUP_KEY);
        if (done) return;

        // Cancel all previously scheduled notifications (only the trial reminder existed)
        await Notifications.cancelAllScheduledNotificationsAsync();
        // Clean up the old AsyncStorage key
        await AsyncStorage.removeItem('@trial_reminder_notification_id');
        await AsyncStorage.setItem(TRIAL_CLEANUP_KEY, 'true');
    } catch (e) {
        console.warn('Failed to cleanup legacy reminders:', e);
    }
}
