import { INaturalistPhoto } from '@/types/scanner';

export class INaturalistService {
    private static BASE_URL = 'https://api.inaturalist.org/v1';

    static async fetchPhotos(scientificName: string): Promise<INaturalistPhoto[]> {
        try {
            // Updated query: removed restrictive life stage filters
            // quality_grade=research ensures high consensus
            // per_page=20 to give us enough variety to find vertical shots
            const response = await fetch(
                `${this.BASE_URL}/observations?taxon_name=${encodeURIComponent(
                    scientificName
                )}&quality_grade=research&order=desc&order_by=votes&per_page=20&photos=true`
            );
            const data = await response.json();

            if (!data.results || data.results.length === 0) return [];

            const photos: INaturalistPhoto[] = [];

            data.results.forEach((obs: any) => {
                // Safety check: Filter out common "dead bird" tags or descriptions
                const desc = (obs.description || '').toLowerCase();
                const tags = (obs.tags || []).map((t: any) =>
                    typeof t === 'string' ? t.toLowerCase() : (t.name || '').toLowerCase()
                );

                const isUpsetting = desc.includes('dead') || desc.includes('killed') ||
                    desc.includes('window strike') || desc.includes('carcass') ||
                    tags.includes('dead') || tags.includes('carcass');

                if (isUpsetting) return;

                obs.observation_photos?.forEach((op: any) => {
                    if (op.photo) {
                        // Check dimensions for vertical preference
                        const dims = op.photo.original_dimensions || { width: 1, height: 1 };
                        const isVertical = dims.height > dims.width;

                        // Quality check: prefers larger images if possible
                        // replace 'square' with 'large'
                        const imageUrl = op.photo.url.replace('square', 'large');

                        photos.push({
                            url: imageUrl,
                            attribution: op.photo.attribution || 'Unknown',
                            license: op.photo.license_code || 'All Rights Reserved',
                            isVertical: isVertical
                        } as any);
                    }
                });
            });

            // Sort logic: 
            // 1. Prioritize Vertical/Portrait images (better for mobile UI)
            // 2. Limit to 8 as requested
            const sortedPhotos = (photos as any[]).sort((a, b) => {
                if (a.isVertical && !b.isVertical) return -1;
                if (!a.isVertical && b.isVertical) return 1;
                return 0;
            });

            return sortedPhotos.slice(0, 8).map(({ isVertical, ...p }) => p);
        } catch (error) {
            console.error('Error fetching iNaturalist photos:', error);
            return [];
        }
    }
}
