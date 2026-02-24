import { useRouter } from 'expo-router';

// Global variable to track the last navigation time across the entire app.
// This is the "best practice" pattern for React Native as it prevents 
// double-navigation even if different buttons are tapped in rapid succession.
let globalLastNavTime = 0;
const NAV_DELAY = 500; // ms

/**
 * A custom hook that wraps expo-router's useRouter to prevent multiple 
 * rapid navigation actions (double-taps) globally.
 */
export function useSafeNavigation() {
    const router = useRouter();

    const isNavigationAllowed = () => {
        const now = Date.now();
        if (now - globalLastNavTime < NAV_DELAY) {
            return false;
        }
        globalLastNavTime = now;
        return true;
    };

    const safePush = (href: any, options?: any) => {
        if (isNavigationAllowed()) {
            router.push(href, options);
        }
    };

    const safeReplace = (href: any, options?: any) => {
        if (isNavigationAllowed()) {
            router.replace(href, options);
        }
    };

    const safeNavigate = (href: any, options?: any) => {
        if (isNavigationAllowed()) {
            router.navigate(href, options);
        }
    };

    return {
        ...router,
        push: safePush,
        replace: safeReplace,
        navigate: safeNavigate,
    };
}
