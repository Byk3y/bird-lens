import { BirdResult } from '@/types/scanner';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp, MoreHorizontal, Notebook } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScientificClassificationProps {
    bird: BirdResult;
    onMorePress?: () => void;
}

export const ScientificClassification: React.FC<ScientificClassificationProps> = ({ bird, onMorePress }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Height ~ 3 full rows + partial 4th
    // Each row is ~82px (padding 20*2 + label 20 + value 22) + gap 8
    // 3 rows = ~270. Let's try 300 to show a peek of 4th.
    const collapsedMaxHeight = 240;

    return (
        <View>
            <View style={styles.gutter} />
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleLeft}>
                        <Notebook size={22} color="#1A1A1A" />
                        <Text style={styles.sectionTitle}>Scientific Classification</Text>
                    </View>
                    {onMorePress && (
                        <TouchableOpacity onPress={onMorePress}>
                            <View pointerEvents="none">
                                <MoreHorizontal size={20} color="#999" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={!isExpanded ? { maxHeight: collapsedMaxHeight, overflow: 'hidden' } : undefined}>
                    <View style={styles.classificationContainer}>
                        {bird.taxonomy?.genus && (
                            <View style={styles.classificationItem}>
                                <Text style={styles.classificationItemLabel}>Genus</Text>
                                <Text style={styles.classificationItemValue}>
                                    {bird.taxonomy.genus_description
                                        ? `${bird.taxonomy.genus} - ${bird.taxonomy.genus_description.replace(/^commonly called\s*/i, '')}`
                                        : bird.taxonomy.genus}
                                </Text>
                            </View>
                        )}

                        {(bird.taxonomy?.family_scientific || bird.taxonomy?.family) && (
                            <View style={styles.classificationItem}>
                                <Text style={styles.classificationItemLabel}>Family</Text>
                                <Text style={styles.classificationItemValue}>
                                    {bird.taxonomy.family_scientific
                                        ? bird.taxonomy.family
                                            ? `${bird.taxonomy.family_scientific} - ${bird.taxonomy.family}`
                                            : bird.taxonomy.family_scientific
                                        : bird.taxonomy.family}
                                </Text>
                            </View>
                        )}

                        {bird.taxonomy?.order && (
                            <View style={styles.classificationItem}>
                                <Text style={styles.classificationItemLabel}>Order</Text>
                                <Text style={styles.classificationItemValue}>
                                    {bird.taxonomy.order_description
                                        ? `${bird.taxonomy.order} - ${bird.taxonomy.order_description}`
                                        : bird.taxonomy.order}
                                </Text>
                            </View>
                        )}

                        <View style={styles.classificationItem}>
                            <Text style={styles.classificationItemLabel}>Class</Text>
                            <Text style={styles.classificationItemValue}>Aves - Birds</Text>
                        </View>

                        <View style={styles.classificationItem}>
                            <Text style={styles.classificationItemLabel}>Phylum</Text>
                            <Text style={styles.classificationItemValue}>Chordata - Chordates</Text>
                        </View>
                    </View>

                    {!isExpanded && (
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.8)', '#FFFFFF']}
                            style={styles.gradientOverlay}
                            pointerEvents="none"
                        />
                    )}
                </View>

                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setIsExpanded(!isExpanded)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.expandButtonText}>
                        {isExpanded ? 'Show Less' : 'Learn More'}
                    </Text>
                    <View pointerEvents="none">
                        {isExpanded ? (
                            <ChevronUp size={16} color="#BA6526" />
                        ) : (
                            <ChevronDown size={16} color="#BA6526" />
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    gutter: {
        height: 12,
        backgroundColor: '#F2F2F2',
        marginHorizontal: 0,
        marginBottom: 16,
    },
    section: {
        marginBottom: 12,
        paddingHorizontal: 13,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        marginLeft: 10,
    },
    classificationContainer: {
        gap: 8,
        marginTop: 8,
    },
    classificationItem: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    classificationItemLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    classificationItemValue: {
        fontSize: 18,
        color: '#666',
        fontWeight: '500',
        lineHeight: 24,
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
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
    },
});
