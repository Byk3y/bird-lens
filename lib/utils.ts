/**
 * Parses a single line of NDJSON into a typed chunk.
 */
export function parseNDJSONLine(line: string): { type: string;[key: string]: any } | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    try {
        return JSON.parse(trimmed);
    } catch {
        // Fallback: try to find the JSON object within the line
        try {
            const start = trimmed.indexOf('{');
            const end = trimmed.lastIndexOf('}');
            if (start !== -1 && end > start) {
                return JSON.parse(trimmed.substring(start, end + 1));
            }
        } catch {
            // Still failed
        }
        console.warn('Failed to parse NDJSON line:', trimmed.slice(0, 100));
        return null;
    }
}
