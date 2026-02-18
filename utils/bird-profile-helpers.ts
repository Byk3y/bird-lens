import { HABITAT_ASSETS, NESTING_ASSETS } from '@/constants/bird-assets';
import { BirdResult } from '@/types/scanner';

/**
 * Returns the appropriate habitat asset based on bird tags or description.
 */
export const getHabitatIcon = (bird: BirdResult) => {
    const h = (bird.habitat_tags?.[0] || bird.habitat || '').toLowerCase();

    if (h.includes('forest') || h.includes('wood')) return HABITAT_ASSETS.forest;
    if (h.includes('wetland') || h.includes('river') || h.includes('lake') || h.includes('water') || h.includes('marsh')) return HABITAT_ASSETS.wetland;
    if (h.includes('grass') || h.includes('field') || h.includes('meadow') || h.includes('prairie')) return HABITAT_ASSETS.grassland;
    if (h.includes('mountain') || h.includes('rock') || h.includes('cliff')) return HABITAT_ASSETS.mountain;
    if (h.includes('shrub') || h.includes('scrub') || h.includes('thicket')) return HABITAT_ASSETS.shrub;
    if (h.includes('backyard') || h.includes('urban') || h.includes('park') || h.includes('garden')) return HABITAT_ASSETS.backyard;

    return HABITAT_ASSETS.forest; // Default
};

/**
 * Returns the appropriate nesting asset based on bird nesting info.
 */
export const getNestingIcon = (bird: BirdResult) => {
    const loc = (bird.nesting_info?.location || '').toLowerCase();
    const type = (bird.nesting_info?.type || '').toLowerCase();

    if (loc.includes('cavity') || type.includes('cavity') || loc.includes('hole')) return NESTING_ASSETS.cavity;
    if (loc.includes('burrow') || type.includes('burrow')) return NESTING_ASSETS.burrow;
    if (loc.includes('dome') || type.includes('dome')) return NESTING_ASSETS.dome;
    if (loc.includes('ground') || type.includes('ground') || type.includes('scrape') || loc.includes('shrub')) return NESTING_ASSETS.ground;
    if (loc.includes('platform') || type.includes('platform') || loc.includes('ledge') || loc.includes('building')) return NESTING_ASSETS.platform;
    if (loc.includes('scrape') || type.includes('scrape') || loc.includes('sand') || loc.includes('pebbles')) return NESTING_ASSETS.scrape;
    if (loc.includes('hanging') || type.includes('hanging') || type.includes('pouch')) return NESTING_ASSETS.hanging;
    if (loc.includes('none') || type.includes('none') || type.includes('parasitic')) return NESTING_ASSETS.none;

    return NESTING_ASSETS.cup; // Default
};

/**
 * Returns the indicator color for a bird's rarity level.
 */
export const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
        case 'common': return '#10B981'; // Green
        case 'uncommon': return '#F59E0B'; // Amber
        case 'rare': return '#EF4444'; // Red
        case 'very rare': return '#7C3AED'; // Purple
        default: return '#64748B'; // Slate
    }
};

/**
 * Types of identification displays supported.
 */
export type IdentificationMode = 'gender' | 'age' | 'fallback';

/**
 * Determines which identification comparison images to show.
 * Prioritizes visually distinct comparisons (e.g., Age) if genders are similar.
 */
export const getIdentificationMode = (bird: BirdResult): IdentificationMode => {
    const tips = getIdentificationTipsAvailability(bird);

    // Prefer Age comparison (Adult vs Juvenile) if Juvenile exists (both text AND image) AND
    // (Female is missing OR Female is visually similar to Male)
    if (tips.hasJuvenile && bird.juvenile_image_url && (tips.isFemaleSimilar || !bird.female_image_url)) {
        return 'age';
    }

    // Otherwise, prefer Gender if both exist and are distinct
    if (bird.male_image_url && bird.female_image_url && !tips.isFemaleSimilar && tips.hasFemale) {
        return 'gender';
    }

    // Final fallback logic
    if (bird.juvenile_image_url && tips.hasJuvenile) return 'age';
    if (bird.male_image_url && bird.female_image_url) return 'gender';

    return 'fallback';
};

/**
 * Checks if a bird has any valid identification tips and identifies similarities.
 */
export const getIdentificationTipsAvailability = (bird: BirdResult) => {
    const hasMale = !!(bird.identification_tips?.male && bird.identification_tips.male !== 'N/A');
    const femaleText = bird.identification_tips?.female?.toLowerCase() || '';
    const isFemaleSimilar = femaleText.includes('similar to male') || femaleText.includes('similar to the male');

    // hasFemale is true if we have data, regardless of similarity
    const hasFemale = !!(bird.identification_tips?.female && bird.identification_tips.female !== 'N/A');
    const hasJuvenile = !!(bird.identification_tips?.juvenile && bird.identification_tips.juvenile !== 'N/A');

    return {
        hasMale,
        hasFemale,
        hasJuvenile,
        isFemaleSimilar,
        // Added checks for image availability to help caller decide
        hasMaleImage: !!bird.male_image_url,
        hasFemaleImage: !!bird.female_image_url,
        hasJuvenileImage: !!bird.juvenile_image_url,
        any: hasMale || hasFemale || hasJuvenile
    };
};
