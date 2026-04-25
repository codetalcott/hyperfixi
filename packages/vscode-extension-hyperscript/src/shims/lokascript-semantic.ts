/**
 * Empty shim for @lokascript/semantic.
 *
 * When bundling the language server for the standalone _hyperscript extension,
 * this replaces the real @lokascript/semantic package. The language server
 * detects that semanticPackage has no methods and falls back to English-only
 * mode with hardcoded keyword/hover data.
 */
export {};
