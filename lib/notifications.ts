import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const TRIAL_REMINDER_ID_KEY = '@trial_reminder_notification_id';
const TRIAL_DAYS = 7;
const REMIND_DAYS_BEFORE_END = 1;

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

export async function scheduleTrialReminder(): Promise<void> {
    // Cancel any existing reminder first
    await cancelTrialReminder();

    const triggerSeconds = (TRIAL_DAYS - REMIND_DAYS_BEFORE_END) * 24 * 60 * 60;

    const id = await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Your BirdMark Pro trial ends tomorrow',
            body: 'Enjoy unlimited bird identifications — your free trial expires in 24 hours.',
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: triggerSeconds,
            repeats: false,
        },
    });

    await AsyncStorage.setItem(TRIAL_REMINDER_ID_KEY, id);
}

export async function cancelTrialReminder(): Promise<void> {
    try {
        const id = await AsyncStorage.getItem(TRIAL_REMINDER_ID_KEY);
        if (id) {
            await Notifications.cancelScheduledNotificationAsync(id);
            await AsyncStorage.removeItem(TRIAL_REMINDER_ID_KEY);
        }
    } catch (e) {
        console.warn('Failed to cancel trial reminder:', e);
    }
}
