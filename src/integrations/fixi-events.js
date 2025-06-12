/**
 * Fixi events integration for HyperFixi
 * Provides full compatibility with fixi.js event system
 */

import { 
    emitConfigEvent,
    emitBeforeEvent, 
    emitAfterEvent,
    emitErrorEvent,
    emitFinallyEvent,
    emitSwappedEvent
} from '../core/events.js';

/**
 * Fixi event handler that provides full event compatibility
 */
export class FixiEventHandler {
    /**
     * Handle events before HTTP request
     * @param {Element} element - Target element
     * @param {Object} cfg - Configuration object
     * @returns {Promise<boolean>} True if request should continue
     */
    async handleBeforeEvents(element, cfg) {
        // Emit fx:config event
        const configContinue = emitConfigEvent(element, cfg);
        if (!configContinue) {
            return false;
        }
        
        // Emit fx:before event
        const beforeContinue = emitBeforeEvent(element, cfg);
        if (!beforeContinue) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Handle events after HTTP request
     * @param {Element} element - Target element
     * @param {Object} cfg - Configuration object with response
     * @returns {Promise<boolean>} True if swapping should continue
     */
    async handleAfterEvents(element, cfg) {
        // Emit fx:after event
        const afterContinue = emitAfterEvent(element, cfg);
        return afterContinue;
    }
    
    /**
     * Handle events after DOM swapping
     * @param {Element} element - Target element
     * @param {Object} cfg - Configuration object
     */
    handleSwappedEvents(element, cfg) {
        emitSwappedEvent(element, cfg);
    }
    
    /**
     * Handle error events
     * @param {Element} element - Target element
     * @param {Error} error - Error object
     * @param {Object|null} cfg - Configuration object (may be null)
     * @param {Object} command - Command object
     */
    handleErrorEvents(element, error, cfg, command) {
        emitErrorEvent(element, error, cfg, command);
    }
    
    /**
     * Handle finally events
     * @param {Element} element - Target element
     * @param {Object} cfg - Configuration object
     */
    handleFinallyEvents(element, cfg) {
        emitFinallyEvent(element, cfg);
    }
}

/**
 * Create a fixi event handler instance
 * @returns {FixiEventHandler} Event handler instance
 */
export function createFixiEventHandler() {
    return new FixiEventHandler();
}

/**
 * Minimal event handler that only emits essential events
 */
export class MinimalEventHandler {
    /**
     * Handle events before HTTP request (minimal)
     * @returns {Promise<boolean>} Always true (no cancellation)
     */
    async handleBeforeEvents() {
        return true;
    }
    
    /**
     * Handle events after HTTP request (minimal)
     * @returns {Promise<boolean>} Always true (no cancellation)
     */
    async handleAfterEvents() {
        return true;
    }
    
    /**
     * Handle events after DOM swapping (minimal)
     */
    handleSwappedEvents() {
        // No-op for minimal
    }
    
    /**
     * Handle error events (minimal)
     * @param {Element} element - Target element
     * @param {Error} error - Error object
     */
    handleErrorEvents(element, error) {
        // Only emit hyperfixi error event for minimal compatibility
        if (element) {
            element.dispatchEvent(new CustomEvent('fixi:error', {
                detail: { error },
                bubbles: true
            }));
        }
    }
    
    /**
     * Handle finally events (minimal)
     */
    handleFinallyEvents() {
        // No-op for minimal
    }
}

/**
 * Create a minimal event handler instance
 * @returns {MinimalEventHandler} Minimal event handler instance
 */
export function createMinimalEventHandler() {
    return new MinimalEventHandler();
}

/**
 * No-op event handler that disables all events
 */
export class NoEventHandler {
    async handleBeforeEvents() { return true; }
    async handleAfterEvents() { return true; }
    handleSwappedEvents() {}
    handleErrorEvents() {}
    handleFinallyEvents() {}
}

/**
 * Create a no-op event handler instance
 * @returns {NoEventHandler} No-op event handler instance
 */
export function createNoEventHandler() {
    return new NoEventHandler();
}