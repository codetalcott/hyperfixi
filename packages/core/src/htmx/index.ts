/**
 * HyperFixi htmx Compatibility Layer
 *
 * Provides support for htmx-style attributes (hx-*) that get
 * translated to hyperscript and executed by the HyperFixi runtime.
 */

export { HtmxAttributeProcessor, type HtmxProcessorOptions } from './htmx-attribute-processor.js';

export { translateToHyperscript, hasHtmxAttributes, type HtmxConfig } from './htmx-translator.js';
