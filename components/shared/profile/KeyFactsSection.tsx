import { BirdResult } from '@/types/scanner';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp, FileText, MoreHorizontal } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface KeyFactsSectionProps {
    bird: BirdResult;
    isEnrichmentComplete?: boolean;
    onMorePress?: () => void;
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

export const KeyFactsSection: React.FC<KeyFactsSectionProps> = ({ bird, isEnrichmentComplete = true, onMorePress }) => {
    const [isFactsExpanded, setIsFactsExpanded] = useState(false);

    if (!bird.key_facts) {
        if (isEnrichmentComplete) return null;

        return (
            <View style={styles.section}>
                <View style={[styles.sectionHeaderRow, { marginBottom: 12 }]}>
                    <View style={styles.sectionTitleLeft}>
                        <FileText size={22} color="#1A1A1A" />
                        <Text style={styles.sectionTitle}>Key Facts</Text>
                    </View>
                </View>
                <View style={styles.factsContainer}>
                    {[1, 2, 3].map((_, index) => (
                        <View
                            key={`skeleton-${index}`}
                            style={[
                                styles.factRow,
                                { backgroundColor: index % 2 === 0 ? '#F8F8F8' : 'transparent', height: 58, justifyContent: 'center', alignItems: 'flex-start' }
                            ]}
                        >
                            <View style={{ height: 16, width: index === 1 ? '70%' : '90%', backgroundColor: '#D4D0C8', borderRadius: 4, opacity: 0.5 }} />
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    // Define all potential rows in priority order
    const allRows = [
        { label: 'Size', value: bird.key_facts.size },
        { label: 'Wing Span', value: bird.key_facts.wingspan },
        { label: 'Conservation Status', value: bird.conservation_status },
        { label: 'Wing Shape', value: bird.key_facts.wing_shape },
        { label: 'Tail Shape', value: bird.key_facts.tail_shape },
        { label: 'Primary Colors', value: bird.key_facts.colors, isColor: true },
    ];

    // Filter out rows that are missing or "N/A"
    const visibleRows = allRows.filter(row => {
        if (row.isColor) return row.value && Array.isArray(row.value) && row.value.length > 0;
        return row.value && row.value !== 'N/A' && row.value !== '';
    });

    if (visibleRows.length === 0) return null;

    // Show "Learn More" if more than 3 items
    const showLearnMore = visibleRows.length > 3;
    const collapsedMaxHeight = 175;

    return (
        <View style={styles.section}>
            <View style={[styles.sectionHeaderRow, { marginBottom: 12 }]}>
                <View style={styles.sectionTitleLeft}>
                    <FileText size={22} color="#1A1A1A" />
                    <Text style={styles.sectionTitle}>Key Facts</Text>
                </View>
                {onMorePress && (
                    <TouchableOpacity onPress={onMorePress}>
                        <View pointerEvents="none">
                            <MoreHorizontal size={20} color="#999" />
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            <View style={(!isFactsExpanded && showLearnMore) ? { maxHeight: collapsedMaxHeight, overflow: 'hidden' } : undefined}>
                <View style={styles.factsContainer}>
                    {visibleRows.map((row, index) => (
                        <View
                            key={row.label}
                            style={[
                                styles.factRow,
                                { backgroundColor: index % 2 === 0 ? '#F8F8F8' : 'transparent' }
                            ]}
                        >
                            <Text style={styles.factLabel}>{row.label}</Text>
                            {row.isColor ? (
                                <View style={styles.colorsContainer}>
                                    {(row.value as string[]).map((color, idx) => (
                                        <View
                                            key={idx}
                                            style={[styles.colorCircle, { backgroundColor: getBirdColor(color) }]}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.factValue}>{row.value as string}</Text>
                            )}
                        </View>
                    ))}
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
                    <View pointerEvents="none">
                        {isFactsExpanded ? (
                            <ChevronUp size={16} color="#BA6526" />
                        ) : (
                            <ChevronDown size={16} color="#BA6526" />
                        )}
                    </View>
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
