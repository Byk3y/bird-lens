import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ShareCardData } from './MagazineCard';

interface FieldGuideCardProps {
    data: ShareCardData;
}

export const FieldGuideCard: React.FC<FieldGuideCardProps> = ({ data }) => {
    // Generate Observation Text
    const observationText = data.behavior || (data.description ? data.description.split('. ')[0] + '.' : null);

    // Determine Badge Color based on Rarity String
    const getBadgeColor = (rarity?: string) => {
        if (!rarity) return '#666';
        const rText = rarity.toLowerCase();
        if (rText.includes('rare') || rText.includes('endangered') || rText.includes('vulnerable')) {
            return '#EAB308'; // Premium Gold for rare notes
        }
        if (rText.includes('uncommon') || rText.includes('near')) {
            return '#3B82F6'; // Blue
        }
        return '#22C55E'; // Green for common
    };

    const tags = [
        ...(data.habitat_tags || []).map(t => ({ text: t, type: 'habitat' })),
        ...(data.diet_tags || []).map(t => ({ text: t, type: 'diet' }))
    ].slice(0, 5); // Max 5 tags

    return (
        <View style={styles.card}>
            {/* Orange Header Bar */}
            <View style={styles.headerBar}>
                <View style={styles.headerLogoRow}>
                    <ExpoImage source={require('@/assets/images/icon.png')} style={styles.appIcon} />
                    <Text style={styles.headerLeft}>Identified with BirdMark</Text>
                </View>
                <Text style={styles.headerRight}>{data.dateIdentified}</Text>
            </View>

            {/* Content Area: Vertical Stack */}
            <View style={styles.contentArea}>
                {/* Top: Large Hero Photo (Full Bleed feeling inside padding) */}
                <View style={styles.heroImageContainer}>
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
                                contentFit="contain" // Contain ensures the whole bird is visible
                                cachePolicy="memory-disk"
                            />
                        </>
                    ) : (
                        <View style={[styles.photo, styles.photoPlaceholder]}>
                            <Text style={styles.placeholderEmoji}>🐦</Text>
                        </View>
                    )}

                    {/* Floating Rarity Badge */}
                    {data.rarity && (
                        <View style={[styles.rarityBadge, { backgroundColor: getBadgeColor(data.rarity) }]}>
                            <Text style={styles.rarityText}>{data.rarity.toUpperCase()}</Text>
                        </View>
                    )}
                </View>

                {/* Bottom: Naturalist Details */}
                <View style={styles.detailsSide}>
                    <View style={styles.identitySection}>
                        <View style={styles.nameRow}>
                            <Text style={styles.commonName} numberOfLines={1}>
                                {data.name}
                            </Text>
                            {data.locationName && (
                                <View style={styles.locationBadge}>
                                    <Text style={styles.locationIcon}>📍</Text>
                                    <Text style={styles.locationText} numberOfLines={1}>{data.locationName}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.scientificName} numberOfLines={1}>
                            {data.scientificName}
                        </Text>
                    </View>

                    {/* Taxonomy & Tag Cloud Flex Row */}
                    <View style={styles.metadataRow}>
                        <View style={styles.taxonomyCol}>
                            <Text style={styles.detailLabel}>FAMILY</Text>
                            <Text style={styles.detailValue} numberOfLines={1}>{data.familyName}</Text>
                        </View>
                        <View style={styles.taxonomyCol}>
                            {data.orderName && (
                                <>
                                    <Text style={styles.detailLabel}>ORDER</Text>
                                    <Text style={styles.detailValue} numberOfLines={1}>{data.orderName}</Text>
                                </>
                            )}
                        </View>
                    </View>

                    {tags.length > 0 && (
                        <View style={styles.tagCloud}>
                            {tags.map((tag, i) => (
                                <View key={i} style={styles.tag}>
                                    <Text style={styles.tagText}>
                                        {tag.type === 'habitat' ? '🌲 ' : '🦗 '}
                                        {tag.text}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Field Observation / Behavior */}
                    {observationText ? (
                        <View style={styles.noteSection}>
                            <Text style={styles.detailLabel}>FIELD OBSERVATION</Text>
                            <View style={styles.noteContainer}>
                                <Text style={styles.noteText} numberOfLines={6}>
                                    {observationText}
                                </Text>
                                <LinearGradient
                                    colors={['rgba(252, 252, 250, 0)', 'rgba(252, 252, 250, 1)']}
                                    style={styles.fadeOverlay}
                                />
                            </View>
                        </View>
                    ) : null}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 1080,
        height: 1350,   // 4:5 Portrait Ratio
        backgroundColor: '#FCFCFA', // Natural paper tone
    },
    headerBar: {
        backgroundColor: '#F97316',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 28,
    },
    headerLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    appIcon: {
        width: 28 * 2.5,
        height: 28 * 2.5,
        borderRadius: 6 * 2.5,
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
        flexDirection: 'column',
    },
    heroImageContainer: {
        width: '100%',
        height: 720, // Huge Hero Photo for the Wow Factor
        backgroundColor: '#1E1E1E',
        position: 'relative',
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
        fontSize: 80,
    },
    rarityBadge: {
        position: 'absolute',
        top: 32,
        right: 32,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    rarityText: {
        color: '#FFFFFF',
        fontSize: 12 * 2.5,
        fontWeight: '800',
        letterSpacing: 2,
    },
    detailsSide: {
        flex: 1,
        padding: 48,
        justifyContent: 'flex-start',
    },
    identitySection: {
        marginBottom: 24,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    commonName: {
        fontSize: 22 * 2.5,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: -0.5,
        flexShrink: 1,
        marginRight: 16,
    },
    scientificName: {
        fontSize: 15 * 2.5,
        fontStyle: 'italic',
        color: '#666666',
        letterSpacing: 0.2,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
    },
    locationIcon: {
        fontSize: 12 * 2.5,
        marginRight: 8,
    },
    locationText: {
        fontSize: 12 * 2.5,
        color: '#374151',
        fontWeight: '600',
    },
    metadataRow: {
        flexDirection: 'row',
        marginBottom: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    taxonomyCol: {
        flex: 1,
        gap: 6,
    },
    detailLabel: {
        fontSize: 11 * 2.5,
        fontWeight: '700',
        color: '#F97316',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    detailValue: {
        fontSize: 14 * 2.5,
        fontWeight: '600',
        color: '#333333',
    },
    tagCloud: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32,
    },
    tag: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    tagText: {
        fontSize: 12 * 2.5,
        color: '#4F46E5',
        fontWeight: '600',
    },
    noteSection: {
        flex: 1,
        gap: 12,
    },
    noteContainer: {
        position: 'relative',
        overflow: 'hidden',
    },
    noteText: {
        fontSize: 14 * 2.5,
        color: '#4B5563',
        lineHeight: 22 * 2.5,
        fontWeight: '400',
    },
    fadeOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
});
