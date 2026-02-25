import { Colors } from '@/constants/theme';
import { Tutorial } from '@/types/tutorial';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

// Mapping for local starter assets
const LOCAL_IMAGE_MAP: Record<string, any> = {
    'mastering_lens_hero': require('@/assets/images/birding-tips/mastering_lens_hero.webp'),
    'ai_enhancer_hero': require('@/assets/images/birding-tips/ai_enhancer_hero.webp'),
    'backyard_sanctuary_hero': require('@/assets/images/birding-tips/backyard_sanctuary_hero.jpg'),
    'backyard_birdbath': require('@/assets/images/birding-tips/backyard_birdbath.jpg'),
    'feeding_buffet_hero': require('@/assets/images/birding-tips/feeding_buffet_hero.jpg'),
    'sounds_hero_sparrow': require('@/assets/images/birding-tips/sounds_hero_sparrow.jpg'),
    'seasonal_hero_goldfinch': require('@/assets/images/birding-tips/seasonal_hero_goldfinch.jpg'),
};

interface TutorialCardProps {
    tutorial: Tutorial;
    onPress: (tutorial: Tutorial) => void;
}

export const TutorialCard: React.FC<TutorialCardProps> = ({ tutorial, onPress }) => {
    const isLocal = tutorial.cover_image_url.startsWith('local:');
    const localKey = isLocal ? tutorial.cover_image_url.replace('local:', '') : '';
    const imageSource = isLocal ? LOCAL_IMAGE_MAP[localKey] : { uri: tutorial.cover_image_url };

    return (
        <Pressable key={tutorial.id} style={styles.exploreCard} onPress={() => onPress(tutorial)}>
            <ExpoImage
                source={imageSource}
                style={styles.exploreImage}
                contentFit="cover"
                transition={200}
            />
            <View style={styles.exploreContent}>
                <Text style={styles.exploreTitle} numberOfLines={2}>{tutorial.title}</Text>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    exploreCard: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: Colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    exploreImage: {
        width: '100%',
        height: 205,
    },
    exploreContent: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    exploreTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1e293b',
        letterSpacing: -0.3,
        lineHeight: 22,
        marginBottom: 8,
    },
    tagBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
