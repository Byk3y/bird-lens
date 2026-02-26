import { Paywall } from '@/components/Paywall';
import { Colors, Spacing } from '@/constants/theme';
import { useSubscriptionGating } from '@/hooks/useSubscriptionGating';
import { SearchService } from '@/services/SearchService';
import { BirdResult } from '@/types/scanner';
import { BirdSuggestion, SearchHistoryItem } from '@/types/search';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
    { id: 'landbirds', title: 'Common Landbirds', query: 'Wild Turkey', image: require('@/assets/images/categories/landbirds.png') },
    { id: 'waders', title: 'Common Waders', query: 'Heron', image: require('@/assets/images/categories/waders.png') },
    { id: 'natatores', title: 'Common Natatores', query: 'Mallard', image: require('@/assets/images/categories/natatores.png') },
    { id: 'songbirds', title: 'Common Songbirds', query: 'European Robin', image: require('@/assets/images/categories/songbirds.png') },
    { id: 'raptors', title: 'Common Raptors', query: 'Red-tailed Hawk', image: require('@/assets/images/categories/raptors.png') },
    { id: 'colourful', title: 'Common Colourful Birds', query: 'American Goldfinch', image: require('@/assets/images/categories/colourful.png') },
];

export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<BirdSuggestion[]>([]);
    const [history, setHistory] = useState<SearchHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPaywallVisible, setIsPaywallVisible] = useState(false);
    const { isGated } = useSubscriptionGating();
    const searchInputRef = useRef<TextInput>(null);
    const debounceTimer = useRef<any>(null);

    useEffect(() => {
        loadHistory();
        SearchService.clearHistory(); // Ensure history is not persisted as requested
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }, []);

    const loadHistory = async () => {
        const data = await SearchService.getRecentSearches();
        setHistory(data);
    };

    const handleSearch = async (text: string) => {
        setQuery(text);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (text.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        debounceTimer.current = setTimeout(async () => {
            const suggestions = await SearchService.searchBirds(text);
            setResults(suggestions);
            setLoading(false);
        }, 400);
    };

    const handleSelectBird = async (bird: BirdSuggestion) => {
        if (isGated) {
            setIsPaywallVisible(true);
            return;
        }

        const skeletonBird: BirdResult = {
            name: bird.preferred_common_name || bird.name,
            scientific_name: bird.name,
            also_known_as: [],
            taxonomy: {
                family: '',
                family_scientific: '',
                genus: bird.name.split(' ')[0],
                genus_description: '',
            },
            identification_tips: { male: '', female: '' },
            description: '',
            diet: '',
            diet_tags: [],
            habitat: '',
            habitat_tags: [],
            nesting_info: { description: '', location: '', type: '' },
            feeder_info: { attracted_by: [], feeder_types: [] },
            behavior: '',
            rarity: 'Common',
            confidence: 1,
            inat_photos: bird.default_photo ? [{
                url: bird.default_photo.square_url,
                attribution: 'iNaturalist',
                license: 'cc-by'
            }] : []
        };

        router.replace({
            pathname: '/bird-detail',
            params: {
                birdData: JSON.stringify(skeletonBird),
                imageUrl: bird.default_photo?.square_url
            }
        });
    };



    const renderHighlight = (text: string, highlight: string) => {
        if (!highlight.trim()) return <Text style={styles.resultName}>{text}</Text>;

        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <Text style={styles.resultName}>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <Text key={i} style={styles.highlightText}>{part}</Text>
                    ) : (
                        <Text key={i}>{part}</Text>
                    )
                )}
            </Text>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header with Search Input */}
            <View style={[styles.header, { paddingTop: insets.top + (Spacing.xs) }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <View pointerEvents="none">
                        <ChevronLeft color={Colors.text} size={28} />
                    </View>
                </TouchableOpacity>

                <View style={styles.inputWrapper}>
                    <View pointerEvents="none">
                        <Search color={Colors.textTertiary} size={20} style={styles.innerSearchIcon} />
                    </View>
                    <TextInput
                        ref={searchInputRef}
                        value={query}
                        onChangeText={handleSearch}
                        placeholder="Search birds..."
                        placeholderTextColor={Colors.textTertiary}
                        style={styles.input}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearInputButton}>
                            <View pointerEvents="none">
                                <X color={Colors.textTertiary} size={18} />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {query.length < 2 ? (
                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Recent Searches (Labels Only) */}
                    {history.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Recent Searches</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyList}>
                                {history.map((item) => (
                                    <View
                                        key={item.id}
                                        style={styles.historyPill}
                                    >
                                        <Text style={styles.historyText}>{item.preferred_common_name}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Category Discovery Grid */}
                    <View style={styles.section}>
                        <View style={styles.grid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={styles.categoryCard}
                                    onPress={() => handleSearch(cat.query)}
                                >
                                    <Image source={cat.image} style={styles.categoryImage} resizeMode="cover" />
                                    <View style={styles.categoryOverlay}>
                                        <Text style={styles.categoryTitle}>{cat.title.split(' ')[0]}</Text>
                                        <Text style={styles.categoryTitleBold}>{cat.title.split(' ').slice(1).join(' ')}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.resultsContainer}>
                    {loading && results.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={Colors.primary} size="large" />
                        </View>
                    ) : (
                        <FlatList
                            data={results}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.resultsList}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.resultRow}
                                    onPress={() => handleSelectBird(item)}
                                >
                                    <View style={styles.thumbnailContainer}>
                                        {item.default_photo ? (
                                            <Image
                                                source={{ uri: item.default_photo.square_url }}
                                                style={styles.thumbnail}
                                            />
                                        ) : (
                                            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                                                <View pointerEvents="none">
                                                    <Search color={Colors.textTertiary} size={16} />
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.resultInfo}>
                                        {renderHighlight(item.preferred_common_name || item.name, query)}
                                        <Text style={styles.scientificName}>{item.name}</Text>
                                    </View>
                                    <View pointerEvents="none">
                                        <ChevronRight color={Colors.textTertiary} size={18} />
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                !loading ? (
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>No birds found for "{query}"</Text>
                                    </View>
                                ) : null
                            }
                        />
                    )}
                </View>
            )}

            {isPaywallVisible && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
                    <Paywall onClose={() => setIsPaywallVisible(false)} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#f1f1f1',
    },
    backButton: {
        padding: Spacing.xs,
        marginRight: Spacing.xs,
    },
    inputWrapper: {
        flex: 1,
        height: 44,
        backgroundColor: '#F1F5F9',
        borderRadius: 22,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
    },
    innerSearchIcon: {
        marginRight: Spacing.xs,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
        fontWeight: '500',
    },
    clearInputButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    section: {
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    historyList: {
        paddingBottom: Spacing.sm,
    },
    historyPill: {
        backgroundColor: '#F1F5F9',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
        marginRight: Spacing.sm,
    },
    historyText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingBottom: 40,
    },
    categoryCard: {
        width: '48.5%',
        aspectRatio: 1.6,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 10,
        backgroundColor: '#eee',
    },
    categoryImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    categoryOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.15)',
        padding: 12,
        justifyContent: 'flex-start',
    },
    categoryTitle: {
        fontSize: 14,
        color: Colors.white,
        fontWeight: '500',
        lineHeight: 18,
    },
    categoryTitleBold: {
        fontSize: 16,
        color: Colors.white,
        fontWeight: '700',
        lineHeight: 20,
    },
    resultsContainer: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    resultsList: {
        paddingVertical: 0,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#f1f1f1',
    },
    thumbnailContainer: {
        width: 44,
        height: 44,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 12,
        backgroundColor: '#f8f8f8',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    thumbnailPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultInfo: {
        flex: 1,
    },
    resultName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 1,
    },
    highlightText: {
        color: Colors.primary,
        fontWeight: '700',
    },
    scientificName: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: Colors.textTertiary,
        textAlign: 'center',
    },
});
