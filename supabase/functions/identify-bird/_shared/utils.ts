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
