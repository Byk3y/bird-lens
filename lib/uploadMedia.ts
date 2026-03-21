import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

/**
 * Uploads a local file to Supabase Storage using native file upload.
 * Avoids base64 encoding and Buffer polyfills by uploading directly from disk.
 */
export async function uploadToStorage(
    fileUri: string,
    fileName: string,
    contentType: string,
): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/sightings/${fileName}`;

    const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': contentType,
        },
    });

    if (result.status < 200 || result.status >= 300) {
        throw new Error(`Upload failed (${result.status}): ${result.body}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from('sightings')
        .getPublicUrl(fileName);

    return publicUrl;
}
