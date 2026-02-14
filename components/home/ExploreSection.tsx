import { Colors, Spacing } from '@/constants/theme';
import { Compass } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const EXPLORE_TAGS = ['Poultry', 'Attracting Birds', 'Hummingbirds', 'Annual C...'];

const EXPLORE_ITEMS = [
    {
        id: '1',
        title: 'How to Identify Different Breeds of Chickens',
        tag: 'Poultry',
        image: require('@/assets/images/explore_bird.jpg'),
    },
    {
        id: '2',
        title: 'The Secret Life of Golden Pheasants',
        tag: 'Attracting Birds',
        image: require('@/assets/images/golden_pheasant.webp'),
    },
    {
        id: '3',
        title: 'Perfect Shots: Bird Photography Tips',
        tag: 'Hummingbirds',
        image: require('@/assets/images/tip_good.jpg'),
    },
    {
        id: '4',
        title: 'Essential Gear for Bird Watching',
        tag: 'Annual C...',
        image: require('@/assets/images/tip_far.jpg'),
    }
];

export const ExploreSection: React.FC = () => {
    const [selectedTag, setSelectedTag] = useState('Poultry');

    const filteredItems = EXPLORE_ITEMS.filter(item => item.tag === selectedTag);

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Compass color={Colors.primary} size={20} style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Explore</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsContainer}
                style={styles.tagsScroll}
            >
                {EXPLORE_TAGS.map((tag) => (
                    <Pressable
                        key={tag}
                        onPress={() => setSelectedTag(tag)}
                        style={[
                            styles.tag,
                            selectedTag === tag && styles.tagSelected
                        ]}
                    >
                        <Text style={[
                            styles.tagText,
                            selectedTag === tag && styles.tagTextSelected
                        ]}>{tag}</Text>
                    </Pressable>
                ))}
            </ScrollView>

            <View style={styles.cardsContainer}>
                {filteredItems.map((item) => (
                    <Pressable key={item.id} style={styles.exploreCard}>
                        <Image
                            source={item.image}
                            style={styles.exploreImage}
                            resizeMode="cover"
                        />
                        <View style={styles.exploreContent}>
                            <Text style={styles.exploreTitle} numberOfLines={1}>{item.title}</Text>
                        </View>
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: Spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: Spacing.md,
    },
    sectionIcon: {
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    tagsScroll: {
        marginBottom: Spacing.md,
    },
    tagsContainer: {
        paddingHorizontal: 12,
        gap: 8,
    },
    cardsContainer: {
        paddingHorizontal: 12,
        gap: Spacing.lg,
    },
    tag: {
        paddingHorizontal: 20,
        paddingVertical: 9,
        borderRadius: 24,
        backgroundColor: '#e5e7eb',
        borderWidth: 0,
    },
    tagSelected: {
        backgroundColor: Colors.primary,
    },
    tagText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#4b5563',
    },
    tagTextSelected: {
        color: Colors.white,
        fontWeight: '600',
    },
    exploreCard: {
        width: '100%',
        borderRadius: 12,
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
        paddingVertical: 12,
    },
    exploreTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#334155',
        letterSpacing: -0.3,
        lineHeight: 22,
    },
});
