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

/**
 * Debounce a function call
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: any = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Calculates password strength and returns score (0-4) and requirements met
 */
export interface PasswordRequirement {
    id: string;
    label: string;
    met: boolean;
}

export function calculatePasswordStrength(password: string) {
    const requirements: PasswordRequirement[] = [
        { id: 'length', label: '8+ characters', met: password.length >= 8 },
        { id: 'uppercase', label: 'Uppercase letter', met: /[A-Z]/.test(password) },
        { id: 'number', label: 'Number', met: /[0-9]/.test(password) },
        { id: 'special', label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
    ];

    const score = requirements.filter(r => r.met).length;

    let label = 'Weak';
    let color = '#FF3B30'; // Red

    if (score === 2) {
        label = 'Fair';
        color = '#FF9500'; // Orange
    } else if (score === 3) {
        label = 'Good';
        color = '#FFCC00'; // Yellow
    } else if (score === 4) {
        label = 'Strong';
        color = '#34C759'; // Green
    }

    return { score, label, color, requirements };
}

