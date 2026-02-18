/**
 * JSON Cleaning and parsing logic for AI responses.
 */
export function cleanAndParseJson(text: string, source: string) {
    let clean = text;
    try {
        // 1. Remove markdown blocks
        clean = clean.replace(/```json\n?/, "").replace(/\n?```/, "").trim();

        // 2. Handle unescaped or escaped internal quotes (common in bird measurements like 8" or 10-12")
        clean = clean.replace(/(\d+)(?:\\"|")/g, '$1 inches');
        clean = clean.replace(/(\d+)(?:\\'|')/g, '$1 feet');

        // 3. Fix unescaped newlines and tabs inside strings
        clean = clean.replace(/(:\s*")([^"]*)(")/g, (match, p1, p2, p3) => {
            return p1 + p2.replace(/\n/g, "\\n").replace(/\t/g, "\\t") + p3;
        });

        // 4. Fix trailing commas
        clean = clean.replace(/,\s*([}\]])/g, "$1");

        // 5. Structure extraction
        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');
        const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
        const lastBrace = clean.lastIndexOf('}');
        const lastBracket = clean.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);

        if (start !== -1 && end > start) {
            clean = clean.substring(start, end + 1);
        }

        return JSON.parse(clean);
    } catch (e: any) {
        console.error(`JSON Parse Error (${source}):`, e);
        throw new Error(`Failed to parse ${source} AI response: ${e.message}`);
    }
}

/**
 * Fixes Xeno-Canto URLs and constructs direct MP3 links.
 */
export function fixXenoCantoUrl(url: string, rec?: any): string {
    if (!url) return '';
    let finalUrl = url.startsWith('//') ? `https:${url}` : url;

    const osciUrl = rec?.osci?.large || rec?.osci?.medium || rec?.osci?.small;
    if (finalUrl.includes('xeno-canto.org') && finalUrl.endsWith('/download') && osciUrl) {
        const match = osciUrl.match(/sounds\/uploaded\/([^/]+)\//);
        if (match?.[1]) {
            const dir = match[1];
            const idMatch = finalUrl.match(/xeno-canto\.org\/(\d+)\/download/);
            if (idMatch?.[1]) {
                const fileName = rec?.['file-name'] || `XC${idMatch[1]}.mp3`;
                return `https://xeno-canto.org/sounds/uploaded/${dir}/${fileName}`;
            }
        }
    }
    return finalUrl;
}
