import { Colors, Spacing } from '@/constants/theme';
import { useTutorials } from '@/hooks/useTutorials';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { Tutorial } from '@/types/tutorial';
import { useRouter } from 'expo-router';
import { Compass } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { TutorialCard } from './TutorialCard';

const EXPLORE_TAGS = ['Basics', 'Backyard', 'Feeding', 'Photography', 'Sounds', 'Seasonal'];

export const ExploreSection: React.FC = () => {
    const router = useRouter();
    const [selectedTag, setSelectedTag] = useState('Basics');

    // Using TanStack Query for the list
    const { data: tutorials = [], isLoading: loading } = useTutorials();

    // Prefetching logic: Pre-warm the cache for tutorials as they become relevant
    useEffect(() => {
        if (tutorials.length > 0) {
            // Prefetch the top 3 latest tutorials immediately for "Instant Open"
            tutorials.slice(0, 3).forEach(tutorial => {
                queryClient.prefetchQuery({
                    queryKey: ['tutorial', tutorial.slug],
                    queryFn: async () => {
                        const { data, error } = await supabase
                            .from('tutorials')
                            .select('*')
                            .eq('slug', tutorial.slug)
                            .single();
                        if (error) throw error;
                        return data as Tutorial;
                    },
                    staleTime: 1000 * 60 * 10, // 10 minutes
                });
            });
        }
    }, [tutorials]);

    const filteredItems = tutorials.filter(item => item.category === selectedTag);

    const handleTutorialPress = (tutorial: Tutorial) => {
        // Optional: Ensure it's prefetched on tap too in case it wasn't in top 3
        queryClient.prefetchQuery({
            queryKey: ['tutorial', tutorial.slug],
            queryFn: async () => {
                const { data, error } = await supabase
                    .from('tutorials')
                    .select('*')
                    .eq('slug', tutorial.slug)
                    .single();
                if (error) throw error;
                return data as Tutorial;
            },
        });

        router.push(`/tutorial/${tutorial.slug}`);
    };

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
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color={Colors.primary} />
                    </View>
                ) : filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                        <TutorialCard
                            key={item.id}
                            tutorial={item}
                            onPress={handleTutorialPress}
                        />
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No tutorials found in this category yet.</Text>
                    </View>
                )}
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
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    emptyText: {
        color: '#64748b',
        fontSize: 15,
        fontWeight: '500',
    },
});
