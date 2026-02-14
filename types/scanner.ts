export interface BirdResult {
    name: string;
    scientific_name: string;
    rarity: string;
    fact: string;
    confidence: number;
    error?: string;
}

export type ScanMode = 'photo' | 'sound';
