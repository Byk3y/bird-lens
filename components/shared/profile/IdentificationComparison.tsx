import { BirdResult } from '@/types/scanner';
import { getIdentificationMode, getIdentificationTipsAvailability } from '@/utils/bird-profile-helpers';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface IdentificationComparisonProps {
    bird: BirdResult;
    onPress?: () => void;
    variant?: 'inline' | 'full';
}

export const IdentificationComparison: React.FC<IdentificationComparisonProps> = ({
    bird,
    onPress,
    variant = 'inline'
}) => {
    const mode = getIdentificationMode(bird);
    const { hasMale, hasFemale, hasJuvenile, isFemaleSimilar } = getIdentificationTipsAvailability(bird);

    if (variant === 'inline') {
        const renderInlineItem = (title: string, imageUrl: string) => (
            <View style={styles.idItem} key={`${title}-${imageUrl}`}>
                <Text style={styles.idItemTitle}>{title}</Text>
                <TouchableOpacity
                    style={styles.idImageWrapper}
                    onPress={onPress}
                    activeOpacity={0.9}
                >
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.idImage}
                        cachePolicy="memory-disk"
                    />
                </TouchableOpacity>
            </View>
        );

        if (mode === 'gender') {
            return (
                <View style={styles.idContainer}>
                    {hasMale && renderInlineItem('Male', bird.male_image_url!)}
                    {hasFemale && renderInlineItem(isFemaleSimilar ? 'Female (Similar)' : 'Female', bird.female_image_url!)}
                </View>
            );
        }

        if (mode === 'age') {
            const adultImage = bird.male_image_url || bird.images?.[0] || bird.female_image_url;
            return (
                <View style={styles.idContainer}>
                    {adultImage && renderInlineItem('Adult', adultImage)}
                    {hasJuvenile && renderInlineItem('Juvenile', bird.juvenile_image_url!)}
                </View>
            );
        }

        // Fallback
        const fallbackImage = bird.male_image_url || bird.female_image_url || bird.juvenile_image_url || bird.images?.[0];
        const fallbackLabel = bird.juvenile_image_url && !bird.male_image_url ? "Juvenile" : "Adult";
        return (
            <View style={styles.idContainer}>
                {fallbackImage && renderInlineItem(fallbackLabel, fallbackImage)}
            </View>
        );
    }

    // Full variant (detail view)
    const renderFullItem = (label: string, imageUrl: string, description?: string) => (
        <View style={styles.detailSection} key={`${label}-${imageUrl}`}>
            <Text style={styles.sectionTitle}>{label}</Text>
            <View style={styles.imageContainer}>
                <Image source={{ uri: imageUrl }} style={styles.fullImage} cachePolicy="memory-disk" />
                <View style={styles.labelBadge}>
                    <Text style={styles.labelText}>{label}</Text>
                </View>
            </View>
            {description && description !== 'N/A' && (
                <View style={styles.descCard}>
                    <Text style={styles.descText}>{description}</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.fullContainer}>
            {mode === 'gender' ? (
                <>
                    {hasMale && renderFullItem('Male', bird.male_image_url!, bird.identification_tips.male)}
                    {hasFemale && renderFullItem(isFemaleSimilar ? 'Female (Similar)' : 'Female', bird.female_image_url!, bird.identification_tips.female)}
                </>
            ) : (
                <>
                    {(bird.male_image_url || bird.images?.[0] || bird.female_image_url) && renderFullItem(
                        'Adult',
                        (bird.male_image_url || bird.images?.[0] || bird.female_image_url)!,
                        bird.identification_tips.male || bird.identification_tips.female
                    )}
                    {hasJuvenile && renderFullItem('Juvenile', bird.juvenile_image_url!, bird.identification_tips.juvenile)}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // Inline Styles (BirdProfileContent)
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

    // Full Styles (identification-detail)
    fullContainer: {
        paddingHorizontal: 0, // Parent padding covers this
    },
    detailSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    imageContainer: {
        width: '100%',
        height: 240,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    labelBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    labelText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    descCard: {
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    descText: {
        fontSize: 17,
        lineHeight: 26,
        color: '#334155',
    },
});
