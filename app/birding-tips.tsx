import { DIET_ASSETS, FEEDER_ASSETS, HABITAT_ASSETS, NESTING_ASSETS } from '@/constants/bird-assets';
import { BirdResult } from '@/types/scanner';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Lightbulb } from 'lucide-react-native';
import React from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function BirdingTipsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ birdData: string }>();
    const bird = JSON.parse(params.birdData as string) as BirdResult;

    const renderAssetGrid = (title: string, tags: string[], assetMap: Record<string, any>) => {
        if (!tags || tags.length === 0) return null;

        // Resolve assets and filter out duplicates
        const resolvedItems: { tag: string; asset: any }[] = [];
        const seenAssets = new Set();

        tags.forEach(tag => {
            const normalizedTag = tag.toLowerCase().trim();
            let asset = assetMap[normalizedTag];

            if (!asset) {
                const key = Object.keys(assetMap).find(k => normalizedTag.includes(k) || k.includes(normalizedTag));
                if (key) asset = assetMap[key];
            }

            // Only add if we haven't seen this asset yet, or if there's no asset (placeholder case)
            if (!asset || !seenAssets.has(asset)) {
                resolvedItems.push({ tag, asset });
                if (asset) seenAssets.add(asset);
            }
        });

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGrid}>
                    {resolvedItems.map((item, index) => (
                        <View key={index} style={styles.gridItem}>
                            <View style={styles.assetWrapper}>
                                {item.asset ? (
                                    <Image source={item.asset} style={styles.assetImage} />
                                ) : (
                                    <View style={[styles.assetImage, styles.placeholderAsset]}>
                                        <Text style={styles.placeholderText}>{item.tag.substring(0, 1).toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.assetLabel} numberOfLines={2}>{item.tag}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const getHabitatIcon = () => {
        const h = (bird.habitat_tags?.[0] || bird.habitat || '').toLowerCase();
        if (h.includes('forest') || h.includes('wood')) return HABITAT_ASSETS.forest;
        if (h.includes('wetland') || h.includes('river') || h.includes('lake')) return HABITAT_ASSETS.wetland;
        if (h.includes('grass') || h.includes('field') || h.includes('meadow')) return HABITAT_ASSETS.grassland;
        if (h.includes('mountain') || h.includes('rock')) return HABITAT_ASSETS.mountain;
        if (h.includes('shrub') || h.includes('scrub')) return HABITAT_ASSETS.shrub;
        if (h.includes('backyard') || h.includes('urban') || h.includes('park')) return HABITAT_ASSETS.backyard;
        return HABITAT_ASSETS.forest;
    };

    const getNestingIcon = () => {
        const loc = (bird.nesting_info?.location || '').toLowerCase();
        if (loc.includes('cavity') || loc.includes('hole')) return NESTING_ASSETS.cavity;
        if (loc.includes('burrow') || loc.includes('tunnel')) return NESTING_ASSETS.burrow;
        if (loc.includes('dome') || loc.includes('spherical') || loc.includes('enclosed')) return NESTING_ASSETS.dome;
        if (loc.includes('ground') || loc.includes('shrub')) return NESTING_ASSETS.ground;
        if (loc.includes('platform') || loc.includes('ledge') || loc.includes('building')) return NESTING_ASSETS.platform;
        if (loc.includes('scrape') || loc.includes('sand') || loc.includes('pebbles')) return NESTING_ASSETS.scrape;
        if (loc.includes('hanging') || loc.includes('pouch') || loc.includes('pendant')) return NESTING_ASSETS.hanging;
        if (loc.includes('none') || loc.includes('parasitic') || loc.includes('no nest')) return NESTING_ASSETS.none;
        if (loc.includes('tree') || loc.includes('branch') || loc.includes('cup')) return NESTING_ASSETS.cup;
        return NESTING_ASSETS.cup;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft color="#333" size={24} strokeWidth={2.5} />
                </Pressable>
                <Text style={styles.headerTitle}>Birding Tips</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Diet Section */}
                {renderAssetGrid('Diet', bird.diet_tags || [bird.diet], DIET_ASSETS)}

                {/* Feeder Section */}
                {renderAssetGrid('Feeder', bird.feeder_info?.feeder_types || [], FEEDER_ASSETS)}

                {/* Backyard Birding Tips Card */}
                <View style={styles.tipCard}>
                    <Text style={styles.tipCardTitle}>Backyard Birding Tips</Text>
                    <Text style={styles.tipCardText}>
                        {bird.behavior || `Offer preferred foods in appropriate feeders to entice ${bird.name}. Provide a water source for drinking and bathing to create a conducive habitat.`}
                    </Text>
                </View>

                {/* Habitat Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Habitat</Text>
                    <View style={styles.habitatIconContainer}>
                        <Image source={getHabitatIcon()} style={styles.habitatLargeIcon} />
                        <Text style={styles.habitatName}>{bird.habitat_tags?.[0] || bird.habitat || 'N/A'}</Text>
                    </View>
                    <Text style={styles.habitatDescription}>
                        {bird.taxonomy?.genus_description || bird.description}
                    </Text>
                </View>

                {/* Finding Tips Card */}
                <View style={styles.tipCard}>
                    <Text style={styles.tipCardTitle}>Finding Tips</Text>
                    <Text style={styles.tipCardText}>
                        {`Spot ${bird.name} in their preferred habitats. Listen for distinct calls and look for movement in the foliage. They are best observed during early morning or late afternoon when they are most active. Recognize their flight by the flash of colors.`}
                    </Text>
                </View>

                {/* Nesting Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Nesting</Text>
                    <View style={styles.habitatIconContainer}>
                        <Image source={getNestingIcon()} style={styles.habitatLargeIcon} />
                        <Text style={styles.habitatName}>{bird.nesting_info?.location || bird.habitat || 'N/A'}</Text>
                    </View>
                    <Text style={styles.habitatDescription}>
                        {bird.nesting_info?.description || `${bird.name}'s nests are often located in protected locations, surrounded by dense foliage. Common trees and shrubs are used to provide shelter and security.`}
                    </Text>
                </View>

                {/* Gender Identification Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>How to ID between gender?</Text>
                    <View style={styles.genderRow}>
                        <View style={styles.genderItem}>
                            <View style={styles.genderImageContainer}>
                                {(() => {
                                    const img = bird.male_image_url || bird.images?.[0] || bird.inat_photos?.[0]?.url;
                                    return img ? (
                                        <Image source={{ uri: img }} style={styles.genderImage} />
                                    ) : (
                                        <View style={[styles.genderImage, styles.placeholderAsset]} />
                                    );
                                })()}
                                <View style={styles.genderLabelBadge}>
                                    <Text style={styles.genderLabelText}>Male</Text>
                                </View>
                            </View>
                            <Text style={styles.genderName}>Male</Text>
                            <Text style={styles.genderDesc}>{bird.identification_tips?.male || 'N/A'}</Text>
                        </View>
                        <View style={styles.genderItem}>
                            <View style={styles.genderImageContainer}>
                                {(() => {
                                    const img = bird.female_image_url || bird.images?.[1] || bird.inat_photos?.[1]?.url;
                                    return img ? (
                                        <Image source={{ uri: img }} style={styles.genderImage} />
                                    ) : (
                                        <View style={[styles.genderImage, styles.placeholderAsset]} />
                                    );
                                })()}
                                <View style={styles.genderLabelBadge}>
                                    <Text style={styles.genderLabelText}>Female</Text>
                                </View>
                            </View>
                            <Text style={styles.genderName}>Female</Text>
                            <Text style={styles.genderDesc}>{bird.identification_tips?.female || 'N/A'}</Text>
                        </View>
                    </View>
                </View>

                {/* Fun Facts Section */}
                <View style={[styles.section, { marginBottom: 60 }]}>
                    <Text style={styles.sectionTitle}>Fun Facts</Text>
                    <View style={styles.funFactCard}>
                        <View style={styles.funFactIconWrapper}>
                            <Lightbulb size={24} color="#FFD166" fill="#FFD166" />
                        </View>
                        <Text style={styles.funFactTitleText}>{bird.fact}</Text>
                    </View>
                    <Text style={styles.funFactFullText}>
                        {bird.behavior || bird.description}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F2',
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        letterSpacing: -0.3,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 16,
        marginTop: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#444',
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    horizontalGrid: {
        paddingRight: 16,
    },
    gridItem: {
        width: (width - 64) / 3,
        marginRight: 12,
        alignItems: 'flex-start',
    },
    assetWrapper: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        marginBottom: 8,
    },
    assetImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderAsset: {
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 24,
        color: '#94a3b8',
        fontWeight: '700',
    },
    assetLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#666',
        lineHeight: 16,
        textAlign: 'left',
    },
    tipCard: {
        backgroundColor: '#F2F2F2',
        borderRadius: 4,
        paddingHorizontal: 18,
        paddingVertical: 8,
        marginHorizontal: 16,
        marginTop: 12,
    },
    tipCardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#666',
        marginBottom: 4,
    },
    tipCardText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
    },
    habitatIconContainer: {
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    habitatLargeIcon: {
        width: 84,
        height: 84,
        resizeMode: 'contain',
        marginBottom: 8,
    },
    habitatName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
    },
    habitatDescription: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        marginTop: 8,
    },
    nestingIconPlaceholder: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    genderRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    genderItem: {
        flex: 1,
    },
    genderImageContainer: {
        width: '100%',
        aspectRatio: 1.1,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
    },
    genderImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    genderLabelBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    genderLabelText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    genderName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#E67E22',
        marginTop: 12,
        marginBottom: 4,
    },
    genderDesc: {
        fontSize: 15,
        lineHeight: 22,
        color: '#333',
    },
    funFactCard: {
        backgroundColor: '#F2F2F2',
        borderRadius: 4,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 10,
    },
    funFactIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF4E6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    funFactTitleText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        lineHeight: 22,
    },
    funFactFullText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
    },
});
