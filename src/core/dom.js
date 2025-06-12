/**
 * Core DOM manipulation utilities for HyperFixi
 * Handles different content placement strategies
 */

/**
 * DOM manipulation strategies
 */
export const SWAP_STRATEGIES = {
    OUTER_HTML: 'outerHTML',
    INNER_HTML: 'innerHTML', 
    BEFORE_END: 'beforeend',
    AFTER_BEGIN: 'afterbegin'
};

/**
 * Map placement keywords to DOM swap strategies
 * @param {string} placement - Placement keyword
 * @returns {string} DOM swap strategy
 */
export function mapPlacementToSwap(placement) {
    switch (placement) {
        case 'replace':
            return SWAP_STRATEGIES.OUTER_HTML;
        case 'put into':
            return SWAP_STRATEGIES.INNER_HTML;
        case 'append to':
            return SWAP_STRATEGIES.BEFORE_END;
        case 'prepend to':
            return SWAP_STRATEGIES.AFTER_BEGIN;
        default:
            return placement; // Allow custom swap methods
    }
}

/**
 * Apply content to target element using specified swap strategy
 * @param {Element} target - Target DOM element
 * @param {string} content - Content to insert
 * @param {string} swapStrategy - How to insert content
 * @returns {boolean} Success indicator
 */
export function applySwap(target, content, swapStrategy) {
    if (!target || !content) return false;

    try {
        switch (swapStrategy) {
            case SWAP_STRATEGIES.OUTER_HTML:
                target.outerHTML = content;
                return true;
                
            case SWAP_STRATEGIES.INNER_HTML:
                target.innerHTML = content;
                return true;
                
            case SWAP_STRATEGIES.BEFORE_END:
                target.insertAdjacentHTML('beforeend', content);
                return true;
                
            case SWAP_STRATEGIES.AFTER_BEGIN:
                target.insertAdjacentHTML('afterbegin', content);
                return true;
                
            default:
                // Custom swap function
                if (typeof swapStrategy === 'function') {
                    swapStrategy({ target, text: content });
                    return true;
                }
                
                // Fallback to outerHTML
                target.outerHTML = content;
                return true;
        }
    } catch (error) {
        console.error('DOM swap failed:', error);
        return false;
    }
}

/**
 * Check if an element is still in the document
 * @param {Element} element - Element to check
 * @returns {boolean} True if element is in document
 */
export function isElementInDocument(element) {
    return element && document.contains(element);
}