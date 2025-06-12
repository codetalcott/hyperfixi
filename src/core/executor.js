/**
 * Core HTTP request execution for HyperFixi
 * Handles fetch requests and response processing
 */

/**
 * Execute an HTTP request using the fetch API
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options (method, body, headers)
 * @returns {Promise<{response: Response, text: string}>} Response data
 */
export async function executeHTTPRequest(url, options = {}) {
    const fetchOptions = {
        method: options.method || 'GET',
        body: options.body,
        headers: options.headers || {}
    };

    const response = await fetch(url, fetchOptions);
    const text = await response.text();

    return { response, text };
}

/**
 * Resolve dynamic expressions using hyperscript runtime
 * @param {Object} expression - Hyperscript expression to resolve
 * @param {Object} runtime - Hyperscript runtime instance
 * @param {Object} context - Execution context
 * @returns {Promise<any>} Resolved value
 */
export async function resolveExpression(expression, runtime, context) {
    if (!expression) return null;
    return await runtime.resolve(expression, context);
}

/**
 * Build fetch options from command configuration
 * @param {Object} command - Parsed command object
 * @param {Object} runtime - Hyperscript runtime instance
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Resolved fetch options
 */
export async function buildFetchOptions(command, runtime, context) {
    const options = {};

    if (command.options.method) {
        options.method = await resolveExpression(command.options.method, runtime, context);
    }

    if (command.options.body) {
        options.body = await resolveExpression(command.options.body, runtime, context);
    }

    if (command.options.headers) {
        options.headers = await resolveExpression(command.options.headers, runtime, context);
    }

    return options;
}

/**
 * Create a fixi-style configuration object
 * @param {string} url - Resolved URL
 * @param {Object} options - Fetch options
 * @param {Element} element - Triggering element
 * @param {Event} event - Triggering event
 * @param {Element|null} target - Target element
 * @param {string} swap - Swap method
 * @returns {Object} Fixi configuration object
 */
export function createFixiConfig(url, options, element, event, target = null, swap = 'outerHTML') {
    return {
        url: url,
        method: options.method || 'GET',
        body: options.body,
        headers: options.headers || {},
        target: target || element,
        swap: swap,
        trigger: event,
        response: null,
        text: null
    };
}