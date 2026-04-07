/**
 * Throwing shim for @hyperfixi/core.
 *
 * The language server dynamically imports @hyperfixi/core in a try/catch.
 * This shim throws on import so the catch block fires and the server uses
 * its Chevrotain parser + fallback diagnostics instead.
 */
throw new Error('shim: @hyperfixi/core not available in standalone mode');
