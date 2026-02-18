import { BirdResult } from '@/types/scanner';
import { getHabitatIcon, getNestingIcon } from '@/utils/bird-profile-helpers';
import { Image } from 'expo-image';
import { ChevronRight, Home, Map } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { OverlapAvatars } from '../../common/OverlapAvatars';

interface BirdingTipsGridProps {
    bird: BirdResult;
    onOpenTips?: (section?: 'diet' | 'feeder' | 'habitat' | 'nesting') => void;
}

export const BirdingTipsGrid: React.FC<BirdingTipsGridProps> = ({ bird, onOpenTips }) => {
    // Diet logic
    let dietTags = [...(bird.diet_tags || [])];
    if (bird.diet && !dietTags.includes(bird.diet)) {
        dietTags.push(bird.diet);
    }
    dietTags = dietTags.filter(t => {
        const low = t?.toLowerCase();
        return low && low !== 'none' && low !== 'n/a' && low !== 'nil' && low !== 'unknown' && low !== 'none.';
    });

    if (dietTags.length > 1) {
        const hasSpecifics = dietTags.some(t => {
            const low = t.toLowerCase();
            return low !== 'omnivore' && low !== 'generalist' && low !== 'mixed';
        });
        if (hasSpecifics) {
            dietTags = dietTags.filter(t => {
                const low = t.toLowerCase();
                return low !== 'omnivore' && low !== 'generalist' && low !== 'mixed';
            });
        }
    }

    const hasDiet = dietTags.length > 0;
    const hasFeeder = bird.feeder_info?.feeder_types && bird.feeder_info.feeder_types.length > 0;

    return (
        <View style={styles.gridContainer}>
            {/* Full Width Tip: Diet */}
            <TouchableOpacity style={styles.wideCard} onPress={() => onOpenTips?.('diet')} activeOpacity={0.7}>
                <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Diet</Text>
                </View>
                <View style={styles.cardRight}>
                    <OverlapAvatars tags={dietTags} type="diet" />
                    <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                </View>
            </TouchableOpacity>

            {/* Full Width Tip: Feeder */}
            {hasFeeder && (
                <TouchableOpacity style={styles.wideCard} onPress={() => onOpenTips?.('feeder')} activeOpacity={0.7}>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardLabel}>Feeder</Text>
                    </View>
                    <View style={styles.cardRight}>
                        <OverlapAvatars tags={bird.feeder_info.feeder_types} type="feeder" />
                        <ChevronRight size={20} color="#A1A1A1" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                    </View>
                </TouchableOpacity>
            )}

            {/* Two Column Row: Habitat & Nesting */}
            <View style={styles.row}>
                <TouchableOpacity style={styles.halfCard} onPress={() => onOpenTips?.('habitat')} activeOpacity={0.7}>
                    <View style={styles.halfCardTop}>
                        <Text style={styles.cardLabel}>Habitat</Text>
                        <Map size={20} color="#666" />
                    </View>
                    <View style={styles.halfCardMain}>
                        <Image source={getHabitatIcon(bird)} style={[styles.habitatIcon, !bird.habitat && { opacity: 0.1 }]} cachePolicy="memory-disk" />
                        <Text style={[styles.halfCardValue, !bird.habitat && { color: '#CCC' }]}>{bird.habitat_tags?.[0] || bird.habitat || 'Loading...'}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.halfCard} onPress={() => onOpenTips?.('nesting')} activeOpacity={0.7}>
                    <View style={styles.halfCardTop}>
                        <Text style={styles.cardLabel}>Nesting</Text>
                        <Home size={20} color="#666" />
                    </View>
                    <View style={styles.halfCardMain}>
                        <Image source={getNestingIcon(bird)} style={[styles.habitatIcon, !bird.nesting_info && { opacity: 0.1 }]} cachePolicy="memory-disk" />
                        <Text style={[styles.halfCardValue, !bird.nesting_info && { color: '#CCC' }]}>{bird.nesting_info?.location || 'Loading...'}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
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
    habitatIcon: {
        width: 64,
        height: 64,
        resizeMode: 'contain',
        marginVertical: 4,
    },
    halfCardValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
    },
});
