import { useRef, useState } from 'react';
import { GestureResponderEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

export const useScannerGestures = () => {
    const [zoom, setZoom] = useState(0);
    const baseZoom = useRef(0);

    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            baseZoom.current = zoom;
        })
        .onUpdate((event) => {
            const zoomSensitivity = 0.5;
            const newZoom = baseZoom.current + (event.scale - 1) * zoomSensitivity;
            runOnJS(setZoom)(Math.min(Math.max(newZoom, 0), 1));
        });

    const handleTrackInteraction = (event: GestureResponderEvent, trackHeight: number) => {
        if (!trackHeight) return;
        const { locationY } = event.nativeEvent;
        // Map Y coordinate (0 at top) to zoom value (1 at top, 0 at bottom)
        const normalized = 1 - locationY / trackHeight;
        setZoom(Math.min(Math.max(normalized, 0), 1));
    };

    return {
        zoom,
        setZoom,
        pinchGesture,
        handleTrackInteraction,
    };
};
