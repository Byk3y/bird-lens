import * as Location from 'expo-location';

export async function getCurrentLocation() {
    try {
        // 1. Check existing permissions first without prompting
        const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

        // If already denied, don't even try (prevents UI flicker)
        if (existingStatus === 'denied') {
            console.log('Location permission already denied');
            return null;
        }

        // 2. Request/Confirm permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.log('Location permission denied');
            return null;
        }

        // 3. Get position with a fast fallback
        // We try to get the current position but allow a timeout
        let position = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<null>((_, reject) => setTimeout(() => reject('timeout'), 3000))
        ]).catch((err) => {
            console.log('Current position fetch failed or timed out:', err);
            return null;
        }) as Location.LocationObject | null;

        // If high-accuracy fails or times out, grab the last known position (near instant)
        if (!position) {
            console.log('Falling back to last known location');
            position = await Location.getLastKnownPositionAsync();
        }

        if (!position) return null;

        // 4. Reverse Geocode
        const geocode = await Location.reverseGeocodeAsync({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        });

        const place = geocode[0];
        if (!place) return null;

        const locationName = place.city
            ? `${place.city}, ${place.country}`
            : place.region
                ? `${place.region}, ${place.country}`
                : place.country || 'Unknown Location';

        return {
            locationName,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        };
    } catch (error) {
        console.error('Location error:', error);
        return null;
    }
}
