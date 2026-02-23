import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface ShareCardData {
    name: string;
    scientificName: string;
    familyName: string;
    confidence: number;
    dateIdentified: string;
    locationName?: string;
    imageUrl?: string;
}

interface MagazineCardProps {
    data: ShareCardData;
}

export const MagazineCard: React.FC<MagazineCardProps> = ({ data }) => {
    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Image source={require('@/assets/images/icon.png')} style={styles.appIcon} />
                    <Text style={styles.logoText}>Identified with BirdSnap</Text>
                </View>
            </View>

            {/* Bird Photo */}
            <View style={styles.photoContainer}>
                {data.imageUrl ? (
                    <Image
                        source={{ uri: data.imageUrl }}
                        style={styles.photo}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]}>
                        <Text style={styles.placeholderEmoji}>🐦</Text>
                    </View>
                )}
            </View>

            {/* Bottom Info Section */}
            <View style={styles.infoSection}>
                <Text style={styles.commonName} numberOfLines={1}>
                    {data.name}
                </Text>
                <Text style={styles.scientificName} numberOfLines={1}>
                    {data.scientificName}
                </Text>
                <Text style={styles.familyName} numberOfLines={1}>
                    {data.familyName}
                </Text>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                    <View style={styles.metaLeft}>
                        <Text style={styles.metaText}>
                            {data.dateIdentified}
                        </Text>
                        {data.locationName ? (
                            <Text style={styles.metaText} numberOfLines={1}>
                                📍 {data.locationName}
                            </Text>
                        ) : null}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 1080,
        height: 1080,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 40,
        paddingTop: 36,
        paddingBottom: 20,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    appIcon: {
        width: 20 * 2.5,
        height: 20 * 2.5,
        borderRadius: 4 * 2.5,
    },
    logoText: {
        fontSize: 14 * 2.5,
        fontWeight: '700',
        color: '#F97316',
        letterSpacing: -0.3,
    },
    photoContainer: {
        width: 1080,
        height: 1080 * 0.58, // Increased photo height slightly
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
        paddingTop: 16, // Moved text up
        paddingBottom: 24,
        justifyContent: 'flex-start', // Top align
    },
    commonName: {
        fontSize: 24 * 2.5,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    scientificName: {
        fontSize: 14 * 2.5,
        fontStyle: 'italic',
        color: '#666666',
        marginBottom: 6,
    },
    familyName: {
        fontSize: 13 * 2.5,
        fontWeight: '600',
        color: '#F97316',
        marginBottom: 12,
    },
    divider: {
        height: 1.5,
        backgroundColor: '#EEEEEE',
        marginBottom: 14,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    metaLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    metaText: {
        fontSize: 12 * 2.5,
        color: '#999999',
    },
});
