import { Colors, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
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

export const ExploreSection: React.FC = () => {
    const [selectedTag, setSelectedTag] = useState('Poultry');

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

            <View style={styles.exploreCard}>
                <Image
                    source={require('@/assets/images/explore_bird.jpg')}
                    style={styles.exploreImage}
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)']}
                    style={styles.exploreGradient}
                />
                <View style={styles.exploreContent}>
                    <Text style={styles.exploreTitle}>Capturing the Beauty of Early Birds</Text>
                    <Text style={styles.exploreSubtitle}>5 min read • Photography</Text>
                </View>
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
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionIcon: {
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    tagsContainer: {
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.lg,
        gap: 8,
    },
    tag: {
        paddingHorizontal: 20,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: Colors.white,
        marginRight: 4,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    tagSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    tagText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748b',
        letterSpacing: -0.2,
    },
    tagTextSelected: {
        color: Colors.white,
    },
    exploreCard: {
        marginHorizontal: Spacing.md,
        borderRadius: 24,
        overflow: 'hidden',
        height: 320,
        backgroundColor: '#f1f5f9',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 10,
    },
    exploreImage: {
        width: '100%',
        height: '100%',
    },
    exploreGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    exploreContent: {
        position: 'absolute',
        bottom: Spacing.lg,
        left: Spacing.lg,
        right: Spacing.lg,
    },
    exploreTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.white,
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    exploreSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
    },
});
