import { Colors, Spacing, Typography } from '@/constants/theme';
import { BirdResult } from '@/types/scanner';
import { useRouter } from 'expo-router';
import { Bird, ExternalLink, Info, RefreshCcw, Save } from 'lucide-react-native';
import { MotiView } from 'moti';
import React from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface IdentificationResultProps {
    result: BirdResult;
    isSaving: boolean;
    onSave: () => void;
    onReset: () => void;
}

export const IdentificationResult: React.FC<IdentificationResultProps> = ({
    result,
    isSaving,
    onSave,
    onReset,
}) => {
    const router = useRouter();

    const handleViewProfile = () => {
        router.push({
            pathname: '/bird-detail',
            params: { birdData: JSON.stringify(result) }
        });
    };
    return (
        <View style={styles.resultContainer}>
            <ScrollView contentContainerStyle={styles.resultScroll}>
                <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    style={styles.resultCard}
                >
                    <View style={styles.resultHeader}>
                        <View style={styles.birdIconContainer}>
                            <Bird color={Colors.primary} size={40} />
                        </View>
                        <View style={styles.resultTitleContainer}>
                            <Text style={styles.resultName}>{result.name}</Text>
                            <Text style={styles.resultScientific}>
                                {result.scientific_name}
                                <Text style={styles.speciesOf}>, a species of </Text>
                                {result.taxonomy.family} ({result.taxonomy.family_scientific})
                            </Text>
                        </View>
                    </View>

                    {result.also_known_as && result.also_known_as.length > 0 && (
                        <View style={styles.akaBox}>
                            <Text style={styles.akaLabel}>Also known as: </Text>
                            <Text style={styles.akaContent}>{result.also_known_as.join(', ')}</Text>
                        </View>
                    )}

                    <View style={styles.genusBox}>
                        <Text style={styles.genusLabel}>
                            Genus: <Text style={styles.genusValue}>{result.taxonomy.genus}</Text>
                            <Text style={styles.genusDesc}>, {result.taxonomy.genus_description}</Text>
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.resultStat}>
                            <Text style={styles.statLabel}>RARITY</Text>
                            <Text
                                style={[
                                    styles.statValue,
                                    { color: result.rarity === 'Rare' ? Colors.accent : Colors.primary },
                                ]}
                            >
                                {result.rarity}
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.resultStat}>
                            <Text style={styles.statLabel}>CONFIDENCE</Text>
                            <Text style={styles.statValue}>{Math.round(result.confidence * 100)}%</Text>
                        </View>
                    </View>

                    <View style={styles.tipsContainer}>
                        <View style={styles.factHeader}>
                            <Bird size={16} color={Colors.accent} />
                            <Text style={styles.factHeaderText}>How to identify it?</Text>
                        </View>
                        <View style={styles.tipRow}>
                            <Text style={styles.tipLabel}>Male: </Text>
                            <Text style={styles.tipText}>{result.identification_tips.male}</Text>
                        </View>
                        <View style={styles.tipRow}>
                            <Text style={styles.tipLabel}>Female: </Text>
                            <Text style={styles.tipText}>{result.identification_tips.female}</Text>
                        </View>
                    </View>

                    <View style={styles.factContainer}>
                        <View style={styles.factHeader}>
                            <Info size={16} color={Colors.accent} />
                            <Text style={styles.factHeaderText}>Naturalist Description</Text>
                        </View>
                        <Text style={styles.resultFact}>{result.description}</Text>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            onPress={handleViewProfile}
                            style={[styles.actionBtn, styles.profileBtn]}
                        >
                            <ExternalLink color={Colors.white} size={20} />
                            <Text style={styles.actionBtnText}>View Full Profile</Text>
                        </TouchableOpacity>

                        <View style={styles.secondaryActions}>
                            <TouchableOpacity
                                onPress={onSave}
                                disabled={isSaving}
                                style={[styles.actionBtn, styles.saveBtn]}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <>
                                        <Save color={Colors.white} size={20} />
                                        <Text style={styles.actionBtnText}>Save</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onReset}
                                style={[styles.actionBtn, styles.resetBtn]}
                            >
                                <RefreshCcw color={Colors.white} size={20} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </MotiView>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    resultContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    resultScroll: {
        padding: Spacing.lg,
        paddingTop: 60,
    },
    resultCard: {
        backgroundColor: Colors.surface,
        borderRadius: 32,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
    },
    resultHeader: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    birdIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    resultTitleContainer: {
        alignItems: 'center',
    },
    resultName: {
        ...Typography.h1,
        color: Colors.white,
        textAlign: 'center',
    },
    resultScientific: {
        ...Typography.body,
        color: Colors.textTertiary,
        marginTop: 4,
        textAlign: 'center',
    },
    speciesOf: {
        color: Colors.textTertiary,
        fontStyle: 'normal',
    },
    akaBox: {
        marginBottom: Spacing.md,
    },
    akaLabel: {
        ...Typography.caption,
        color: Colors.textTertiary,
    },
    akaContent: {
        ...Typography.body,
        color: Colors.white,
        fontWeight: '500',
    },
    genusBox: {
        marginBottom: Spacing.xl,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    genusLabel: {
        ...Typography.body,
        color: Colors.textTertiary,
    },
    genusValue: {
        fontStyle: 'italic',
        color: Colors.white,
    },
    genusDesc: {
        color: Colors.textTertiary,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.background,
        borderRadius: 20,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    resultStat: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    statLabel: {
        ...Typography.label,
        color: Colors.textTertiary,
        marginBottom: 4,
    },
    statValue: {
        ...Typography.h3,
        color: Colors.white,
    },
    factContainer: {
        backgroundColor: Colors.surfaceLight,
        padding: Spacing.lg,
        borderRadius: 20,
        marginBottom: Spacing.xl,
    },
    factHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    factHeaderText: {
        ...Typography.label,
        color: Colors.accent,
        letterSpacing: 1,
    },
    resultFact: {
        ...Typography.body,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    tipsContainer: {
        backgroundColor: Colors.surfaceLight,
        padding: Spacing.lg,
        borderRadius: 20,
        marginBottom: Spacing.md,
    },
    tipRow: {
        marginBottom: 8,
    },
    tipLabel: {
        ...Typography.body,
        fontWeight: '700',
        color: Colors.white,
    },
    tipText: {
        ...Typography.body,
        color: Colors.textSecondary,
    },
    actionRow: {
        gap: Spacing.md,
    },
    actionBtn: {
        height: 60,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        flex: 1,
    },
    resetBtn: {
        backgroundColor: Colors.surfaceLight,
        width: 60,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    profileBtn: {
        backgroundColor: Colors.accent,
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    actionBtnText: {
        ...Typography.body,
        fontWeight: '700',
        color: Colors.white,
    },
});
