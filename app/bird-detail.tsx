import { LoadingScreen } from '@/components/common/LoadingScreen';
import { RangeMap } from '@/components/scanner/RangeMap';
import { WaveformPlayer } from '@/components/scanner/WaveformPlayer';
import { Colors, Typography } from '@/constants/theme';
import { BirdMedia, MediaService } from '@/services/MediaService';
import { BirdSound, SoundService } from '@/services/SoundService';
import { BirdResult } from '@/types/scanner';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Activity,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ClipboardList,
    Flame,
    Heart,
    Home,
    Info,
    Leaf,
    Mic2,
    Music,
    Search,
    Share2,
    ShieldAlert
} from 'lucide-react-native';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function BirdDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const bird = JSON.parse(params.birdData as string) as BirdResult;

    const [media, setMedia] = useState<BirdMedia | null>(null);
    const [sounds, setSounds] = useState<BirdSound[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDescription, setExpandedDescription] = useState(false);
    const [expandedKeyFacts, setExpandedKeyFacts] = useState(false);
    const [showIdentifyModal, setShowIdentifyModal] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                const [mediaData, soundData] = await Promise.all([
                    MediaService.fetchBirdMedia(bird.scientific_name),
                    SoundService.fetchSounds(bird.scientific_name)
                ]);
                setMedia(mediaData);
                setSounds(soundData);
            } catch (error) {
                console.error('Failed to load detail data:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [bird.scientific_name]);

    if (loading) {
        return <LoadingScreen onBack={() => router.back()} message="Opening Profile..." />;
    }

    // Helper to map tags to icons/colors
    const TagItem = ({ label }: { label: string }) => (
        <View style={styles.tagItem}>
            <View style={styles.tagCircle}>
                <Text style={styles.tagEmoji}>
                    {label.toLowerCase().includes('seed') ? '🌻' :
                        label.toLowerCase().includes('insect') ? '🐛' :
                            label.toLowerCase().includes('fruit') ? '🍎' :
                                label.toLowerCase().includes('nectar') ? '🌸' : '🥥'}
                </Text>
            </View>
            <Text style={styles.tagItemLabel}>{label}</Text>
        </View>
    );

    const renderFactRow = (label: string, value: string, index: number) => (
        <View style={[styles.factRow, index % 2 === 0 ? styles.factRowEven : styles.factRowOdd]}>
            <Text style={styles.factLabel}>{label}</Text>
            <Text style={styles.factValue}>{value}</Text>
        </View>
    );

    const IdentificationModal = () => (
        <Modal
            visible={showIdentifyModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowIdentifyModal(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Identification</Text>
                    <Pressable onPress={() => setShowIdentifyModal(false)} style={styles.closeModalBtn}>
                        <ChevronDown size={28} color={Colors.text} />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.modalScroll}>
                    <View style={styles.genderCard}>
                        <View style={styles.genderHeader}>
                            <View style={[styles.genderIcon, { backgroundColor: '#eff6ff' }]}>
                                <Text>♂️</Text>
                            </View>
                            <Text style={styles.genderTitle}>Male</Text>
                        </View>
                        <Text style={styles.genderDescription}>{bird.identification_tips.male}</Text>
                    </View>

                    <View style={styles.genderCard}>
                        <View style={styles.genderHeader}>
                            <View style={[styles.genderIcon, { backgroundColor: '#fff1f2' }]}>
                                <Text>♀️</Text>
                            </View>
                            <Text style={styles.genderTitle}>Female</Text>
                        </View>
                        <Text style={styles.genderDescription}>{bird.identification_tips.female}</Text>
                    </View>

                    {bird.identification_tips.juvenile && (
                        <View style={styles.genderCard}>
                            <View style={styles.genderHeader}>
                                <View style={[styles.genderIcon, { backgroundColor: '#f0fdf4' }]}>
                                    <Leaf size={16} color="#16a34a" />
                                </View>
                                <Text style={styles.genderTitle}>Juvenile</Text>
                            </View>
                            <Text style={styles.genderDescription}>{bird.identification_tips.juvenile}</Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            {/* Hero Section */}
            <View style={styles.heroContainer}>
                {media?.image?.url ? (
                    <Image
                        source={{ uri: media.image.url }}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient
                        colors={[Colors.primary, Colors.accent]}
                        style={styles.heroPlaceholder}
                    />
                )}

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.heroGradient}
                />

                <SafeAreaView style={styles.header}>
                    <View style={styles.headerContent}>
                        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
                            <ChevronLeft color={Colors.white} size={28} />
                        </Pressable>
                        <View style={styles.headerRight}>
                            <Pressable style={styles.headerBtn}>
                                <Heart color={Colors.white} size={24} />
                            </Pressable>
                            <Pressable style={styles.headerBtn}>
                                <Share2 color={Colors.white} size={24} />
                            </Pressable>
                        </View>
                    </View>
                </SafeAreaView>

                <View style={styles.heroInfo}>
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 600 }}
                    >
                        <Text style={styles.birdName}>{bird.name}</Text>
                        <Text style={styles.scientificName}>{bird.scientific_name}</Text>
                        <View style={styles.tagRow}>
                            <View style={styles.rarityTag}>
                                <Text style={styles.rarityText}>{bird.rarity}</Text>
                            </View>
                            <View style={styles.familyTag}>
                                <Text style={styles.familyText}>{bird.taxonomy.family}</Text>
                            </View>
                        </View>
                    </MotiView>
                </View>

                {media?.image?.attribution && (
                    <View style={styles.attributionBadge}>
                        <Text style={styles.attributionText}>
                            Photo: {media.image.attribution.artist} • {media.image.attribution.license}
                        </Text>
                    </View>
                )}
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Birding Tips Section (High Density) */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Info size={20} color={Colors.text} />
                        <Text style={styles.sectionTitle}>Birding Tips</Text>
                    </View>

                    {/* Diet & Feeder Cards */}
                    <View style={styles.tipsCard}>
                        <View style={styles.tipRow}>
                            <View style={styles.tipInfo}>
                                <Text style={styles.tipLabelSmall}>Diet</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagContainer}>
                                {bird.diet_tags?.map((tag, i) => <TagItem key={i} label={tag} />)}
                            </ScrollView>
                        </View>

                        <View style={[styles.tipRow, styles.borderTop]}>
                            <View style={styles.tipInfo}>
                                <Text style={styles.tipLabelSmall}>Feeder</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagContainer}>
                                {bird.feeder_info?.feeder_types.map((tag, i) => <TagItem key={i} label={tag} />)}
                            </ScrollView>
                        </View>
                    </View>

                    {/* Habitat & Nesting Small Cards */}
                    <View style={styles.compactRow}>
                        <View style={styles.compactCard}>
                            <View style={styles.compactHeader}>
                                <Text style={styles.compactLabel}>Habitat</Text>
                                <Leaf size={16} color={Colors.primary} />
                            </View>
                            <View style={styles.compactContent}>
                                <View style={styles.compactIconCircle}>
                                    <Home size={24} color={Colors.primary} />
                                </View>
                                <Text style={styles.compactValue}>{bird.nesting_info?.location || 'Forest'}</Text>
                            </View>
                        </View>

                        <View style={styles.compactCard}>
                            <View style={styles.compactHeader}>
                                <Text style={styles.compactLabel}>Nesting</Text>
                                <Activity size={16} color={Colors.accent} />
                            </View>
                            <View style={styles.compactContent}>
                                <View style={styles.compactIconCircle}>
                                    <Flame size={24} color={Colors.accent} />
                                </View>
                                <Text style={styles.compactValue}>{bird.nesting_info?.type || 'Cup'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Identification Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Search size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>How to identify it?</Text>
                    </View>

                    <View style={styles.identificationPreview}>
                        <Text style={styles.identificationText} numberOfLines={3}>
                            <Text style={styles.bold}>Male: </Text>{bird.identification_tips.male}
                        </Text>
                        <Text style={[styles.identificationText, { marginTop: 8 }]} numberOfLines={2}>
                            <Text style={styles.bold}>Female: </Text>{bird.identification_tips.female}
                        </Text>

                        <Pressable
                            onPress={() => setShowIdentifyModal(true)}
                            style={styles.learnMoreLink}
                        >
                            <Text style={styles.learnMoreText}>Learn More</Text>
                            <ChevronRight size={14} color={Colors.primary} />
                        </Pressable>
                    </View>
                </View>

                {/* Description Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Info size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Description</Text>
                    </View>

                    <View>
                        <View style={{ position: 'relative' }}>
                            <Text
                                style={styles.descriptionText}
                                numberOfLines={expandedDescription ? undefined : 5}
                            >
                                {bird.description}
                            </Text>
                            {!expandedDescription && (
                                <LinearGradient
                                    colors={['transparent', 'rgba(255,255,255,0.9)', '#fff']}
                                    style={styles.descriptionFade}
                                />
                            )}
                        </View>
                        {!expandedDescription && (
                            <Pressable
                                onPress={() => setExpandedDescription(true)}
                                style={styles.inlineLearnMore}
                            >
                                <Text style={styles.learnMoreText}>Learn More</Text>
                                <ChevronDown size={14} color={Colors.primary} />
                            </Pressable>
                        )}
                        {expandedDescription && (
                            <Pressable
                                onPress={() => setExpandedDescription(false)}
                                style={styles.inlineLearnMore}
                            >
                                <Text style={styles.learnMoreText}>Show Less</Text>
                                <ChevronUp size={14} color={Colors.primary} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Key Facts Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <ClipboardList size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Key Facts</Text>
                    </View>

                    <View style={styles.factsContainer}>
                        {renderFactRow("Size", bird.key_facts?.size || "21 - 24 cm", 0)}
                        {renderFactRow("Wing Span", bird.key_facts?.wingspan || "25 - 31 cm", 1)}
                        {renderFactRow("Wing Shape", bird.key_facts?.wing_shape || "Rounded", 0)}

                        {expandedKeyFacts && (
                            <>
                                {renderFactRow("Life Expectancy", bird.key_facts?.life_expectancy || "15 years", 1)}
                                {renderFactRow("Colors", bird.key_facts?.colors?.join(", ") || "Red, Brown", 0)}
                                {renderFactRow("Tail Shape", bird.key_facts?.tail_shape || "Notched, Rounded", 1)}
                            </>
                        )}

                        <Pressable
                            onPress={() => setExpandedKeyFacts(!expandedKeyFacts)}
                            style={styles.inlineLearnMore}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={styles.learnMoreText}>
                                    {expandedKeyFacts ? "Show Less" : "Learn More"}
                                </Text>
                                {expandedKeyFacts ? (
                                    <ChevronUp size={14} color={Colors.primary} />
                                ) : (
                                    <ChevronDown size={14} color={Colors.primary} />
                                )}
                            </View>
                        </Pressable>
                    </View>
                </View>

                {/* Sounds Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Music size={20} color={Colors.primary} />
                        <Text style={styles.sectionTitle}>Sounds</Text>
                    </View>

                    {/* Songs Sub-section */}
                    <View style={styles.soundCategory}>
                        <View style={styles.categoryHeader}>
                            <Mic2 size={16} color={Colors.textSecondary} />
                            <Text style={styles.categoryTitle}>SONGS</Text>
                        </View>
                        {sounds.filter(s => s.type === 'song').map((sound) => (
                            <WaveformPlayer key={sound.id} sound={sound} />
                        ))}
                    </View>

                    {/* Calls Sub-section */}
                    <View style={styles.soundCategory}>
                        <View style={styles.categoryHeader}>
                            <Mic2 size={16} color={Colors.textSecondary} />
                            <Text style={styles.categoryTitle}>CALLS</Text>
                        </View>
                        {sounds.filter(s => s.type === 'call').map((sound) => (
                            <WaveformPlayer key={sound.id} sound={sound} />
                        ))}
                    </View>

                    {/* Bird Safety Warning */}
                    <View style={styles.safetyWarning}>
                        <ShieldAlert size={20} color="#f97316" />
                        <View style={styles.safetyContent}>
                            <Text style={styles.safetyTitle}>Bird safety</Text>
                            <Text style={styles.safetyText}>
                                Please remember, birds find playback and song mimicry stressful. In particular, it can divert them from important tasks like feeding their young. Check local rules before playing bird sounds in the wild.
                            </Text>
                        </View>
                    </View>
                </View>

                <RangeMap taxonKey={media?.map?.taxonKey || null} />

                <View style={styles.factCard}>
                    <Info color={Colors.primary} size={24} />
                    <View style={styles.factContent}>
                        <Text style={styles.factTitle}>Did you know?</Text>
                        <Text style={styles.factText}>{bird.fact}</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
                <IdentificationModal />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    heroContainer: {
        height: 450,
        width: '100%',
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 15,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroInfo: {
        position: 'absolute',
        bottom: 30,
        left: 24,
        right: 24,
    },
    birdName: {
        ...Typography.h1,
        fontSize: 38,
        color: Colors.white,
        letterSpacing: -1,
    },
    scientificName: {
        ...Typography.body,
        fontSize: 18,
        color: 'rgba(255,255,255,0.8)',
        fontStyle: 'italic',
        marginTop: 4,
    },
    tagRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 10,
    },
    rarityTag: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    rarityText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    familyTag: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    familyText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: '600',
    },
    attributionBadge: {
        position: 'absolute',
        bottom: 8,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    attributionText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: -20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    scrollContent: {
        padding: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    sectionTitle: {
        ...Typography.h2,
        fontSize: 20,
        color: Colors.text,
    },
    tipsCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    borderTop: {
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    tipInfo: {
        width: 60,
    },
    tipLabelSmall: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    tagContainer: {
        paddingLeft: 8,
    },
    tagItem: {
        alignItems: 'center',
        marginRight: 16,
        gap: 4,
    },
    tagCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tagEmoji: {
        fontSize: 20,
    },
    tagItemLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    compactRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    compactCard: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    compactHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    compactLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    compactContent: {
        alignItems: 'center',
        gap: 8,
    },
    compactIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    compactValue: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    tipDescription: {
        ...Typography.body,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
    factCard: {
        backgroundColor: Colors.secondary + '15',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
    },
    factContent: {
        flex: 1,
    },
    factTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.primary,
        marginBottom: 4,
    },
    factText: {
        fontSize: 14,
        lineHeight: 20,
        color: Colors.textSecondary,
    },
    soundCategory: {
        marginBottom: 20,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingLeft: 4,
    },
    categoryTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.textSecondary,
        letterSpacing: 1,
    },
    safetyWarning: {
        flexDirection: 'row',
        backgroundColor: '#fff7ed',
        padding: 16,
        borderRadius: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: '#ffedd5',
        marginTop: 8,
    },
    safetyContent: {
        flex: 1,
    },
    safetyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#9a3412',
        marginBottom: 4,
    },
    safetyText: {
        fontSize: 12,
        color: '#9a3412',
        lineHeight: 18,
        opacity: 0.8,
    },
    // New Styles
    identificationPreview: {
        backgroundColor: '#f8fafc',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    identificationText: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
    },
    bold: {
        fontWeight: '700',
        color: Colors.text,
    },
    learnMoreLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 12,
    },
    learnMoreText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    descriptionText: {
        ...Typography.body,
        color: Colors.text,
        lineHeight: 22,
    },
    inlineLearnMore: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    factsContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    factRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    factRowEven: {
        backgroundColor: '#fff',
    },
    factRowOdd: {
        backgroundColor: '#f8fafc',
    },
    factLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    factValue: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
    },
    closeModalBtn: {
        padding: 4,
    },
    modalScroll: {
        padding: 20,
        gap: 20,
    },
    genderCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    genderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    genderIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    genderTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    genderDescription: {
        fontSize: 15,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
    descriptionFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    }
});
