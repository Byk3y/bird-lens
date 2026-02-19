export interface BirdSuggestion {
    id: number;
    name: string; // Scientific name
    preferred_common_name: string;
    rank: string;
    default_photo?: {
        square_url: string;
        medium_url: string;
    };
    iconic_taxon_name?: string;
}

export interface SearchHistoryItem {
    id: number;
    name: string;
    preferred_common_name: string;
    thumbnail?: string;
    timestamp: number;
}
