import { Colors, Typography } from '@/constants/theme';
import React from 'react';
import {
    GestureResponderEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ScannerViewfinderProps {
    zoom: number;
    onZoomChange: (value: number) => void;
    onTrackInteraction: (event: GestureResponderEvent, trackHeight: number) => void;
}

export const ScannerViewfinder: React.FC<ScannerViewfinderProps> = ({
    zoom,
    onZoomChange,
    onTrackInteraction,
}) => {
    const [trackHeight, setTrackHeight] = React.useState(0);
    return (
        <View style={styles.content}>
            <View style={styles.viewfinderWrapper}>
                {/* Viewfinder Corners */}
                <View style={styles.viewfinderContainer}>
                    <View style={styles.minimalViewfinder}>
                        <View style={[styles.miniCorner, styles.topLeft]} />
                        <View style={[styles.miniCorner, styles.topRight]} />
                        <View style={[styles.miniCorner, styles.bottomLeft]} />
                        <View style={[styles.miniCorner, styles.bottomRight]} />
                    </View>

                    {/* Vertical Zoom Slider */}
                    <View style={styles.zoomControl}>
                        <TouchableOpacity onPress={() => onZoomChange(Math.min(zoom + 0.1, 1))}>
                            <Text style={styles.zoomSymbol}>+</Text>
                        </TouchableOpacity>
                        <View
                            style={styles.zoomTrackContainer}
                            onLayout={(e) => setTrackHeight(e.nativeEvent.layout.height)}
                            onStartShouldSetResponder={() => true}
                            onResponderGrant={(e) => onTrackInteraction(e, trackHeight)}
                            onResponderMove={(e) => onTrackInteraction(e, trackHeight)}
                        >
                            <View style={styles.zoomTrack}>
                                <View style={[styles.zoomIndicator, { bottom: `${zoom * 100}%` }]} />
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => onZoomChange(Math.max(zoom - 0.1, 0))}>
                            <Text style={styles.zoomSymbol}>−</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Viewfinder Text */}
            <View style={styles.viewfinderInfo}>
                <Text style={styles.infoLine}>Identify a bird via photo</Text>
                <Text style={styles.infoLine}>Ensure the bird is in focus</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        alignItems: 'center',
    },
    viewfinderWrapper: {
        flex: 1,
        justifyContent: 'center',
        width: '100%',
        paddingBottom: 120,
    },
    viewfinderContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    minimalViewfinder: {
        flex: 1,
        aspectRatio: 1,
        borderWidth: 0,
        position: 'relative',
    },
    miniCorner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    topLeft: { top: 0, left: 0, borderLeftWidth: 3, borderTopWidth: 3, borderTopLeftRadius: 16 },
    topRight: { top: 0, right: 0, borderRightWidth: 3, borderTopWidth: 3, borderTopRightRadius: 16 },
    bottomLeft: { bottom: 0, left: 0, borderLeftWidth: 3, borderBottomWidth: 3, borderBottomLeftRadius: 16 },
    bottomRight: { bottom: 0, right: 0, borderRightWidth: 3, borderBottomWidth: 3, borderBottomRightRadius: 16 },
    zoomControl: {
        position: 'absolute',
        right: 0,
        height: '80%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    zoomSymbol: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '600',
    },
    zoomTrackContainer: {
        width: 30,
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    zoomTrack: {
        width: 4,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        position: 'relative',
    },
    zoomIndicator: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.white,
        left: -8,
        borderWidth: 3,
        borderColor: Colors.primary,
    },
    viewfinderInfo: {
        marginBottom: 40,
        alignItems: 'center',
        gap: 2,
    },
    infoLine: {
        ...Typography.h3,
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
