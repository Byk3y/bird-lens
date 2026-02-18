import { BirdResult } from '@/types/scanner';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp, FileText, MoreHorizontal } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface KeyFactsSectionProps {
    bird: BirdResult;
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

const getBirdColor = (color: string) => {
    return BIRD_COLOR_MAP[color] || '#E2E8F0';
};

export const KeyFactsSection: React.FC<KeyFactsSectionProps> = ({ bird }) => {
    const [isFactsExpanded, setIsFactsExpanded] = useState(false);

    if (!bird.key_facts) return null;

    // Determine total number of potential rows
    const hasSize = !!bird.key_facts.size;
    const hasWingspan = !!bird.key_facts.wingspan;
    const hasWeight = !!bird.key_facts.weight;
    const hasLife = !!bird.key_facts.life_expectancy;
    const hasWingShape = !!bird.key_facts.wing_shape;
    const hasTailShape = !!bird.key_facts.tail_shape;
    const hasColors = bird.key_facts.colors && bird.key_facts.colors.length > 0;

    const totalRows = [
        hasSize, hasWingspan, hasWeight, hasLife,
        hasWingShape, hasTailShape, hasColors
    ].filter(Boolean).length;

    // Show "Learn More" if more than 3 items
    const showLearnMore = totalRows > 3;

    // Height calculation:
    // 3 rows fully visible + partial 4th
    // Row height approx 56px (padding 18*2 + line 20) + margin 1 = 57
    // 3 rows = 171
    // + peek of 4th (say 20px) = ~190-200
    // Actually paddingVertical is 18. FontSize 18.
    // Let's use a fixed height that covers 3 rows comfortably and cuts the 4th.
    // Each row is roughly 60px height including margin.
    // 3 rows = 180. Let's set max height to 200 to show a sliver of 4th.
    const collapsedMaxHeight = 175;

    return (
        <View style={styles.section}>
            <View style={[styles.sectionHeaderRow, { marginBottom: 12 }]}>
                <View style={styles.sectionTitleLeft}>
                    <FileText size={22} color="#1A1A1A" />
                    <Text style={styles.sectionTitle}>Key Facts</Text>
                </View>
                <MoreHorizontal size={20} color="#999" />
            </View>

            <View style={(!isFactsExpanded && showLearnMore) ? { maxHeight: collapsedMaxHeight, overflow: 'hidden' } : undefined}>
                <View style={styles.factsContainer}>
                    <View style={[styles.factRow, { backgroundColor: '#F8F8F8' }]}>
                        <Text style={styles.factLabel}>Size</Text>
                        <Text style={styles.factValue}>{bird.key_facts.size || 'N/A'}</Text>
                    </View>
                    <View style={styles.factRow}>
                        <Text style={styles.factLabel}>Wing Span</Text>
                        <Text style={styles.factValue}>{bird.key_facts.wingspan || 'N/A'}</Text>
                    </View>
                    <View style={[styles.factRow, { backgroundColor: '#F8F8F8' }]}>
                        <Text style={styles.factLabel}>Weight</Text>
                        <Text style={styles.factValue}>{bird.key_facts.weight || 'N/A'}</Text>
                    </View>
                    <View style={styles.factRow}>
                        <Text style={styles.factLabel}>Life Expectancy</Text>
                        <Text style={styles.factValue}>{bird.key_facts.life_expectancy || 'N/A'}</Text>
                    </View>

                    {/* Render extra rows always, but hidden by overflow when collapsed */}
                    <View style={[styles.factRow, { backgroundColor: '#F8F8F8' }]}>
                        <Text style={styles.factLabel}>Wing Shape</Text>
                        <Text style={styles.factValue}>{bird.key_facts.wing_shape || 'N/A'}</Text>
                    </View>
                    <View style={styles.factRow}>
                        <Text style={styles.factLabel}>Tail Shape</Text>
                        <Text style={styles.factValue}>{bird.key_facts.tail_shape || 'N/A'}</Text>
                    </View>
                    {hasColors && (
                        <View style={[styles.factRow, { backgroundColor: '#F8F8F8' }]}>
                            <Text style={styles.factLabel}>Primary Colors</Text>
                            <View style={styles.colorsContainer}>
                                {bird.key_facts.colors!.map((color, idx) => (
                                    <View
                                        key={idx}
                                        style={[styles.colorCircle, { backgroundColor: getBirdColor(color) }]}
                                    />
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                {(!isFactsExpanded && showLearnMore) && (
                    <LinearGradient
                        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.95)']}
                        style={styles.gradientOverlay}
                        pointerEvents="none"
                    />
                )}
            </View>

            {showLearnMore && (
                <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setIsFactsExpanded(!isFactsExpanded)}
                    activeOpacity={0.7}
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
            )}
        </View>
    );
};

const styles = StyleSheet.create({
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
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
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
});
