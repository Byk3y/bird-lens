import { BirdResult } from '@/types/scanner';
import { MoreHorizontal, Volume2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProfileHeaderProps {
    bird: BirdResult;
    isEnrichmentComplete?: boolean;
    onPronounce?: () => void;
    onMorePress?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ bird, isEnrichmentComplete = true, onPronounce, onMorePress }) => {
    return (
        <View style={styles.container}>
            {/* Title & Taxonomy Section */}
            <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.mainTitle}>
                        {bird.name}
                        {(bird.taxonomy?.family || bird.taxonomy?.family_scientific) && (
                            <Text style={styles.speciesOfText}>, a species of</Text>
                        )}
                    </Text>
                    {(bird.taxonomy?.family || bird.taxonomy?.family_scientific) && (
                        <Text style={styles.familyText}>
                            {bird.taxonomy.family || bird.taxonomy.family_scientific}
                            {bird.taxonomy.family && bird.taxonomy.family_scientific && (
                                <Text style={styles.scientificFamilyText}> ({bird.taxonomy.family_scientific})</Text>
                            )}
                        </Text>
                    )}
                </View>
                <Pressable hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} onPress={onMorePress} style={styles.editBtn}>
                    <View pointerEvents="none">
                        <MoreHorizontal size={20} color="#999" />
                    </View>
                </Pressable>
            </View>

            <View style={styles.scientificNameRow}>
                <View style={styles.metaContainer}>
                    {bird.also_known_as && bird.also_known_as.length > 0 ? (
                        <View style={styles.metaRow}>
                            <Text style={styles.metaFlowText}>
                                <Text style={styles.metaLabel}>Also known as: </Text>
                                <Text style={styles.metaValue}>{bird.also_known_as.join(', ')}</Text>
                            </Text>
                        </View>
                    ) : !isEnrichmentComplete ? (
                        <View style={styles.metaRow}>
                            <View style={[styles.skeletonLine, { width: 140 }]} />
                        </View>
                    ) : null}
                    {bird.scientific_name && (
                        <TouchableOpacity hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            style={styles.metaRow}
                            onPress={onPronounce}
                            activeOpacity={0.7}
                        >
                            <View style={styles.metaRowContent}>
                                <Text style={styles.metaLabel}>Scientific name: </Text>
                                <Text style={[styles.metaValue, { fontStyle: 'italic' }]}>{bird.scientific_name}</Text>
                                <View style={styles.soundIconContainer} pointerEvents="none">
                                    <Volume2 size={13} color="#FFFFFF" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    {bird.taxonomy?.genus && (
                        <View style={styles.genusRow}>
                            <Text style={styles.genusLineText}>
                                <Text style={styles.metaLabel}>Genus: </Text>
                                <Text style={styles.genusName}>{bird.taxonomy.genus}</Text>
                                {bird.taxonomy.genus_description ? (
                                    (() => {
                                        // Parse "Commonly called X" to separate label from common name
                                        const desc = bird.taxonomy.genus_description;
                                        if (!desc) return null;
                                        const match = desc.match(/^(commonly\s+called\s+)/i);
                                        if (match) {
                                            const label = match[1];
                                            const commonName = desc.slice(label.length);
                                            return (
                                                <>
                                                    <Text style={styles.genusDescription}>{`, ${label}`}</Text>
                                                    <Text style={styles.genusCommonName}>{commonName}</Text>
                                                </>
                                            );
                                        }
                                        return <Text style={styles.genusDescription}>, {desc}</Text>;
                                    })()
                                ) : !isEnrichmentComplete ? (
                                    <View style={[styles.skeletonLine, { width: 120, height: 16, marginLeft: 6, marginTop: 0, marginBottom: 0, transform: [{ translateY: 2 }] }]} />
                                ) : null}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        // flex: 1 removed to prevent layout issues
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingTop: 0, // Eliminated extra whitespace (handled by parent padding)
        marginBottom: 12,
    },
    mainTitle: {
        fontSize: 25,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    speciesOfText: {
        fontSize: 17,
        fontWeight: '400',
        color: '#999', // Lightened for better hierarchy
        letterSpacing: 0,
    },
    familyText: {
        fontSize: 19,
        fontWeight: '600',
        fontStyle: 'italic',
        color: '#E0505F',
        marginTop: 6,
        letterSpacing: -0.3,
    },
    scientificFamilyText: {
        fontSize: 16,
        fontStyle: 'italic',
        fontWeight: '400',
        color: '#888',
        letterSpacing: 0,
    },
    editBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scientificNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 0,
        marginBottom: 2,
    },
    metaContainer: {
        flex: 1,
    },
    metaRow: {
        marginBottom: 6,
        paddingHorizontal: 0,
    },
    metaFlowText: {
        fontSize: 17,
        lineHeight: 24,
    },
    metaRowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
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
    // Genus inline styles — single flowing Text block
    genusRow: {
        marginBottom: 4,
        marginTop: 2,
        paddingHorizontal: 0,
    },
    genusLineText: {
        fontSize: 17,
        lineHeight: 26,
        color: '#666',
    },
    genusName: {
        fontSize: 22,
        fontWeight: '400',
        fontStyle: 'italic',
        color: '#1A1A1A',
    },
    genusDescription: {
        fontSize: 15,
        fontWeight: '400',
        color: '#999',
    },
    genusCommonName: {
        fontSize: 18,
        fontWeight: '600',
        fontStyle: 'italic',
        color: '#2C2C2C',
        letterSpacing: -0.3,
    },
    soundIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: '#E68A2E',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    skeletonLine: {
        height: 14,
        backgroundColor: '#D4D0C8',
        borderRadius: 4,
        opacity: 0.5,
        marginTop: 4,
        marginBottom: 4,
    },
});
