import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';

type OnChangeCallback = (completed: boolean) => void;
const listeners = new Set<OnChangeCallback>();

export const onboardingState = {
    async isCompleted(): Promise<boolean> {
        try {
            const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
            return value === 'true';
        } catch (e) {
            console.error('Error reading onboarding state', e);
            return false;
        }
    },

    async markAsCompleted(): Promise<void> {
        try {
            await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
            this.notify(true);
        } catch (e) {
            console.error('Error saving onboarding state', e);
        }
    },

    async reset(): Promise<void> {
        try {
            await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
            this.notify(false);
        } catch (e) {
            console.error('Error resetting onboarding state', e);
        }
    },

    onChange(callback: OnChangeCallback): () => void {
        listeners.add(callback);
        return () => {
            listeners.delete(callback);
        };
    },

    notify(completed: boolean): void {
        listeners.forEach(callback => callback(completed));
    }
};
