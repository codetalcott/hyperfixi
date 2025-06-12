/**
 * Placement strategy utilities for HyperFixi
 * Centralizes placement keyword handling
 */

import { mapPlacementToSwap } from '../core/dom.js';

/**
 * Supported placement strategies
 */
export const PLACEMENTS = {
    REPLACE: 'replace',
    PUT_INTO: 'put into', 
    APPEND_TO: 'append to',
    PREPEND_TO: 'prepend to'
};

/**
 * Placement keyword validation
 */
export const PLACEMENT_KEYWORDS = {
    [PLACEMENTS.REPLACE]: {
        keywords: ['replace'],
        requiredFollowup: null
    },
    [PLACEMENTS.PUT_INTO]: {
        keywords: ['put', 'into'],
        requiredFollowup: 'into'
    },
    [PLACEMENTS.APPEND_TO]: {
        keywords: ['append', 'to'],
        requiredFollowup: 'to'
    },
    [PLACEMENTS.PREPEND_TO]: {
        keywords: ['prepend', 'to'],
        requiredFollowup: 'to'
    }
};

/**
 * Validate placement keyword sequence
 * @param {string} primaryKeyword - First keyword (put, append, prepend)
 * @param {string|null} followupKeyword - Second keyword (into, to)
 * @returns {string|null} Placement type or null if invalid
 */
export function validatePlacementSequence(primaryKeyword, followupKeyword) {
    for (const [placement, config] of Object.entries(PLACEMENT_KEYWORDS)) {
        if (config.keywords[0] === primaryKeyword) {
            if (config.requiredFollowup === followupKeyword) {
                return placement;
            }
        }
    }
    return null;
}

/**
 * Get all supported placement types
 * @returns {Array<string>} Supported placement types
 */
export function getAllPlacements() {
    return Object.values(PLACEMENTS);
}

/**
 * Check if a placement type is supported
 * @param {string} placement - Placement type to check
 * @returns {boolean} True if placement is supported
 */
export function isValidPlacement(placement) {
    return Object.values(PLACEMENTS).includes(placement);
}

/**
 * Get DOM swap strategy for placement
 * @param {string} placement - Placement type
 * @returns {string} DOM swap strategy
 */
export function getSwapStrategy(placement) {
    return mapPlacementToSwap(placement);
}

/**
 * Get placement description for documentation
 * @param {string} placement - Placement type
 * @returns {string} Human-readable description
 */
export function getPlacementDescription(placement) {
    switch (placement) {
        case PLACEMENTS.REPLACE:
            return 'Replace the target element entirely';
        case PLACEMENTS.PUT_INTO:
            return 'Replace the inner content of the target element';
        case PLACEMENTS.APPEND_TO:
            return 'Add content to the end of the target element';
        case PLACEMENTS.PREPEND_TO:
            return 'Add content to the beginning of the target element';
        default:
            return 'Custom placement strategy';
    }
}