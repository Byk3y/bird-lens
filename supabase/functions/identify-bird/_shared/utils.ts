/**
 * JSON Cleaning and parsing logic for AI responses.
 */
export function cleanAndParseJson(text: string, source: string) {
    let clean = text;
    try {
        // 1. Remove markdown blocks
        clean = clean.replace(/```json\n?/, "").replace(/\n?```/, "").trim();

        // 2. Structure extraction (do this early, before any content manipulation)
        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');
        const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
        const lastBrace = clean.lastIndexOf('}');
        const lastBracket = clean.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);

        if (start !== -1 && end > start) {
            clean = clean.substring(start, end + 1);
        }

        // 3. Try parsing as-is first (AI with response_format: json_object usually returns valid JSON)
        try {
            return JSON.parse(clean);
        } catch (_firstAttempt) {
            // Fall through to cleaning logic
        }

        // 4. Fix trailing commas
        clean = clean.replace(/,\s*([}\]])/g, "$1");

        // 5. Handle inch/feet marks safely — only match when the quote is used as a
        //    measurement symbol INSIDE a string, not as a JSON delimiter.
        clean = clean.replace(/(\d+)"(?=\s*[a-zA-Z])/g, '$1 inches');
        clean = clean.replace(/(\d+)'(?=\s*[a-zA-Z])/g, '$1 feet');

        // 6. Fix unescaped newlines and tabs inside strings
        clean = clean.replace(/(:\s*")((?:[^"\\]|\\.)*?)(")/g, (_match, p1, p2, p3) => {
            return p1 + p2.replace(/\n/g, "\\n").replace(/\t/g, "\\t") + p3;
        });

        return JSON.parse(clean);
    } catch (e: any) {
        console.error('JSON Parse Error (' + source + '):', e);
        throw new Error('Failed to parse ' + source + ' AI response: ' + e.message);
    }
}

/**
 * Fixes Xeno-Canto URLs and constructs direct MP3 links.
 */
export function fixXenoCantoUrl(url: string, rec?: any): string {
    if (!url) return '';

    // 1. Always ensure protocol for // protocol-less URLs
    let finalUrl = url.startsWith('//') ? 'https:' + url : url;

    // 2. Handle Xeno-Canto download links to make them direct where possible
    // This provides a much better experience for browser/mobile audio players
    if (finalUrl.includes('xeno-canto.org') && (finalUrl.endsWith('/download') || finalUrl.includes('/download?'))) {
        const osciUrl = rec?.osci?.large || rec?.osci?.medium || rec?.osci?.small;
        if (osciUrl) {
            const match = osciUrl.match(/sounds\/uploaded\/([^/]+)\//);
            if (match?.[1]) {
                const dir = match[1];
                const idMatch = finalUrl.match(/xeno-canto\.org\/(\d+)/);
                if (idMatch?.[1]) {
                    const fileName = rec?.['file-name'] || 'XC' + idMatch[1] + '.mp3';
                    return 'https://xeno-canto.org/sounds/uploaded/' + dir + '/' + fileName;
                }
            }
        }
    }

    // 3. Handle relative paths
    if (finalUrl.startsWith('/') && !finalUrl.startsWith('//')) {
        finalUrl = 'https://xeno-canto.org' + finalUrl;
    }

    return finalUrl;
}

/**
 * Checks if a byte array starts with the "RIFF" and "WAVE" signatures.
 */
export function isWavHeaderPresent(bytes: Uint8Array): boolean {
    if (bytes.length < 12) return false;
    // Magic: "R" "I" "F" "F"
    if (bytes[0] !== 82 || bytes[1] !== 73 || bytes[2] !== 70 || bytes[3] !== 70) return false;
    // Magic: "W" "A" "V" "E" at offset 8
    if (bytes[8] !== 87 || bytes[9] !== 65 || bytes[10] !== 86 || bytes[11] !== 69) return false;
    return true;
}

/**
 * Adds a WAV header to a raw PCM byte array.
 * Assumes 16-bit, Mono, 48000Hz as standard for this app.
 */
export function addWavHeader(pcmData: Uint8Array, sampleRate = 48000, channels = 1, bitDepth = 16): Uint8Array {
    const dataLength = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, (sampleRate * channels * bitDepth) / 8, true);
    view.setUint16(32, (channels * bitDepth) / 8, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    new Uint8Array(buffer, 44).set(pcmData);
    return new Uint8Array(buffer);
}

/**
 * Maps raw BirdNET API output to internal candidate format.
 */
export function mapBirdNetToCandidates(birdNetJson: any): any[] {
    if (!birdNetJson || !birdNetJson.predictions || !Array.isArray(birdNetJson.predictions)) {
        return [];
    }

    const extractedCandidates: any[] = [];

    birdNetJson.predictions.forEach((segment: any) => {
        if (segment.species && Array.isArray(segment.species)) {
            segment.species.forEach((speciesEntry: any) => {
                const rawName = speciesEntry.species_name;
                const probability = speciesEntry.probability;

                if (rawName && probability !== undefined && probability >= 0.1) {
                    // BirdNET often uses format: "Scientific_Name_Common_Name" or "Scientific_Name"
                    // We want to extract the scientific name and common name accurately.
                    // Usually the last part after the last underscore is the start of the common name
                    // But scientific names can be "Genus_species".
                    // A better approach: splits by underscore and tries to reconstruct.

                    const parts = rawName.split('_');
                    if (parts.length >= 3) {
                        // Likely format: Genus_species_Common Name
                        const scientificName = parts[0] + '_' + parts[1];
                        const commonName = parts.slice(2).join(' ').trim();

                        extractedCandidates.push({
                            name: commonName,
                            scientific_name: scientificName,
                            confidence: probability,
                            identifying_features: `Identified via BirdNET acoustic analysis`,
                            taxonomy: {}
                        });
                    } else if (parts.length === 2) {
                        // Format: ScientificName_CommonName
                        extractedCandidates.push({
                            name: parts[1].trim(),
                            scientific_name: parts[0].trim(),
                            confidence: probability,
                            identifying_features: `Identified via BirdNET acoustic analysis`,
                            taxonomy: {}
                        });
                    }
                }
            });
        }
    });

    // Sort by confidence descending
    extractedCandidates.sort((a, b) => b.confidence - a.confidence);

    // Deduplicate (take highest confidence per species)
    const uniqueCandidates: any[] = [];
    const seenNames = new Set<string>();
    for (const candidate of extractedCandidates) {
        if (!seenNames.has(candidate.scientific_name)) {
            seenNames.add(candidate.scientific_name);
            uniqueCandidates.push(candidate);
        }
    }

    return uniqueCandidates.slice(0, 3);
}
