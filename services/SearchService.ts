import { BirdSuggestion, SearchHistoryItem } from '@/types/search';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@search_history';
const MAX_HISTORY = 10;
const INAT_API_URL = 'https://api.inaturalist.org/v1/taxa/autocomplete';

export class SearchService {
    /**
     * Search for birds using iNaturalist autocomplete API.
     * Filters for Class Aves (taxon_id=3).
     */
    static async searchBirds(query: string): Promise<BirdSuggestion[]> {
        if (!query || query.length < 2) return [];

        try {
            const url = `${INAT_API_URL}?q=${encodeURIComponent(query)}&taxon_id=3&rank=species,subspecies&per_page=10`;
            const response = await fetch(url);
            const data = await response.json();

            // iNaturalist returns an object with a 'results' array
            return data.results || [];
        } catch (error) {
            console.error('SearchService: Failed to fetch birds:', error);
            return [];
        }
    }

    /**
     * Get recent search history from AsyncStorage.
     */
    static async getRecentSearches(): Promise<SearchHistoryItem[]> {
        try {
            const history = await AsyncStorage.getItem(HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('SearchService: Failed to load history:', error);
            return [];
        }
    }

    /**
     * Save a selected bird to the search history.
     */
    static async saveToHistory(bird: BirdSuggestion): Promise<void> {
        try {
            const history = await this.getRecentSearches();

            // Create new history item
            const newItem: SearchHistoryItem = {
                id: bird.id,
                name: bird.name,
                preferred_common_name: bird.preferred_common_name || bird.name,
                thumbnail: bird.default_photo?.square_url,
                timestamp: Date.now()
            };

            // Remove existing entry if it's the same bird
            const filteredHistory = history.filter(item => item.id !== bird.id);

            // Prepend new item and limit size
            const updatedHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY);

            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
        } catch (error) {
            console.error('SearchService: Failed to save history:', error);
        }
    }

    /**
     * Clear the search history.
     */
    static async clearHistory(): Promise<void> {
        try {
            await AsyncStorage.removeItem(HISTORY_KEY);
        } catch (error) {
            console.error('SearchService: Failed to clear history:', error);
        }
    }
}
