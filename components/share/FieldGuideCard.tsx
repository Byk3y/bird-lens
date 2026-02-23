import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShareCardData } from './MagazineCard';

interface FieldGuideCardProps {
    data: ShareCardData;
}

export const FieldGuideCard: React.FC<FieldGuideCardProps> = ({ data }) => {
    const confidencePercent = Math.round(data.confidence * 100);

    return (
        <View style={styles.card}>
            {/* Orange Header Bar */}
            <View style={styles.headerBar}>
                <Text style={styles.headerLeft}>🐦 BirdSnap Field Guide</Text>
                <Text style={styles.headerRight}>{data.dateIdentified}</Text>
            </View>

            {/* Content Area: Photo + Details side by side */}
            <View style={styles.contentArea}>
                {/* Left: Photo */}
                <View style={styles.photoSide}>
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

                {/* Right: Details */}
                <View style={styles.detailsSide}>
                    <Text style={styles.commonName} numberOfLines={2}>
                        {data.name}
                    </Text>
                    <Text style={styles.scientificName} numberOfLines={1}>
                        {data.scientificName}
                    </Text>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Family</Text>
                        <Text style={styles.detailValue} numberOfLines={1}>
                            {data.familyName}
                        </Text>
                    </View>

                    {data.locationName ? (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>📍 Location</Text>
                            <Text style={styles.detailValue} numberOfLines={2}>
                                {data.locationName}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>

            {/* Bottom Confidence Bar */}
            <View style={styles.bottomSection}>
                <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceLabel}>
                        Confidence: {confidencePercent}%
                    </Text>
                    <View style={styles.confidenceBarBg}>
                        <View
                            style={[
                                styles.confidenceBarFill,
                                { width: `${confidencePercent}%` },
                            ]}
                        />
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
        backgroundColor: '#FAFAF7',
    },
    headerBar: {
        backgroundColor: '#F97316',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 28,
    },
    headerLeft: {
        fontSize: 14 * 2.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerRight: {
        fontSize: 13 * 2.5,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    contentArea: {
        flex: 1,
        flexDirection: 'row',
        padding: 36,
        gap: 32,
    },
    photoSide: {
        width: '45%',
        aspectRatio: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        backgroundColor: '#EEEEEE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 60,
    },
    detailsSide: {
        flex: 1,
        justifyContent: 'center',
        gap: 8,
    },
    commonName: {
        fontSize: 16 * 2.5,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    scientificName: {
        fontSize: 13 * 2.5,
        fontStyle: 'italic',
        color: '#666666',
        marginBottom: 16,
    },
    detailRow: {
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 11 * 2.5,
        fontWeight: '600',
        color: '#999999',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 12 * 2.5,
        fontWeight: '600',
        color: '#333333',
    },
    bottomSection: {
        paddingHorizontal: 40,
        paddingBottom: 32,
        paddingTop: 8,
    },
    confidenceContainer: {
        marginBottom: 12,
    },
    confidenceLabel: {
        fontSize: 13 * 2.5,
        fontWeight: '700',
        color: '#333333',
        marginBottom: 10,
    },
    confidenceBarBg: {
        height: 18,
        backgroundColor: '#E8E8E4',
        borderRadius: 9,
        overflow: 'hidden',
    },
    confidenceBarFill: {
        height: '100%',
        backgroundColor: '#F97316',
        borderRadius: 9,
    },
    watermark: {
        fontSize: 10 * 2.5,
        color: '#CCCCCC',
        textAlign: 'right',
        marginTop: 8,
    },
});
