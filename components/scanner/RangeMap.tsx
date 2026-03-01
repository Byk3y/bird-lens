import { Colors } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, Lock, Pause, Play } from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';

interface RangeMapProps {
    taxonKey: number | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const RangeMap = ({ taxonKey }: RangeMapProps) => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [isPlaying, setIsPlaying] = useState(false);
    const intervalRef = useRef<any>(null);

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                setSelectedMonth((prev: number) => (prev + 1) % 12);
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPlaying]);

    if (!taxonKey) {
        return (
            <View style={styles.emptyContainer}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading Map Data...</Text>
            </View>
        );
    }

    // GBIF Density Tile URL with month filtering
    // Note: GBIF tile API often supports 'month' param even if not in the main docs for styles
    const tileUrlTemplate = `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=${taxonKey}&style=purpleYellow.poly&month=${selectedMonth + 1}`;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Globe color={Colors.text} size={24} />
                    <Text style={styles.title}>Range Maps</Text>
                </View>
                <Pressable style={styles.moreBtn}>
                    <Text style={styles.moreText}>•••</Text>
                </Pressable>
            </View>

            <View style={styles.mapWrapper}>
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={{
                        latitude: 39.8283,
                        longitude: -98.5795,
                        latitudeDelta: 50,
                        longitudeDelta: 50,
                    }}
                    customMapStyle={mapStyle}
                >
                    <UrlTile
                        urlTemplate={tileUrlTemplate}
                        zIndex={100}
                        maximumZ={19}
                        tileSize={256}
                    />
                </MapView>

                {/* Legend Overlay */}
                <View style={styles.legendOverlay}>
                    <Text style={styles.legendText}>Sparse</Text>
                    <LinearGradient
                        colors={['#facc15', '#9333ea']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.legendGradient}
                    />
                    <Text style={styles.legendText}>Dense</Text>
                </View>

                {/* Lock Overlay (Visual decoration from reference) */}
                <View style={styles.lockBtn}>
                    <Lock color={Colors.white} size={18} />
                </View>

                {/* Monthly Slider Control */}
                <View style={styles.sliderContainer}>
                    <View style={styles.sliderRow}>
                        <Pressable hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            onPress={() => setIsPlaying(!isPlaying)}
                            style={styles.playBtn}
                        >
                            <View pointerEvents="none">
                                {isPlaying ? (
                                    <Pause color={Colors.white} size={24} fill={Colors.white} />
                                ) : (
                                    <Play color={Colors.white} size={24} fill={Colors.white} />
                                )}
                            </View>
                        </Pressable>

                        <View style={styles.monthsTrack}>
                            {MONTHS.map((month, index) => (
                                <Pressable
                                    key={month}
                                    onPress={() => setSelectedMonth(index)}
                                    style={styles.monthItem}
                                >
                                    {index % 2 === 0 && (
                                        <Text style={[
                                            styles.monthLabel,
                                            selectedMonth === index && styles.activeMonthLabel
                                        ]}>
                                            {month}
                                        </Text>
                                    )}
                                    {selectedMonth === index && (
                                        <MotiView
                                            style={styles.indicator}
                                            from={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                        />
                                    )}
                                </Pressable>
                            ))}
                            {/* Visual line/slider thumb */}
                            <View style={styles.trackLine} />
                            <MotiView
                                style={[
                                    styles.thumb,
                                    { left: `${(selectedMonth / 11) * 100}%` }
                                ]}
                                transition={{ type: 'spring', damping: 15 }}
                            />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

const mapStyle = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    // ... Simplified light map style
];

const styles = StyleSheet.create({
    container: {
        marginVertical: 20,
        backgroundColor: Colors.white,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    emptyContainer: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: Colors.textTertiary,
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.text,
    },
    moreBtn: {
        padding: 4,
    },
    moreText: {
        fontSize: 20,
        color: '#94a3b8',
    },
    mapWrapper: {
        height: 350,
        backgroundColor: '#e2e8f0',
        position: 'relative',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    legendOverlay: {
        position: 'absolute',
        top: 16,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 8,
    },
    legendText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    legendGradient: {
        width: 80,
        height: 8,
        borderRadius: 4,
    },
    lockBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(30, 41, 59, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sliderContainer: {
        position: 'absolute',
        bottom: 16,
        left: 12,
        right: 12,
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        borderRadius: 16,
        padding: 12,
    },
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    playBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthsTrack: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 40,
        position: 'relative',
    },
    trackLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
    },
    thumb: {
        position: 'absolute',
        width: 12,
        height: 24,
        backgroundColor: Colors.white,
        borderRadius: 4,
        top: 8,
    },
    monthItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
    },
    monthLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 20,
    },
    activeMonthLabel: {
        color: Colors.white,
    },
    indicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.white,
        position: 'absolute',
        bottom: 18,
    }
});
