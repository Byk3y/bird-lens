import { parseNDJSONLine } from '../lib/utils';
import { BirdResult } from '../types/scanner';

export type IdentificationChunk =
    | { type: 'progress'; message: string }
    | { type: 'candidates'; data: any[]; raw_content?: string }
    | { type: 'media'; index: number; data: any }
    | { type: 'metadata'; index: number; data: any }
    | { type: 'heartbeat' }
    | { type: 'done'; duration: number }
    | { type: 'error'; message: string };

export class IdentificationService {
    /**
     * Maps raw candidate data + media into a final BirdResult structure.
     */
    static toBirdResult(bird: any, media?: any): BirdResult {
        return {
            ...bird,
            inat_photos: media?.inat_photos || [],
            male_image_url: media?.male_image_url,
            female_image_url: media?.female_image_url,
            juvenile_image_url: media?.juvenile_image_url,
            sounds: media?.sounds || [],
            wikipedia_image: media?.wikipedia_image,
            gbif_taxon_key: media?.gbif_taxon_key,
        };
    }

    /**
     * Processes an NDJSON stream from the Edge Function.
     * Takes a reader and a callback for each parsed chunk.
     */
    static async processStream(
        reader: ReadableStreamDefaultReader<Uint8Array>,
        onChunk: (chunk: IdentificationChunk) => void
    ): Promise<void> {
        const decoder = new TextDecoder();
        let buffer = '';
        let receivedCandidates = false;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const chunk = parseNDJSONLine(line);
                    if (chunk) {
                        if ((chunk as any).type === 'candidates') {
                            receivedCandidates = true;
                        }
                        onChunk(chunk as IdentificationChunk);
                    }
                }
            }

            // Process any remaining tail
            if (buffer.trim()) {
                const chunk = parseNDJSONLine(buffer);
                if (chunk) {
                    if ((chunk as any).type === 'candidates') {
                        receivedCandidates = true;
                    }
                    onChunk(chunk as IdentificationChunk);
                }
            }
        } catch (error) {
            console.error('[IdentificationService] Stream processing error:', error);
            if (receivedCandidates) {
                // Stream broke after we already got candidates — results are usable
                console.warn('[IdentificationService] Stream interrupted after receiving candidates; results are still valid.');
            } else {
                // Stream broke before we got any candidates — this is a real error
                onChunk({ type: 'error', message: 'Stream interrupted unexpectedly' });
            }
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Standardizes error parsing from the Edge Function response.
     */
    static async parseError(response: Response): Promise<{ message: string; status: number }> {
        const status = response.status;
        let message = `Server error (${status})`;

        try {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                message = errorJson.error || message;
            } catch {
                message = errorText || message;
            }
        } catch {
            // Use generic message
        }

        return { message, status };
    }

    /**
     * Maps a BirdResult to the structure expected by the Supabase 'sightings' table.
     * This centralizes mapping logic for easier testing and consistency.
     */
    static mapBirdToSighting(bird: BirdResult, userId: string, audioUrl?: string | null): Record<string, any> {
        return {
            user_id: userId,
            species_name: bird.name,
            scientific_name: bird.scientific_name,
            rarity: bird.rarity,
            confidence: bird.confidence,
            image_url: bird.inat_photos?.[0]?.url || bird.wikipedia_image || null,
            audio_url: audioUrl || null,
            metadata: {
                also_known_as: bird.also_known_as,
                taxonomy: bird.taxonomy,
                identification_tips: bird.identification_tips,
                description: bird.description,
                diet: bird.diet,
                diet_tags: bird.diet_tags,
                habitat: bird.habitat,
                habitat_tags: bird.habitat_tags,
                nesting_info: bird.nesting_info,
                feeder_info: bird.feeder_info,
                behavior: bird.behavior,
                rarity: bird.rarity,
                key_facts: bird.key_facts,
                distribution_area: bird.distribution_area,
                conservation_status: bird.conservation_status,
                inat_photos: bird.inat_photos,
                sounds: bird.sounds,
                female_image_url: bird.female_image_url,
                male_image_url: bird.male_image_url,
                juvenile_image_url: bird.juvenile_image_url,
                wikipedia_image: bird.wikipedia_image,
                gbif_taxon_key: bird.gbif_taxon_key,
                raw_ai_response: bird.metadata?.raw_ai_response
            }
        };
    }
}
