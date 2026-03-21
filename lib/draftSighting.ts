import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { IdentificationService } from '@/services/IdentificationService';
import { supabase } from '@/lib/supabase';
import { uploadToStorage } from '@/lib/uploadMedia';
import { BirdResult } from '@/types/scanner';

const DRAFT_KEY = '@draft_sighting';
const DRAFT_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const DRAFT_MEDIA_DIR = FileSystem.documentDirectory + 'drafts/';

export interface DraftSighting {
    bird: BirdResult;
    enrichedCandidates: BirdResult[];
    heroImages: Record<string, string>;
    capturedImagePath: string | null;
    recordingPath: string | null;
    location: { locationName: string; latitude: number; longitude: number } | null;
    createdAt: number;
}

interface DraftInput {
    bird: BirdResult;
    enrichedCandidates: BirdResult[];
    heroImages: Record<string, string>;
    capturedImage: string | null;
    recordingUri: string | null;
    location: { locationName: string; latitude: number; longitude: number } | null;
}

async function ensureDraftDir() {
    const info = await FileSystem.getInfoAsync(DRAFT_MEDIA_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(DRAFT_MEDIA_DIR, { intermediates: true });
    }
}

async function copyToDurable(cacheUri: string, prefix: string): Promise<string> {
    await ensureDraftDir();
    const ext = cacheUri.split('.').pop() || 'bin';
    const destPath = `${DRAFT_MEDIA_DIR}${prefix}_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: cacheUri, to: destPath });
    return destPath;
}

async function loadDraftRaw(): Promise<DraftSighting | null> {
    try {
        const json = await AsyncStorage.getItem(DRAFT_KEY);
        if (!json) return null;
        return JSON.parse(json) as DraftSighting;
    } catch (e) {
        console.error('Error reading draft sighting:', e);
        return null;
    }
}

async function deleteMediaFiles(draft: DraftSighting) {
    try {
        if (draft.capturedImagePath) {
            await FileSystem.deleteAsync(draft.capturedImagePath, { idempotent: true });
        }
        if (draft.recordingPath) {
            await FileSystem.deleteAsync(draft.recordingPath, { idempotent: true });
        }
    } catch (e) {
        // Best-effort cleanup
        console.warn('Error cleaning draft media:', e);
    }
}

export const draftSighting = {
    async saveDraftFromResult(input: DraftInput): Promise<void> {
        try {
            // Clean up any existing draft first
            const existing = await loadDraftRaw();
            if (existing) {
                await deleteMediaFiles(existing);
            }

            // Copy media to durable storage
            let capturedImagePath: string | null = null;
            let recordingPath: string | null = null;

            if (input.capturedImage?.startsWith('file://')) {
                capturedImagePath = await copyToDurable(input.capturedImage, 'image');
            }
            if (input.recordingUri?.startsWith('file://')) {
                recordingPath = await copyToDurable(input.recordingUri, 'audio');
            }

            const draft: DraftSighting = {
                bird: input.bird,
                enrichedCandidates: input.enrichedCandidates,
                heroImages: input.heroImages,
                capturedImagePath,
                recordingPath,
                location: input.location,
                createdAt: Date.now(),
            };

            await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            console.log('Draft sighting saved');
        } catch (e) {
            console.error('Error saving draft sighting:', e);
        }
    },

    async loadDraft(): Promise<DraftSighting | null> {
        const draft = await loadDraftRaw();
        if (!draft) return null;

        // TTL check
        if (Date.now() - draft.createdAt > DRAFT_TTL_MS) {
            console.log('Draft sighting expired, clearing');
            await this.clearDraft();
            return null;
        }

        // Verify media files still exist
        if (draft.capturedImagePath) {
            const info = await FileSystem.getInfoAsync(draft.capturedImagePath);
            if (!info.exists) draft.capturedImagePath = null;
        }
        if (draft.recordingPath) {
            const info = await FileSystem.getInfoAsync(draft.recordingPath);
            if (!info.exists) draft.recordingPath = null;
        }

        return draft;
    },

    async clearDraft(): Promise<void> {
        try {
            const existing = await loadDraftRaw();
            if (existing) {
                await deleteMediaFiles(existing);
            }
            await AsyncStorage.removeItem(DRAFT_KEY);
        } catch (e) {
            console.error('Error clearing draft sighting:', e);
        }
    },

    async saveDraftToCollection(
        draft: DraftSighting,
        userId: string
    ): Promise<boolean> {
        let imageUrl: string | null = null;
        let audioUrl: string | null = null;

        // Upload media in parallel using stream uploads (no base64/Buffer)
        const uploadTasks = [];

        if (draft.capturedImagePath) {
            uploadTasks.push(
                uploadToStorage(draft.capturedImagePath, `images/${userId}/${Date.now()}.webp`, 'image/webp')
                    .then(url => { imageUrl = url; })
            );
        }

        if (draft.recordingPath) {
            uploadTasks.push(
                uploadToStorage(draft.recordingPath, `audio/${userId}/${Date.now()}.wav`, 'audio/wav')
                    .then(url => { audioUrl = url; })
            );
        }

        if (uploadTasks.length > 0) {
            await Promise.all(uploadTasks);
        }

        const sightingData = IdentificationService.mapBirdToSighting(
            draft.bird, userId, audioUrl, draft.location
        );

        if (imageUrl) {
            sightingData.image_url = imageUrl;
        }

        const { error } = await supabase.from('sightings').insert(sightingData);
        if (error) throw error;

        return true;
    },
};
