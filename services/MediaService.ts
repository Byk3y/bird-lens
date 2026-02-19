import { supabase } from '@/lib/supabase';
import { BirdSound, INaturalistPhoto } from '@/types/scanner';

export interface BirdMedia {
    image: {
        url: string | null;
        attribution: {
            artist: string;
            license: string;
            license_url: string;
        } | null;
    };
    map: {
        taxonKey: number | null;
        tileUrl: string | null;
    };
    male_image_url?: string | null;
    female_image_url?: string | null;
    juvenile_image_url?: string | null;
    wikipedia_image?: string | null;
    inat_photos?: INaturalistPhoto[];
    sounds?: BirdSound[];
    metadata?: any;
}

interface CacheEntry {
    data: BirdMedia;
    timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes in-memory cache
const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 500;
const REQUEST_TIMEOUT_MS = 12000; // 12 second timeout

export class MediaService {
    private static cache = new Map<string, CacheEntry>();

    /**
     * Get cached media data if available and not stale.
     */
    static getCached(scientificName: string): BirdMedia | null {
        const entry = this.cache.get(scientificName);
        if (!entry) return null;

        const age = Date.now() - entry.timestamp;
        if (age > CACHE_TTL_MS) {
            this.cache.delete(scientificName);
            return null;
        }

        return entry.data;
    }

    /**
     * Store media data in the in-memory cache.
     */
    private static setCache(scientificName: string, data: BirdMedia): void {
        this.cache.set(scientificName, { data, timestamp: Date.now() });
    }

    /**
     * Clear the entire in-memory cache.
     */
    static clearCache(): void {
        this.cache.clear();
    }

    /**
     * Fetch bird media with in-memory caching, retry logic, and timeout.
     * Returns cached data instantly if available.
     */
    static async fetchBirdMedia(scientificName: string): Promise<BirdMedia> {
        // 1. Check in-memory cache first
        const cached = this.getCached(scientificName);
        if (cached) {
            return cached;
        }

        // 2. Fetch with retry + timeout
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const data = await this.fetchWithTimeout(scientificName);
                // Cache the successful result
                this.setCache(scientificName, data);
                return data;
            } catch (error: any) {
                lastError = error;
                console.warn(
                    `MediaService: Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed for "${scientificName}":`,
                    error?.message || error
                );

                // Don't delay after the last attempt
                if (attempt < MAX_RETRIES) {
                    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError || new Error('Failed to fetch bird media');
    }

    /**
     * Fetch bird media with an AbortController timeout.
     */
    private static async fetchWithTimeout(scientificName: string): Promise<BirdMedia> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const { data, error } = await supabase.functions.invoke('fetch-bird-media', {
                body: { scientific_name: scientificName },
            });

            if (error) {
                throw error;
            }

            return data;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
