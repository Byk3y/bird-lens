import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShareCardData } from './MagazineCard';

interface WildCardProps {
    data: ShareCardData;
}

export const WildCard: React.FC<WildCardProps> = ({ data }) => {
    // Generate Observation Text
    const observationText = data.behavior || (data.description ? data.description.split('. ')[0] + '.' : null);

    return (
        <View style={styles.card}>
            {/* Full-bleed background photo */}
            {data.imageUrl ? (
                <>
                    <Image
                        source={{ uri: data.imageUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        blurRadius={40}
                        cachePolicy="memory-disk"
                    />
                    <Image
                        source={{ uri: data.imageUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                    />
                </>
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#2D3436' }]} />
            )}

            {/* Subtle top-down vignette for branding visibility */}
            <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.9)']}
                locations={[0, 0.2, 0.4, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* Top-left branding */}
            <View style={styles.topBrand}>
                <Image source={require('@/assets/images/icon.png')} style={styles.appIcon} />
                <Text style={styles.brandText}>Identified with BirdMark</Text>
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
                        <Text style={styles.metaText}>
                            {data.familyName} • {data.dateIdentified}
                        </Text>
                        {data.locationName ? (
                            <Text style={styles.metaText} numberOfLines={1}>
                                📍 {data.locationName}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* Addition: Field Observation notes for Wild card */}
                {observationText && (
                    <View style={styles.observationContainer}>
                        <Text style={styles.observationText} numberOfLines={3}>
                            {observationText}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 1080,
        height: 1350, // Updated to matches Field Guide height
        backgroundColor: '#1a1a1a',
    },
    topBrand: {
        position: 'absolute',
        top: 36,
        left: 40,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    appIcon: {
        width: 28 * 2.5,
        height: 28 * 2.5,
        borderRadius: 6 * 2.5,
    },
    brandText: {
        fontSize: 14 * 2.5,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.3,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    bottomContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 40,
        paddingBottom: 48,
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
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    metaLeft: {
        flex: 1,
        gap: 8,
    },
    metaText: {
        fontSize: 12 * 2.5,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    observationContainer: {
        marginTop: 12,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.15)',
    },
    observationText: {
        fontSize: 13 * 2.5,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 18 * 2.5,
        fontWeight: '400',
    }
});
