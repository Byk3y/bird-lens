import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShareCardData } from './MagazineCard';

interface WildCardProps {
    data: ShareCardData;
}

export const WildCard: React.FC<WildCardProps> = ({ data }) => {
    return (
        <View style={styles.card}>
            {/* Full-bleed background photo */}
            {data.imageUrl ? (
                <Image
                    source={{ uri: data.imageUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2D3436' }]} />
            )}

            {/* Dark gradient overlay from 40% down */}
            <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* Top-left branding */}
            <View style={styles.topBrand}>
                <Text style={styles.brandText}>🐦 BirdSnap</Text>
            </View>

            {/* Bottom content over gradient */}
            <View style={styles.bottomContent}>
                <Text style={styles.commonName} numberOfLines={2}>
                    {data.name}
                </Text>
                <Text style={styles.scientificName} numberOfLines={1}>
                    {data.scientificName}
                </Text>

                <View style={styles.metaRow}>
                    <View style={styles.metaLeft}>
                        {data.locationName ? (
                            <Text style={styles.metaText} numberOfLines={1}>
                                📍 {data.locationName}
                            </Text>
                        ) : null}
                        <Text style={styles.metaText}>
                            {data.dateIdentified}
                        </Text>
                    </View>
                </View>

                <Text style={styles.watermark}>birdsnap.app</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 1080,
        height: 1080,
        backgroundColor: '#1a1a1a',
    },
    topBrand: {
        position: 'absolute',
        top: 36,
        left: 40,
        zIndex: 10,
    },
    brandText: {
        fontSize: 14 * 2.5,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.3,
    },
    bottomContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 40,
        paddingBottom: 36,
    },
    commonName: {
        fontSize: 28 * 2.5,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    scientificName: {
        fontSize: 15 * 2.5,
        fontStyle: 'italic',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 18,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    metaLeft: {
        flex: 1,
        gap: 4,
    },
    metaText: {
        fontSize: 12 * 2.5,
        color: 'rgba(255,255,255,0.85)',
    },
    watermark: {
        fontSize: 10 * 2.5,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'right',
    },
});
