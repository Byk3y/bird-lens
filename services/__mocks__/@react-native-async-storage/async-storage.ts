import { mockStorage } from "../shared_state.ts";

export default {
    getItem: (key: string) => Promise.resolve(mockStorage.get(key) || null),
    setItem: (key: string, value: string) => {
        mockStorage.set(key, value);
        return Promise.resolve();
    },
    removeItem: (key: string) => {
        mockStorage.delete(key);
        return Promise.resolve();
    },
};
