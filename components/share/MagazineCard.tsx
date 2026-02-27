import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface ShareCardData {
    name: string;
    scientificName: string;
    familyName: string;
    orderName?: string;
    confidence: number;
    dateIdentified: string;
    locationName?: string;
    imageUrl?: string;
    description?: string;
    rarity?: string;
    habitat_tags?: string[];
    diet_tags?: string[];
    behavior?: string;
}

interface MagazineCardProps {
    data: ShareCardData;
}

export const MagazineCard: React.FC<MagazineCardProps> = ({ data }) => {
    // Generate Observation Text
    const observationText = data.behavior || (data.description ? data.description.split('. ')[0] + '.' : null);

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <ExpoImage source={require('@/assets/images/icon.png')} style={styles.appIcon} />
                    <Text style={styles.logoText}>Identified with BirdSnap</Text>
                </View>
                <Text style={styles.headerDate}>{data.dateIdentified}</Text>
            </View>

            {/* Bird Photo */}
            <View style={styles.photoContainer}>
                {data.imageUrl ? (
                    <>
                        <ExpoImage
                            source={{ uri: data.imageUrl }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            blurRadius={40}
                            cachePolicy="memory-disk"
                        />
                        <ExpoImage
                            source={{ uri: data.imageUrl }}
                            style={styles.photo}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                        />
                    </>
                ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]}>
                        <Text style={styles.placeholderEmoji}>🐦</Text>
                    </View>
                )}
            </View>

            {/* Bottom Info Section with Subtle Gradient */}
            <LinearGradient
                colors={['#FFFFFF', '#F9F8F4']}
                style={styles.infoSection}
            >
                <View style={styles.titleRow}>
                    <View style={styles.titleLeft}>
                        <Text style={styles.commonName} numberOfLines={1}>
                            {data.name}
                        </Text>
                        <Text style={styles.scientificName} numberOfLines={1}>
                            {data.scientificName}
                        </Text>
                    </View>
                    {data.locationName && (
                        <View style={styles.locationBadge}>
                            <Text style={styles.locationText} numberOfLines={1}>
                                📍 {data.locationName}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.taxonomyRow}>
                    <Text style={styles.taxonomyItem}>
                        Family: <Text style={styles.taxonomyValue}>{data.familyName}</Text>
                    </Text>
                    {data.orderName && (
                        <Text style={styles.taxonomyItem}>
                            Order: <Text style={styles.taxonomyValue}>{data.orderName}</Text>
                        </Text>
                    )}
                </View>

                {/* Addition: Field Observation notes for Magazine card */}
                {observationText && (
                    <View style={styles.observationBox}>
                        <Text style={styles.observationLabel}>Field Observation</Text>
                        <Text style={styles.observationText} numberOfLines={4}>
                            {observationText}
                        </Text>
                    </View>
                )}
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 1080,
        height: 1350, // Updated to match Field Guide height
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 16,
        borderBottomColor: '#F97316',
    },
    header: {
        paddingHorizontal: 40,
        paddingTop: 36,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    appIcon: {
        width: 28 * 2.5,
        height: 28 * 2.5,
        borderRadius: 6 * 2.5,
    },
    logoText: {
        fontSize: 14 * 2.5,
        fontWeight: '700',
        color: '#F97316',
        letterSpacing: -0.3,
    },
    headerDate: {
        fontSize: 12 * 2.5,
        color: '#666666',
        fontWeight: '700',
    },
    photoContainer: {
        width: 1080,
        height: 1080 * 0.7, // Increased from 0.58 to fill more space
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        backgroundColor: '#F3F3F3',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 80,
    },
    infoSection: {
        flex: 1,
        paddingHorizontal: 40,
        paddingTop: 32,
        paddingBottom: 32,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        gap: 20,
    },
    titleLeft: {
        flex: 1,
    },
    commonName: {
        fontSize: 24 * 2.5,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    scientificName: {
        fontSize: 16 * 2.5,
        fontStyle: 'italic',
        color: '#555555',
    },
    locationBadge: {
        backgroundColor: '#FDF2F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        maxWidth: '35%',
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.1)',
    },
    locationText: {
        fontSize: 11 * 2.5,
        color: '#F97316',
        fontWeight: '600',
    },
    taxonomyRow: {
        flexDirection: 'row',
        gap: 32,
        marginBottom: 28,
    },
    taxonomyItem: {
        fontSize: 13 * 2.5,
        fontWeight: '500',
        color: '#999999',
    },
    taxonomyValue: {
        fontWeight: '700',
        color: '#1a1a1a',
    },
    observationBox: {
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: 24,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#F97316',
    },
    observationLabel: {
        fontSize: 12 * 2.5,
        fontWeight: '700',
        color: '#F97316',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    observationText: {
        fontSize: 13 * 2.5,
        color: '#444444',
        lineHeight: 18 * 2.5,
        fontWeight: '400',
    },
});
