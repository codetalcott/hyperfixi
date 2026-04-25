/**
 * Throwing shim for @lokascript/framework.
 *
 * The language server dynamically imports @lokascript/framework in a try/catch.
 * This shim throws on import so the catch block fires and the server omits
 * LSE bracket notation from hover docs.
 */
throw new Error('shim: @lokascript/framework not available in standalone mode');
