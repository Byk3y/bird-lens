import { BirdResult, BirdSound, INaturalistPhoto } from '@/types/scanner';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import {
    Activity,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    Image as ImageIcon,
    Lightbulb,
    MoreHorizontal,
    Notebook
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WaveformPlayer } from '../scanner/WaveformPlayer';

// Modular Components
import { BirdingTipsGrid } from './profile/BirdingTipsGrid';
import { IdentificationComparison } from './profile/IdentificationComparison';
import { IdentificationSkeleton } from './profile/IdentificationSkeleton';
import { KeyFactsSection } from './profile/KeyFactsSection';
import { ProfileHeader } from './profile/ProfileHeader';
import { ScientificClassification } from './profile/ScientificClassification';

const { width } = Dimensions.get('window');

interface BirdProfileContentProps {
    bird: BirdResult;
    inatPhotos?: INaturalistPhoto[];
    sounds?: BirdSound[];
    isLoadingSounds?: boolean;
    onPlaySound?: () => void;
    onImagePress?: (index: number) => void;
    onOpenTips?: (section?: string) => void;
    onOpenIdentification?: () => void;
}

export const BirdProfileContent: React.FC<BirdProfileContentProps> = ({
    bird,
    inatPhotos = [],
    sounds = [],
    isLoadingSounds = false,
    onPlaySound,
    onImagePress,
    onOpenTips,
    onOpenIdentification,
}) => {
    const galleryRef = useRef<ScrollView>(null);
    const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Track if any media (photos/sounds) has arrived for loading states
    const isMedialoaded = (inatPhotos && inatPhotos.length > 0) || (sounds && sounds.length > 0) || (bird.inat_photos && bird.inat_photos.length > 0);

    // Group sounds by type (Song vs Call)
    const groupedSounds = React.useMemo(() => {
        const targetSounds = (sounds && sounds.length > 0) ? sounds : (bird.sounds || []);
        const songs = targetSounds.filter(s => s.type?.toLowerCase().includes('song'));
        const calls = targetSounds.filter(s => s.type?.toLowerCase().includes('call'));
        const others = targetSounds.filter(s => !s.type?.toLowerCase().includes('song') && !s.type?.toLowerCase().includes('call'));
        return { songs, calls, others, total: targetSounds.length };
    }, [sounds, bird.sounds]);

    // Reset gallery scroll position when bird changes
    useEffect(() => {
        galleryRef.current?.scrollTo({ x: 0, animated: false });
    }, [bird.scientific_name]);

    return (
        <View style={styles.container}>
            {/* Header: Title, Taxonomy, Scientific Name, Genus Description */}
            <ProfileHeader bird={bird} onPronounce={onPlaySound} />

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

            {/* Birding Tips Section (Diet, Feeder, Habitat, Nesting Grid) */}
            <View style={styles.tipsSection}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleLeft}>
                        <Notebook size={22} color="#1A1A1A" />
                        <Text style={styles.sectionTitle}>Birding Tips</Text>
                    </View>
                    <MoreHorizontal size={20} color="#999" />
                </View>

                <BirdingTipsGrid bird={bird} onOpenTips={onOpenTips} />
            </View>

            {/* Insight Tip */}
            {bird.behavior && bird.behavior !== bird.diet ? (
                <View style={styles.section}>
                    <View style={styles.insightCard}>
                        <View style={styles.insightIconWrapper}>
                            <Lightbulb size={24} color="#FF6B35" />
                        </View>
                        <Text style={styles.insightText}>{bird.behavior}</Text>
                    </View>
                </View>
            ) : (!isMedialoaded || isLoadingSounds) ? (
                <View style={styles.section}>
                    <View style={[styles.insightCard, { opacity: 0.5 }]}>
                        <ActivityIndicator size="small" color="#FF6B35" />
                        <Text style={[styles.insightText, { color: '#999' }]}>Gathering behavioral insights...</Text>
                    </View>
                </View>
            ) : null}

            <View style={styles.gutter} />

            {/* Sound Section */}
            {groupedSounds.total > 0 ? (
                <View style={styles.section}>
                    <View style={[styles.sectionHeaderRow, { marginBottom: 16 }]}>
                        <View style={styles.sectionTitleLeft}>
                            <Activity size={22} color="#1A1A1A" />
                            <Text style={styles.sectionTitle}>Sounds</Text>
                        </View>
                        <MoreHorizontal size={20} color="#999" />
                    </View>

                    {/* Songs Group */}
                    {groupedSounds.songs.length > 0 && (
                        <View style={styles.soundGroup}>
                            <View style={styles.soundGroupHeader}>
                                <Text style={styles.soundGroupTitle}>Song</Text>
                                <HelpCircle size={16} color="#1A1A1A" style={{ marginLeft: 6 }} />
                            </View>
                            {groupedSounds.songs.map((sound, idx) => (
                                <WaveformPlayer
                                    key={`song-${idx}`}
                                    sound={sound}
                                    activeSoundId={activeSoundId}
                                    onPlay={(id) => {
                                        setActiveSoundId(id);
                                        Speech.stop();
                                    }}
                                />
                            ))}
                        </View>
                    )}

                    {/* Calls Group */}
                    {groupedSounds.calls.length > 0 && (
                        <View style={styles.soundGroup}>
                            <View style={styles.soundGroupHeader}>
                                <Text style={styles.soundGroupTitle}>Call</Text>
                                <HelpCircle size={16} color="#1A1A1A" style={{ marginLeft: 6 }} />
                            </View>
                            {groupedSounds.calls.map((sound, idx) => (
                                <WaveformPlayer
                                    key={`call-${idx}`}
                                    sound={sound}
                                    activeSoundId={activeSoundId}
                                    onPlay={(id) => {
                                        setActiveSoundId(id);
                                        Speech.stop();
                                    }}
                                />
                            ))}
                        </View>
                    )}

                    {/* Catch-all Group */}
                    {groupedSounds.others.length > 0 && (
                        <View style={styles.soundGroup}>
                            <View style={styles.soundGroupHeader}>
                                <Text style={styles.soundGroupTitle}>Other Vocalizations</Text>
                                <HelpCircle size={16} color="#1A1A1A" style={{ marginLeft: 6 }} />
                            </View>
                            {groupedSounds.others.map((sound, idx) => (
                                <WaveformPlayer
                                    key={`other-${idx}`}
                                    sound={sound}
                                    activeSoundId={activeSoundId}
                                    onPlay={(id) => {
                                        setActiveSoundId(id);
                                        Speech.stop();
                                    }}
                                />
                            ))}
                        </View>
                    )}

                    <Text style={styles.soundDisclaimer}>
                        * Please note that same bird species can sound different due to dialect or mimicry.
                    </Text>
                </View>
            ) : isLoadingSounds ? (
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionTitleLeft}>
                            <Activity size={22} color="#CCC" />
                            <Text style={[styles.sectionTitle, { color: '#999' }]}>Sounds</Text>
                        </View>
                    </View>
                    <View style={{ height: 40, justifyContent: 'center' }}>
                        <Text style={{ color: '#BBB', fontSize: 14 }}>Searching archives for vocalizations...</Text>
                    </View>
                </View>
            ) : null}

            <View style={styles.gutter} />

            {/* Identification Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleLeft}>
                        <HelpCircle size={22} color="#1A1A1A" />
                        <Text style={styles.sectionTitle}>How to identify it?</Text>
                    </View>
                    <MoreHorizontal size={20} color="#999" />
                </View>
                <View style={styles.clippedIdContainer}>
                    {bird.identification_tips ? (
                        <IdentificationComparison bird={bird} onPress={onOpenIdentification} variant="inline" />
                    ) : (
                        <IdentificationSkeleton />
                    )}
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.8)', '#FFFFFF']}
                        style={styles.fadeOverlay}
                    />
                </View>
                <TouchableOpacity
                    onPress={onOpenIdentification}
                    style={styles.expandButton}
                    activeOpacity={0.7}
                >
                    <Text style={styles.expandButtonText}>Learn More</Text>
                    <ChevronDown size={16} color="#BA6526" />
                </TouchableOpacity>
            </View>

            <View style={styles.gutter} />

            {/* Description Section */}
            <View style={styles.section}>
                {bird.description ? (
                    <>
                        <Text
                            style={styles.descriptionText}
                            numberOfLines={isExpanded ? 0 : 5}
                        >
                            {bird.description}
                        </Text>
                        {bird.description.length > 200 && (
                            <TouchableOpacity
                                style={styles.expandButton}
                                onPress={() => setIsExpanded(!isExpanded)}
                            >
                                <Text style={styles.expandButtonText}>
                                    {isExpanded ? 'Show Less' : 'Read Full Description'}
                                </Text>
                                {isExpanded ? (
                                    <ChevronUp size={16} color="#BA6526" />
                                ) : (
                                    <ChevronDown size={16} color="#BA6526" />
                                )}
                            </TouchableOpacity>
                        )}
                    </>
                ) : (
                    <View style={{ paddingVertical: 20 }}>
                        <View style={{ height: 18, width: '90%', backgroundColor: '#F0F0F0', borderRadius: 4, marginBottom: 8 }} />
                        <View style={{ height: 18, width: '95%', backgroundColor: '#F0F0F0', borderRadius: 4, marginBottom: 8 }} />
                        <View style={{ height: 18, width: '70%', backgroundColor: '#F0F0F0', borderRadius: 4, marginBottom: 8 }} />
                    </View>
                )}
            </View>

            {/* Key Facts Section */}
            <KeyFactsSection bird={bird} />

            {/* Scientific Classification & Fact Card */}
            <ScientificClassification bird={bird} />

            <View style={{ height: 40 }} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gutter: {
        height: 12,
        backgroundColor: '#F2F2F2',
        marginHorizontal: 0,
        marginBottom: 16,
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
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 14,
        paddingBottom: 6,
        gap: 6,
    },
    expandButtonText: {
        fontSize: 16,
        color: '#BA6526',
        fontWeight: '600',
    },
    // Sound Section Grouping
    soundGroup: {
        marginBottom: 20,
    },
    soundGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    soundGroupTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    soundDisclaimer: {
        fontSize: 14,
        color: '#666',
        marginTop: 12,
        lineHeight: 20,
        fontStyle: 'normal',
    },
    clippedIdContainer: {
        maxHeight: 440,
        overflow: 'hidden',
        position: 'relative',
    },
    fadeOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
    },
});
