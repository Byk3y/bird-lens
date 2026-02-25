import { Stack } from 'expo-router';
import React from 'react';

export default function EnhancerLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
            <Stack.Screen name="camera" />
        </Stack>
    );
}
