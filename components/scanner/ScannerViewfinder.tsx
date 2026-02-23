import { Typography } from '@/constants/theme';
import React from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';

interface ScannerViewfinderProps {
    // Zoom props removed as they will now be handled in ScannerControls
}

export const ScannerViewfinder: React.FC<ScannerViewfinderProps> = () => {
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
