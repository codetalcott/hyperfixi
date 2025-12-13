/**
 * Tokenizer Module
 *
 * This module now delegates to the semantic package's sophisticated tokenizers
 * via the tokenizer-adapter. This consolidation provides:
 *
 * - Language-specific tokenization (13 languages)
 * - CSS selector, URL, and string literal handling
 * - Grammatical particle recognition (を, に, من)
 * - Morphological normalization
 *
 * The adapter converts semantic tokens to i18n-compatible Token types
 * using dictionary-based categorization.
 *
 * @see ./tokenizer-adapter.ts for the implementation
 */

// Re-export functions from the adapter
export { tokenize, tokenizeAsync, initSemanticTokenizer } from './tokenizer-adapter';
