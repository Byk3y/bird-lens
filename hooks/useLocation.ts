import * as Location from 'expo-location';

export async function getCurrentLocation() {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            console.log('Location permission denied');
            return null;
        }

        const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
        });

        const geocode = await Location.reverseGeocodeAsync({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        });

        const place = geocode[0];
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
