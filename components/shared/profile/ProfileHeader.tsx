import { BirdResult } from '@/types/scanner';
import { Edit2, Volume2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProfileHeaderProps {
    bird: BirdResult;
    onPronounce?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ bird, onPronounce }) => {
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
                </View>
                <Pressable style={styles.editBtn}>
                    <Edit2 size={18} color="#999" />
                </Pressable>
            </View>

            <View style={styles.scientificNameRow}>
                <View style={styles.metaContainer}>
                    {bird.also_known_as && bird.also_known_as.length > 0 && (
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Also known as: </Text>
                            <Text style={styles.metaValue}>{bird.also_known_as.join(', ')}</Text>
                        </View>
                    )}
                    {bird.scientific_name && (
                        <TouchableOpacity
                            style={styles.metaRow}
                            onPress={onPronounce}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.metaLabel}>Scientific name: </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.metaValue, { fontStyle: 'italic' }]}>{bird.scientific_name}</Text>
                                <View style={styles.soundIconContainer}>
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
                                    <Text style={styles.genusDescription}>, {bird.taxonomy.genus_description}</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        paddingHorizontal: 0,
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
    soundIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: '#E68A2E',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
});
