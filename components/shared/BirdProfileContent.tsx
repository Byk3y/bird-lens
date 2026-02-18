import Colors from '@/constants/Colors';
import { HABITAT_ASSETS, NESTING_ASSETS } from '@/constants/bird-assets';
import { BirdResult, BirdSound, INaturalistPhoto } from '@/types/scanner';
import { Image } from 'expo-image';
import {
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Edit2,
    FileText,
    HelpCircle,
    Image as ImageIcon,
    Info,
    LayoutGrid,
    Leaf,
    Lightbulb,
    MoreHorizontal,
    Notebook,
    Volume2,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
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
    onOpenIdentification?: () => void;
}

const BIRD_COLOR_MAP: Record<string, string> = {
    'Black': '#1A1A1A',
    'White': '#FFFFFF',
    'Gray': '#8E8E93',
    'Grey': '#8E8E93',
    'Brown': '#8B4513',
    'Red': '#FF3B30',
    'Blue': '#007AFF',
    'Yellow': '#FFCC00',
    'Green': '#4CD964',
    'Orange': '#FF9500',
    'Pink': '#FF2D55',
    'Purple': '#AF52DE',
    'Rufous': '#A84E32',
    'Buff': '#F0DC82',
    'Olive': '#808000',
};

const getRarityColor = (rarity: string) => {
    const low = rarity.toLowerCase();
    if (low.includes('common')) return '#4CD964';
    if (low.includes('uncommon')) return '#FF9500';
    if (low.includes('rare')) return '#FF3B30';
    if (low.includes('extinct')) return '#000000';
    return '#8E8E93';
};

const getBirdColor = (color: string) => {
    return BIRD_COLOR_MAP[color] || '#8E8E93';
};

