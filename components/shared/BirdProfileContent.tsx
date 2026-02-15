import Colors from '@/constants/Colors';
import { HABITAT_ASSETS, NESTING_ASSETS } from '@/constants/bird-assets';
import { BirdResult, BirdSound, INaturalistPhoto } from '@/types/scanner';
import { Image } from 'expo-image';
import {
    ChevronRight,
    Edit2,
    HelpCircle,
    Image as ImageIcon,
    Info,
    LayoutGrid,
    Lightbulb,
    MoreHorizontal,
    Notebook,
    Volume2,
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { OverlapAvatars } from '../common/OverlapAvatars';
import { WaveformPlayer } from '../scanner/WaveformPlayer';

const { width } = Dimensions.get('window');

interface BirdProfileContentProps {
    bird: BirdResult;
    inatPhotos?: INaturalistPhoto[];
    sounds?: BirdSound[];
    onPlaySound?: () => void;
    onImagePress?: (index: number) => void;
    onOpenTips?: () => void;
}

export const BirdProfileContent: React.FC<BirdProfileContentProps> = ({
    bird,
    inatPhotos = [],
    sounds = [],
    onPlaySound,
    onImagePress,
    onOpenTips,
}) => {
    const galleryRef = useRef<ScrollView>(null);

    // Reset gallery scroll position when bird changes
    useEffect(() => {
        galleryRef.current?.scrollTo({ x: 0, animated: false });
    }, [bird.scientific_name]);

    return (
        <View style={styles.container}>
            {/* Title & Taxonomy Section */}
            <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.mainTitle}>
                        {bird.name}
                        <Text style={styles.speciesOfText}>, a species of</Text>
                    </Text>
                    <Text style={styles.familyText}>
                        {bird.taxonomy?.family || 'N/A'}
                        {bird.taxonomy?.family_scientific && (
                            <Text style={styles.scientificFamilyText}>({bird.taxonomy.family_scientific})</Text>
                        )}
                    </Text>
                </View>
                <Pressable style={styles.editBtn}>
                    <Edit2 size={18} color="#999" />
                </Pressable>
            </View>

            <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Also known as: </Text>
                <Text style={styles.metaValue}>{bird.also_known_as?.join(', ') || 'N/A'}</Text>
            </View>

            <View style={styles.scientificNameRow}>
                <Text style={styles.scientificNameLabel}>Scientific name: </Text>
                <Text style={styles.scientificNameValue}>{bird.scientific_name}</Text>
                <Pressable style={styles.speakerBtn} onPress={onPlaySound}>
                    <Volume2 size={12} color="#FFF" />
                </Pressable>
            </View>

            <View style={styles.gutter} />

            {/* Gallery Section */}
            {(inatPhotos.length > 0 || (bird.inat_photos && bird.inat_photos.length > 0)) && (
                <View style={styles.gallerySection}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionTitleLeft}>
                            <ImageIcon size={22} color="#1A1A1A" />
                            <Text style={styles.galleryTitle}>Images of {bird.name}</Text>
                        </View>
                        <MoreHorizontal size={20} color="#999" />
                    </View>
                    <ScrollView
                        ref={galleryRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.galleryScroll}
                    >
                        {(inatPhotos.length > 0 ? inatPhotos : bird.inat_photos || []).map((photo, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.galleryItem}
                                onPress={() => onImagePress?.(idx)}
                            >
                                <Image
                                    source={{ uri: (typeof photo === 'string' ? photo : (photo as INaturalistPhoto).url) }}
                                    style={styles.galleryImage}
                                    cachePolicy="memory-disk"
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={styles.gutter} />
            <View style={styles.tipsSection}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleLeft}>
                        <Notebook size={22} color="#1A1A1A" />
                        <Text style={styles.sectionTitle}>Birding Tips</Text>
                    </View>
                    <MoreHorizontal size={20} color="#999" />
                </View>

                <View style={styles.gridContainer}>
                    {/* Full Width Tip: Diet */}
                    <TouchableOpacity style={styles.wideCard} onPress={onOpenTips}>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardLabel}>Diet</Text>
                        </View>
                        <View style={styles.cardRight}>
                            <OverlapAvatars
                                tags={[...(bird.diet_tags || []), bird.diet].filter(Boolean)}
                                type="diet"
                            />
                            <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                        </View>
                    </TouchableOpacity>

                    {/* Full Width Tip: Feeder */}
                    <TouchableOpacity style={styles.wideCard} onPress={onOpenTips}>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardLabel}>Feeder</Text>
                        </View>
                        <View style={styles.cardRight}>
                            <OverlapAvatars
                                tags={bird.feeder_info?.feeder_types || []}
                                type="feeder"
                            />
                            <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                        </View>
                    </TouchableOpacity>

                    {/* Two Column Row: Habitat & Nesting */}
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.halfCard} onPress={onOpenTips}>
                            <View style={styles.halfCardTop}>
                                <Text style={styles.cardLabel}>Habitat</Text>
                                <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} />
                            </View>
                            <View style={styles.halfCardMain}>
                                {(() => {
                                    const h = (bird.habitat_tags?.[0] || bird.habitat || '').toLowerCase();
                                    let asset = HABITAT_ASSETS.forest; // Default

                                    if (h.includes('forest') || h.includes('wood')) asset = HABITAT_ASSETS.forest;
                                    else if (h.includes('wetland') || h.includes('river') || h.includes('lake') || h.includes('water') || h.includes('marsh')) asset = HABITAT_ASSETS.wetland;
                                    else if (h.includes('grass') || h.includes('field') || h.includes('meadow') || h.includes('prairie')) asset = HABITAT_ASSETS.grassland;
                                    else if (h.includes('mountain') || h.includes('rock') || h.includes('cliff')) asset = HABITAT_ASSETS.mountain;
                                    else if (h.includes('shrub') || h.includes('scrub') || h.includes('thicket')) asset = HABITAT_ASSETS.shrub;
                                    else if (h.includes('backyard') || h.includes('urban') || h.includes('park') || h.includes('garden')) asset = HABITAT_ASSETS.backyard;

                                    return <Image source={asset} style={styles.habitatIcon} cachePolicy="memory-disk" />;
                                })()}
                                <Text style={styles.halfCardValue}>{bird.habitat_tags?.[0] || bird.habitat || 'N/A'}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.halfCard} onPress={onOpenTips}>
                            <View style={styles.halfCardTop}>
                                <Text style={styles.cardLabel}>Nesting</Text>
                                <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} />
                            </View>
                            <View style={styles.halfCardMain}>
                                {(() => {
                                    const loc = (bird.nesting_info?.location || '').toLowerCase();
                                    let asset = NESTING_ASSETS.cup;
                                    let name = 'Cup';

                                    if (loc.includes('cavity') || loc.includes('hole')) {
                                        asset = NESTING_ASSETS.cavity;
                                        name = 'Cavity';
                                    } else if (loc.includes('burrow') || loc.includes('tunnel')) {
                                        asset = NESTING_ASSETS.burrow;
                                        name = 'Burrow';
                                    } else if (loc.includes('dome') || loc.includes('spherical') || loc.includes('enclosed')) {
                                        asset = NESTING_ASSETS.dome;
                                        name = 'Dome';
                                    } else if (loc.includes('ground') || loc.includes('shrub')) {
                                        asset = NESTING_ASSETS.ground;
                                        name = 'Ground';
                                    } else if (loc.includes('platform') || loc.includes('ledge') || loc.includes('building')) {
                                        asset = NESTING_ASSETS.platform;
                                        name = 'Platform';
                                    } else if (loc.includes('scrape') || loc.includes('sand') || loc.includes('pebbles')) {
                                        asset = NESTING_ASSETS.scrape;
                                        name = 'Scrape';
                                    } else if (loc.includes('hanging') || loc.includes('pouch') || loc.includes('pendant')) {
                                        asset = NESTING_ASSETS.hanging;
                                        name = 'Hanging';
                                    } else if (loc.includes('none') || loc.includes('parasitic') || loc.includes('no nest')) {
                                        asset = NESTING_ASSETS.none;
                                        name = 'No Nest';
                                    } else if (loc.includes('tree') || loc.includes('branch') || loc.includes('cup')) {
                                        asset = NESTING_ASSETS.cup;
                                        name = 'Cup';
                                    }

                                    return (
                                        <>
                                            <Image source={asset} style={styles.habitatIcon} cachePolicy="memory-disk" />
                                            <Text style={styles.halfCardValue}>{name}</Text>
                                        </>
                                    );
                                })()}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Differences Row */}
                    <TouchableOpacity style={styles.listItem} onPress={onOpenTips}>
                        <View style={styles.listItemLeft}>
                            <LayoutGrid size={20} color="#FF6B35" />
                            <Text style={styles.listItemText}>Male-female differences</Text>
                        </View>
                        <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} />
                    </TouchableOpacity>

                    {/* Insight Tip */}
                    <TouchableOpacity style={styles.insightCard} onPress={onOpenTips}>
                        <View style={styles.insightIconWrapper}>
                            <Lightbulb size={20} color="#FFD166" />
                        </View>
                        <Text style={styles.insightText} numberOfLines={2}>
                            {bird.fact || bird.description}
                        </Text>
                        <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Sound Section */}
            {sounds.length > 0 && (
                <>
                    <View style={styles.gutter} />
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionTitleLeft}>
                                <Volume2 size={22} color="#1A1A1A" />
                                <Text style={styles.sectionTitle}>Sounds</Text>
                            </View>
                            <MoreHorizontal size={20} color="#999" />
                        </View>

                        {/* Songs */}
                        {sounds.filter(s => s.type === 'song').length > 0 && (
                            <View style={{ marginBottom: 8 }}>
                                <View style={styles.subHeaderRow}>
                                    <Text style={styles.subHeaderTitle}>Song</Text>
                                    <HelpCircle size={16} color="#666" style={{ marginLeft: 6 }} />
                                </View>
                                {sounds.filter(s => s.type === 'song').map((sound) => (
                                    <WaveformPlayer key={sound.id} sound={sound} />
                                ))}
                            </View>
                        )}

                        {/* Calls */}
                        {sounds.filter(s => s.type === 'call').length > 0 && (
                            <View style={{ marginBottom: 8 }}>
                                <View style={styles.subHeaderRow}>
                                    <Text style={styles.subHeaderTitle}>Call</Text>
                                    <HelpCircle size={16} color="#666" style={{ marginLeft: 6 }} />
                                </View>
                                {sounds.filter(s => s.type === 'call').map((sound) => (
                                    <WaveformPlayer key={sound.id} sound={sound} />
                                ))}
                            </View>
                        )}

                        <Text style={styles.disclaimerText}>
                            * Please note that same bird species can sound different due to dialect or mimicry.
                        </Text>
                    </View>
                </>
            )}

            {/* Facts Section */}
            <View style={styles.gutter} />
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleLeft}>
                        <Info size={22} color="#1A1A1A" />
                        <Text style={styles.sectionTitle}>Facts</Text>
                    </View>
                </View>
                <Text style={styles.descriptionText}>{bird.description}</Text>
            </View>

            {/* Habits Section */}
            {bird.behavior && (
                <>
                    <View style={styles.gutter} />
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionTitleLeft}>
                                <Lightbulb size={22} color="#1A1A1A" />
                                <Text style={styles.sectionTitle}>Habits</Text>
                            </View>
                        </View>
                        <Text style={styles.descriptionText}>{bird.behavior}</Text>
                    </View>
                </>
            )}

            {/* Distribution Area Section */}
            {bird.distribution_area && (
                <>
                    <View style={styles.gutter} />
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionTitleLeft}>
                                <LayoutGrid size={22} color="#1A1A1A" />
                                <Text style={styles.sectionTitle}>Distribution Area</Text>
                            </View>
                        </View>
                        <Text style={styles.descriptionText}>{bird.distribution_area}</Text>
                    </View>
                </>
            )}

            {/* Scientific Classification Section */}
            <View style={styles.gutter} />
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleLeft}>
                        <Notebook size={22} color="#1A1A1A" />
                        <Text style={styles.sectionTitle}>Scientific Classification</Text>
                    </View>
                </View>

                <View style={styles.classificationCard}>
                    <View style={styles.classificationRow}>
                        <Text style={styles.classificationLabel}>Order</Text>
                        <Text style={styles.classificationValue}>{bird.taxonomy?.order || 'N/A'}</Text>
                    </View>
                    <View style={styles.classificationDivider} />
                    <View style={styles.classificationRow}>
                        <Text style={styles.classificationLabel}>Family</Text>
                        <View style={styles.classificationValueContainer}>
                            <Text style={styles.classificationValue}>{bird.taxonomy?.family || 'N/A'}</Text>
                            {bird.taxonomy?.family_scientific && (
                                <Text style={styles.classificationScientific}>({bird.taxonomy.family_scientific})</Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.classificationDivider} />
                    <View style={styles.classificationRow}>
                        <Text style={styles.classificationLabel}>Genus</Text>
                        <View style={styles.classificationValueContainer}>
                            <Text style={styles.classificationValue}>{bird.taxonomy?.genus || 'N/A'}</Text>
                            {bird.taxonomy?.genus_description && (
                                <Text style={styles.classificationDescription}>{bird.taxonomy.genus_description}</Text>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.factCard}>
                <Info color={Colors.light.tint} size={24} />
                <View style={styles.factContent}>
                    <Text style={styles.factTitle}>Did you know?</Text>
                    <Text style={styles.factText}>{bird.fact}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 0, // Parent handles padding if needed
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingHorizontal: 12,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#000',
        letterSpacing: -0.5,
    },
    speciesOfText: {
        fontSize: 16,
        fontWeight: '400',
        color: '#666',
    },
    familyText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginTop: 2,
    },
    scientificFamilyText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#999',
        fontStyle: 'italic',
    },
    editBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        paddingHorizontal: 12,
    },
    metaLabel: {
        fontSize: 15,
        color: '#999',
    },
    metaValue: {
        fontSize: 15,
        fontWeight: '400',
        color: '#1A1A1A',
    },
    scientificNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 0,
        marginBottom: 12,
    },
    scientificNameLabel: {
        fontSize: 15,
        color: '#999',
    },
    scientificNameValue: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1A1A1A',
        fontStyle: 'italic',
    },
    gutter: {
        height: 12,
        backgroundColor: '#F2F2F2',
        marginHorizontal: 0,
        marginBottom: 16,
    },
    speakerBtn: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#D4A373',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    gallerySection: {
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    galleryTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        marginLeft: 10,
    },
    sectionTitleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    galleryScroll: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    galleryItem: {
        width: 128,
        aspectRatio: 0.8,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 12,
        backgroundColor: '#f1f5f9',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    tipsSection: {
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        marginLeft: 10,
    },
    gridContainer: {
        gap: 12,
        marginTop: 8,
    },
    wideCard: {
        flexDirection: 'row',
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 94,
    },
    cardContent: {
        gap: 4,
    },
    cardLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    cardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfCard: {
        flex: 1,
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        padding: 16,
        minHeight: 150,
    },
    halfCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    halfCardMain: {
        alignItems: 'center',
        gap: 12,
    },
    halfCardValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    listItem: {
        flexDirection: 'row',
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    listItemText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    insightCard: {
        flexDirection: 'row',
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        gap: 12,
    },
    insightIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF1E6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightText: {
        flex: 1,
        fontSize: 15,
        color: '#444',
        lineHeight: 20,
    },
    section: {
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    descriptionText: {
        fontSize: 16,
        color: '#333333',
        lineHeight: 24,
    },
    factCard: {
        backgroundColor: '#fefae0',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9edc9',
        marginHorizontal: 16,
        marginBottom: 32,
    },
    factContent: {
        flex: 1,
    },
    factTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 6,
    },
    factText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333333',
    },
    habitatIcon: {
        width: 64,
        height: 64,
        resizeMode: 'contain',
        marginVertical: 4,
    },
    classificationCard: {
        backgroundColor: '#EFEFEF',
        borderRadius: 8,
        padding: 16,
    },
    classificationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 8,
    },
    classificationDivider: {
        height: 1,
        backgroundColor: '#D1D1D1',
        marginVertical: 4,
    },
    classificationLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        flex: 1,
    },
    classificationValueContainer: {
        flex: 2,
        alignItems: 'flex-end',
    },
    classificationValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        textAlign: 'right',
    },
    classificationScientific: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#666',
        marginTop: 2,
        textAlign: 'right',
    },
    classificationDescription: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
        textAlign: 'right',
        lineHeight: 18,
    },
    subHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 4,
    },
    subHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    disclaimerText: {
        fontSize: 13,
        color: '#888',
        fontStyle: 'italic',
        marginTop: 8,
        lineHeight: 18,
    },
});
