import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHUNK_SIZE = 1800;
const CHUNK_SENTINEL = '__chunked:';

/**
 * Supabase-compatible storage adapter that uses iOS Keychain / Android EncryptedSharedPreferences
 * via expo-secure-store. Sessions persist across app reinstalls on iOS.
 *
 * Includes chunking for values exceeding the 2KB iOS Keychain limit,
 * and a transparent AsyncStorage fallback for migrating existing sessions.
 */
export const SecureStoreAdapter = {
    async getItem(key: string): Promise<string | null> {
        try {
            const value = await readFromSecureStore(key);
            if (value !== null) return value;

            // Fallback: check AsyncStorage for pre-update sessions
            const legacyValue = await AsyncStorage.getItem(key);
            if (legacyValue !== null) {
                // Migrate to SecureStore
                try {
                    await writeToSecureStore(key, legacyValue);
                    await AsyncStorage.removeItem(key);
                } catch {
                    // Migration failed — keep AsyncStorage value intact for next attempt
                }
                return legacyValue;
            }

            return null;
        } catch {
            // SecureStore unavailable — fall back to AsyncStorage
            return AsyncStorage.getItem(key);
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        try {
            await writeToSecureStore(key, value);
        } catch {
            // SecureStore unavailable — fall back to AsyncStorage
            await AsyncStorage.setItem(key, value);
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            await removeFromSecureStore(key);
        } catch {
            // Ignore SecureStore errors
        }
        try {
            await AsyncStorage.removeItem(key);
        } catch {
            // Ignore AsyncStorage errors
        }
    },
};

async function readFromSecureStore(key: string): Promise<string | null> {
    const value = await SecureStore.getItemAsync(key);
    if (value === null) return null;

    if (value.startsWith(CHUNK_SENTINEL)) {
        const count = parseInt(value.replace(CHUNK_SENTINEL, ''), 10);
        const chunks: string[] = [];
        for (let i = 0; i < count; i++) {
            const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
            if (chunk === null) return null; // Corrupted — treat as missing
            chunks.push(chunk);
        }
        return chunks.join('');
    }

    return value;
}

async function writeToSecureStore(key: string, value: string): Promise<void> {
    // Clean up any existing chunks first
    await removeFromSecureStore(key);

    if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
    } else {
        const count = Math.ceil(value.length / CHUNK_SIZE);
        for (let i = 0; i < count; i++) {
            const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
        }
        await SecureStore.setItemAsync(key, `${CHUNK_SENTINEL}${count}`);
    }
}

async function removeFromSecureStore(key: string): Promise<void> {
    const value = await SecureStore.getItemAsync(key);
    if (value !== null && value.startsWith(CHUNK_SENTINEL)) {
        const count = parseInt(value.replace(CHUNK_SENTINEL, ''), 10);
        for (let i = 0; i < count; i++) {
            await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
    }
    await SecureStore.deleteItemAsync(key);
}