export const BirdProfileContent: React.FC<BirdProfileContentProps> = ({
    bird,
    inatPhotos = [],
    sounds = [],
    onPlaySound,
    onImagePress,
    onOpenTips,
    onOpenIdentification,
}) => {
    const galleryRef = useRef<ScrollView>(null);
    const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
    const [isFactsExpanded, setIsFactsExpanded] = useState(false);
    const [isClassificationExpanded, setIsClassificationExpanded] = useState(false);

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
                            <Text style={styles.scientificFamilyText}> ({bird.taxonomy.family_scientific})</Text>
                        )}
                    </Text>
                    {bird.taxonomy?.order && (
                        <Text style={styles.orderText}>
                            Order: <Text style={styles.orderValue}>{bird.taxonomy.order}</Text>
                        </Text>
                    )}
                </View>
                <Pressable style={styles.editBtn}>
                    <Edit2 size={18} color="#999" />
                </Pressable>
            </View>
            <View style={styles.scientificNameRow}>
                <View style={styles.metaContainer}>
                    {bird.scientific_name && (
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Scientific name: </Text>
                            <Text style={[styles.metaValue, { fontStyle: 'italic' }]}>{bird.scientific_name}</Text>
                        </View>
                    )}
                    {bird.also_known_as && bird.also_known_as.length > 0 && (
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Also known as: </Text>
                            <Text style={styles.metaValue}>{bird.also_known_as.join(', ')}</Text>
                        </View>
                    )}
                    {bird.taxonomy?.genus && (
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Genus: </Text>
                            <Text style={styles.metaValue}>{bird.taxonomy.genus}</Text>
                        </View>
                    )}
                    {bird.rarity && (
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Rarity: </Text>
                            <Text style={[styles.metaValue, { color: getRarityColor(bird.rarity) }]}>{bird.rarity}</Text>
                        </View>
                    )}
                </View>
            </View>

            {
                bird.taxonomy?.genus_description && (
                    <View style={styles.genusDescriptionBox}>
                        <Text style={styles.genusDescriptionText}>{bird.taxonomy.genus_description}</Text>
                    </View>
                )
            }

            <View style={styles.gutter} />

            {/* Gallery Section */}
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
                    {(inatPhotos && inatPhotos.length > 0 ? inatPhotos : bird.inat_photos || []).length > 0 ? (
                        (inatPhotos && inatPhotos.length > 0 ? inatPhotos : bird.inat_photos || []).map((photo, idx) => (
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
                        ))
                    ) : (
                        // Render placeholders when no images are available yet
                        [1, 2, 3].map((_, idx) => (
                            <View key={idx} style={[styles.galleryItem, { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }]}>
                                <ImageIcon size={32} color="#CCC" />
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

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
                    {(bird.diet_tags?.length > 0 || bird.diet) && (
                        <TouchableOpacity style={styles.wideCard} onPress={onOpenTips}>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardLabel}>Diet</Text>
                            </View>
                            <View style={styles.cardRight}>
                                {(() => {
                                    let tags = [...(bird.diet_tags || [])];
                                    if (bird.diet && !tags.includes(bird.diet)) {
                                        tags.push(bird.diet);
                                    }
                                    tags = tags.filter(t => {
                                        const low = t?.toLowerCase();
                                        return low && low !== 'none' && low !== 'n/a' && low !== 'nil' && low !== 'unknown' && low !== 'none.';
                                    });

                                    if (tags.length === 0) return null;

                                    if (tags.length > 1) {
                                        const hasSpecifics = tags.some(t => {
                                            const low = t.toLowerCase();
                                            return low !== 'omnivore' && low !== 'generalist' && low !== 'mixed';
                                        });
                                        if (hasSpecifics) {
                                            tags = tags.filter(t => {
                                                const low = t.toLowerCase();
                                                return low !== 'omnivore' && low !== 'generalist' && low !== 'mixed';
                                            });
                                        }
                                    }

                                    return <OverlapAvatars tags={tags} type="diet" />;
                                })()}
                                <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Full Width Tip: Feeder */}
                    {(() => {
                        const tags = (bird.feeder_info?.feeder_types || []).filter(t => {
                            const low = t?.toLowerCase();
                            return low && low !== 'none' && low !== 'n/a' && low !== 'nil' && low !== 'unknown' && low !== 'none.';
                        });

                        if (tags.length === 0) return null;

                        return (
                            <TouchableOpacity style={styles.wideCard} onPress={onOpenTips}>
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardLabel}>Feeder</Text>
                                </View>
                                <View style={styles.cardRight}>
                                    <OverlapAvatars tags={tags} type="feeder" />
                                    <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                                </View>
                            </TouchableOpacity>
                        );
                    })()}

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
                                    const type = (bird.nesting_info?.type || '').toLowerCase();
                                    const combined = `${loc} ${type}`;

                                    let asset = NESTING_ASSETS.cup;
                                    let name = 'Cup';

                                    if (combined.includes('cavity') || combined.includes('hole')) {
                                        asset = NESTING_ASSETS.cavity;
                                        name = 'Cavity';
                                    } else if (combined.includes('burrow') || combined.includes('tunnel')) {
                                        asset = NESTING_ASSETS.burrow;
                                        name = 'Burrow';
                                    } else if (combined.includes('dome') || combined.includes('spherical') || combined.includes('enclosed')) {
                                        asset = NESTING_ASSETS.dome;
                                        name = 'Dome';
                                    } else if (combined.includes('ground') || combined.includes('shrub')) {
                                        asset = NESTING_ASSETS.ground;
                                        name = 'Ground';
                                    } else if (combined.includes('platform') || combined.includes('ledge') || combined.includes('building')) {
                                        asset = NESTING_ASSETS.platform;
                                        name = 'Platform';
                                    } else if (combined.includes('scrape') || combined.includes('sand') || combined.includes('pebbles')) {
                                        asset = NESTING_ASSETS.scrape;
                                        name = 'Scrape';
                                    } else if (combined.includes('hanging') || combined.includes('pouch') || combined.includes('pendant')) {
                                        asset = NESTING_ASSETS.hanging;
                                        name = 'Hanging';
                                    } else if (combined.includes('none') || combined.includes('parasitic') || combined.includes('no nest')) {
                                        asset = NESTING_ASSETS.none;
                                        name = 'No Nest';
                                    } else if (combined.includes('tree') || combined.includes('branch') || combined.includes('cup')) {
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


                    {/* Insight Tip */}
                    <TouchableOpacity style={styles.insightCard} onPress={onOpenTips}>
                        <View style={styles.insightIconWrapper}>
                            <Lightbulb size={24} color="#FF6B35" fill="#FF6B35" strokeWidth={3} />
                        </View>
                        <Text style={styles.insightText} numberOfLines={2}>
                            {bird.fact || bird.description}
                        </Text>
                        <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Sound Section */}
            {
                sounds.length > 0 && (
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
                                        <WaveformPlayer
                                            key={sound.id}
                                            sound={sound}
                                            activeSoundId={activeSoundId}
                                            onPlay={setActiveSoundId}
                                        />
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
                                        <WaveformPlayer
                                            key={sound.id}
                                            sound={sound}
                                            activeSoundId={activeSoundId}
                                            onPlay={setActiveSoundId}
                                        />
                                    ))}
                                </View>
                            )}

                            <Text style={styles.disclaimerText}>
                                * Please note that same bird species can sound different due to dialect or mimicry.
                            </Text>
                        </View>
                    </>
                )
            }

            {/* How to identify it? Section */}
            {
                (() => {
                    const hasMale = bird.identification_tips?.male && bird.identification_tips.male !== 'N/A';
                    const hasFemale = bird.identification_tips?.female && bird.identification_tips.female !== 'N/A' && !bird.identification_tips.female.toLowerCase().includes('similar to male');
                    const hasJuvenile = bird.identification_tips?.juvenile && bird.identification_tips.juvenile !== 'N/A';

                    if (!hasMale && !hasFemale && !hasJuvenile) return null;

                    return (
                        <>
                            <View style={styles.gutter} />
                            <View style={styles.section}>
                                <View style={styles.sectionHeaderRow}>
                                    <View style={styles.sectionTitleLeft}>
                                        <Lightbulb size={22} color="#1A1A1A" />
                                        <Text style={styles.sectionTitle}>How to identify it?</Text>
                                    </View>
                                    <MoreHorizontal size={20} color="#999" />
                                </View>

                                <View style={styles.idContainer}>
                                    {(() => {
                                        const showMale = !!bird.male_image_url;
                                        const showFemale = !!bird.female_image_url;
                                        const showJuvenile = !!bird.juvenile_image_url;

                                        // Preference 1: Gender Comparison
                                        if (showMale && showFemale) {
                                            return (
                                                <>
                                                    <View style={styles.idItem}>
                                                        <Text style={styles.idItemTitle}>Male</Text>
                                                        <TouchableOpacity
                                                            style={styles.idImageWrapper}
                                                            onPress={onOpenIdentification}
                                                            activeOpacity={0.9}
                                                        >
                                                            <Image
                                                                source={{ uri: bird.male_image_url }}
                                                                style={styles.idImage}
                                                                cachePolicy="memory-disk"
                                                            />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View style={styles.idItem}>
                                                        <Text style={styles.idItemTitle}>Female</Text>
                                                        <TouchableOpacity
                                                            style={styles.idImageWrapper}
                                                            onPress={onOpenIdentification}
                                                            activeOpacity={0.9}
                                                        >
                                                            <Image
                                                                source={{ uri: bird.female_image_url }}
                                                                style={styles.idImage}
                                                                cachePolicy="memory-disk"
                                                            />
                                                        </TouchableOpacity>
                                                    </View>
                                                </>
                                            );
                                        }

                                        // Preference 2: Age Comparison (Adult vs Juvenile)
                                        if (showJuvenile) {
                                            return (
                                                <>
                                                    <View style={styles.idItem}>
                                                        <Text style={styles.idItemTitle}>Adult</Text>
                                                        <TouchableOpacity
                                                            style={styles.idImageWrapper}
                                                            onPress={onOpenIdentification}
                                                            activeOpacity={0.9}
                                                        >
                                                            <Image
                                                                source={{ uri: bird.images?.[0] }}
                                                                style={styles.idImage}
                                                                cachePolicy="memory-disk"
                                                            />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <View style={styles.idItem}>
                                                        <Text style={styles.idItemTitle}>Juvenile</Text>
                                                        <TouchableOpacity
                                                            style={styles.idImageWrapper}
                                                            onPress={onOpenIdentification}
                                                            activeOpacity={0.9}
                                                        >
                                                            <Image
                                                                source={{ uri: bird.juvenile_image_url }}
                                                                style={styles.idImage}
                                                                cachePolicy="memory-disk"
                                                            />
                                                        </TouchableOpacity>
                                                    </View>
                                                </>
                                            );
                                        }

                                        // Default/Fallback: Single View (Adult or Male if only one)
                                        const fallbackImage = bird.male_image_url || bird.images?.[0];
                                        const fallbackLabel = bird.male_image_url ? "Male" : "Adult";

                                        return (
                                            <View style={styles.idItem}>
                                                <Text style={styles.idItemTitle}>{fallbackLabel}</Text>
                                                <TouchableOpacity
                                                    style={styles.idImageWrapper}
                                                    onPress={onOpenIdentification}
                                                    activeOpacity={0.9}
                                                >
                                                    <Image
                                                        source={{ uri: fallbackImage }}
                                                        style={styles.idImage}
                                                        cachePolicy="memory-disk"
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })()}

                                    <TouchableOpacity
                                        style={styles.learnMoreCenterBtn}
                                        onPress={onOpenIdentification}
                                    >
                                        <Text style={styles.learnMoreText}>Learn More</Text>
                                        <ChevronDown size={18} color="#FF6B35" strokeWidth={2.5} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    );
                })()
            }

            <View style={styles.gutter} />

            <View style={styles.section}>
                <View style={[styles.sectionHeaderRow, { marginBottom: 12 }]}>
                    <View style={styles.sectionTitleLeft}>
                        <Leaf size={22} color="#1A1A1A" />
                        <Text style={styles.sectionTitle}>Description</Text>
                    </View>
                    <MoreHorizontal size={20} color="#999" />
                </View>
                <Text style={styles.descriptionText}>{bird.description}</Text>
            </View>

            <View style={styles.gutter} />

            {/* Key Facts Section */}
            <View style={styles.section}>
                <View style={[styles.sectionHeaderRow, { marginBottom: 12 }]}>
                    <View style={styles.sectionTitleLeft}>
                        <FileText size={22} color="#1A1A1A" />
                        <Text style={styles.sectionTitle}>Key Facts</Text>
                    </View>
                    <MoreHorizontal size={20} color="#999" />
                </View>

                <View style={styles.factsContainer}>
                    <View style={[styles.factRow, { backgroundColor: '#F8F8F8' }]}>
                        <Text style={styles.factLabel}>Size</Text>
                        <Text style={styles.factValue}>{bird.key_facts?.size || 'N/A'}</Text>
                    </View>
                    <View style={styles.factRow}>
                        <Text style={styles.factLabel}>Wing Span</Text>
                        <Text style={styles.factValue}>{bird.key_facts?.wingspan || 'N/A'}</Text>
                    </View>
                    <View style={[styles.factRow, { backgroundColor: '#F8F8F8' }]}>
                        <Text style={styles.factLabel}>Weight</Text>
                        <Text style={styles.factValue}>{bird.key_facts?.weight || 'N/A'}</Text>
                    </View>
                    <View style={styles.factRow}>
                        <Text style={styles.factLabel}>Life Expectancy</Text>
                        <Text style={styles.factValue}>{bird.key_facts?.life_expectancy || 'N/A'}</Text>
                    </View>

                    {isFactsExpanded && (
                        <>
                            <View style={[styles.factRow, { backgroundColor: '#F8F8F8' }]}>
                                <Text style={styles.factLabel}>Colors</Text>
                                <View style={styles.colorsContainer}>
                                    {bird.key_facts?.colors?.map((color, idx) => (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.colorCircle,
                                                { backgroundColor: getBirdColor(color) }
                                            ]}
                                        />
                                    )) || <Text style={styles.factValue}>N/A</Text>}
                                </View>
                            </View>
                            <View style={styles.factRow}>
                                <Text style={styles.factLabel}>Wing Shape</Text>
                                <Text style={styles.factValue}>{bird.key_facts?.wing_shape || 'N/A'}</Text>
                            </View>
                            <View style={[styles.factRow, { backgroundColor: '#F8F8F8' }]}>
                                <Text style={styles.factLabel}>Tail Shape</Text>
                                <Text style={styles.factValue}>{bird.key_facts?.tail_shape || 'N/A'}</Text>
                            </View>
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => setIsFactsExpanded(!isFactsExpanded)}
                    >
                        <Text style={styles.expandButtonText}>
                            {isFactsExpanded ? 'Show Less' : 'Learn More'}
                        </Text>
                        {isFactsExpanded ? (
                            <ChevronUp size={16} color="#BA6526" />
                        ) : (
                            <ChevronDown size={16} color="#BA6526" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Habits & Behavior Section */}
            {
                (bird.behavior || bird.diet) && (
                    <>
                        <View style={styles.gutter} />
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionTitleLeft}>
                                    <Lightbulb size={22} color="#1A1A1A" />
                                    <Text style={styles.sectionTitle}>Habits & Behavior</Text>
                                </View>
                            </View>
                            <Text style={styles.descriptionText}>
                                {bird.behavior || bird.diet}
                            </Text>
                        </View>
                    </>
                )
            }

            {/* Distribution Section */}
            {
                bird.habitat && (
                    <>
                        <View style={styles.gutter} />
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={styles.sectionTitleLeft}>
                                    <LayoutGrid size={22} color="#1A1A1A" />
                                    <Text style={styles.sectionTitle}>Distribution & Habitat</Text>
                                </View>
                            </View>
                            <Text style={styles.descriptionText}>{bird.habitat}</Text>
                        </View>
                    </>
                )
            }

            {/* Scientific Classification Section */}
            <View style={styles.gutter} />
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleLeft}>
                        <Notebook size={22} color="#1A1A1A" />
                        <Text style={styles.sectionTitle}>Scientific Classification</Text>
                    </View>
                </View>

                <View style={styles.classificationContainer}>
                    <View style={styles.classificationItem}>
                        <Text style={styles.classificationItemLabel}>Genus</Text>
                        <Text style={styles.classificationItemValue}>{bird.taxonomy?.genus || 'N/A'}</Text>
                    </View>

                    <View style={styles.classificationItem}>
                        <Text style={styles.classificationItemLabel}>Family</Text>
                        <Text style={styles.classificationItemValue}>{bird.taxonomy?.family || 'N/A'}</Text>
                    </View>

                    <View style={styles.classificationItem}>
                        <Text style={styles.classificationItemLabel}>Order</Text>
                        <Text style={styles.classificationItemValue}>{bird.taxonomy?.order || 'N/A'}</Text>
                    </View>

                    {isClassificationExpanded && (
                        <>
                            <View style={styles.classificationItem}>
                                <Text style={styles.classificationItemLabel}>Class</Text>
                                <Text style={styles.classificationItemValue}>Aves - Birds</Text>
                            </View>

                            <View style={styles.classificationItem}>
                                <Text style={styles.classificationItemLabel}>Phylum</Text>
                                <Text style={styles.classificationItemValue}>Chordata - Chordates</Text>
                            </View>
                        </>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setIsClassificationExpanded(!isClassificationExpanded)}
                >
                    <Text style={styles.expandButtonText}>
                        {isClassificationExpanded ? 'Show Less' : 'Learn More'}
                    </Text>
                    {isClassificationExpanded ? (
                        <ChevronUp size={16} color="#BA6526" />
                    ) : (
                        <ChevronDown size={16} color="#BA6526" />
                    )}
                </TouchableOpacity>
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
    orderText: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    orderValue: {
        fontWeight: '600',
        color: '#333',
    },
    genusDescriptionBox: {
        backgroundColor: '#F7FAFC',
        padding: 12,
        marginHorizontal: 12,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    genusDescriptionText: {
        fontSize: 14,
        lineHeight: 20,
        color: '#4A5568',
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
        fontSize: 17,
        color: '#666',
    },
    metaValue: {
        fontSize: 17,
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
        marginBottom: 2,
    },
    scientificNameLabel: {
        fontSize: 17,
        color: '#666',
    },
    scientificNameValue: {
        fontSize: 17,
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
        fontSize: 18,
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
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 18,
        alignItems: 'center',
        gap: 12,
        marginVertical: 4,
    },
    insightIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF2EE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightText: {
        flex: 1,
        fontSize: 17.5,
        color: '#333',
        lineHeight: 25,
    },
    section: {
        marginBottom: 12,
        paddingHorizontal: 13,
    },
    descriptionText: {
        fontSize: 18,
        lineHeight: 28,
        color: '#1A1A1A',
        paddingHorizontal: 0,
        marginTop: 0,
        marginBottom: 4,
    },
    factsContainer: {
        marginTop: 8,
    },
    factRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 18,
        borderRadius: 10,
        marginBottom: 1,
    },
    factLabel: {
        fontSize: 18,
        color: '#64748B',
        fontWeight: '500',
    },
    factValue: {
        fontSize: 18,
        color: '#1E293B',
        fontWeight: '600',
    },
    colorsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    colorCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        marginLeft: 8,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 6,
    },
    expandButtonText: {
        fontSize: 16,
        color: '#BA6526',
        fontWeight: '500',
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
        fontSize: 18,
        lineHeight: 27,
        color: '#1A1A1A',
    },
    habitatIcon: {
        width: 64,
        height: 64,
        resizeMode: 'contain',
        marginVertical: 4,
    },
    classificationContainer: {
        gap: 8,
        marginTop: 8,
    },
    classificationItem: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 20,
    },
    classificationItemLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    classificationItemValue: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
        lineHeight: 22,
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
        fontSize: 15,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 12,
        lineHeight: 22,
    },
    learnMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    learnMoreText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FF6B35',
    },
    idContainer: {
        marginTop: 12,
        gap: 20,
    },
    idItem: {
        width: '100%',
    },
    idItemTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    idImageWrapper: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F8F8F8',
    },
    idImage: {
        width: '100%',
        height: '100%',
    },
    learnMoreCenterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
    },
});
