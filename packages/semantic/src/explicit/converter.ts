/**
 * Bidirectional Converter
 *
 * Converts between natural language syntax and explicit syntax,
 * and between different natural languages.
 */

import type { SemanticNode } from '../types';
import { parse } from '../parser';
import { getRegisteredLanguages } from '../registry';
import { render, renderExplicit } from './renderer';
import { parseExplicit, isExplicitSyntax } from './parser';

// =============================================================================
// Bidirectional Conversion
// =============================================================================

/**
 * Convert natural language hyperscript to explicit syntax.
 *
 * @param input Natural language hyperscript
 * @param sourceLanguage Source language code
 * @returns Explicit syntax string
 *
 * @example
 * toExplicit('toggle .active on #button', 'en')
 * // → '[toggle patient:.active destination:#button]'
 *
 * toExplicit('#button の .active を 切り替え', 'ja')
 * // → '[toggle patient:.active destination:#button]'
 */
export function toExplicit(input: string, sourceLanguage: string): string {
  // If already explicit, return as-is
  if (isExplicitSyntax(input)) {
    return input;
  }

  const node = parse(input, sourceLanguage);
  return renderExplicit(node);
}

/**
 * Convert explicit syntax to natural language.
 *
 * @param explicit Explicit syntax string
 * @param targetLanguage Target language code
 * @returns Natural language hyperscript
 *
 * @example
 * fromExplicit('[toggle patient:.active destination:#button]', 'en')
 * // → 'toggle .active on #button'
 *
 * fromExplicit('[toggle patient:.active destination:#button]', 'ja')
 * // → '#button の .active を 切り替え'
 */
export function fromExplicit(explicit: string, targetLanguage: string): string {
  const node = parseExplicit(explicit);
  return render(node, targetLanguage);
}

/**
 * Translate hyperscript from one language to another.
 *
 * @param input Natural language hyperscript
 * @param sourceLanguage Source language code
 * @param targetLanguage Target language code
 * @returns Translated hyperscript
 *
 * @example
 * translate('toggle .active on #button', 'en', 'ja')
 * // → '#button の .active を 切り替え'
 *
 * translate('#button の .active を 切り替え', 'ja', 'ar')
 * // → 'بدّل .active على #button'
 */
export function translate(input: string, sourceLanguage: string, targetLanguage: string): string {
  // Handle explicit syntax
  if (isExplicitSyntax(input)) {
    return fromExplicit(input, targetLanguage);
  }

  // Parse source language
  const node = parse(input, sourceLanguage);

  // Render in target language
  return render(node, targetLanguage);
}

/**
 * Parse input (either explicit or natural language) to semantic node.
 *
 * @param input Hyperscript input (explicit or natural)
 * @param language Language code (required for natural, ignored for explicit)
 * @returns Semantic node
 */
export function parseAny(input: string, language: string): SemanticNode {
  if (isExplicitSyntax(input)) {
    return parseExplicit(input);
  }
  return parse(input, language);
}

/**
 * Round-trip validation: parse and re-render to verify consistency.
 *
 * When called with 2 arguments, returns an object with validation info.
 * When called with 3 arguments, returns the rendered string directly.
 *
 * @param input Original input
 * @param sourceLanguage Source language code
 * @param targetLanguage Target language code (optional, if provided returns string only)
 * @returns Object with original, semantic, re-rendered, and match status (or just string if targetLanguage provided)
 */
export function roundTrip(
  input: string,
  sourceLanguage: string,
  targetLanguage?: string
):
  | string
  | {
      original: string;
      semantic: SemanticNode;
      rendered: string;
      matches: boolean;
    } {
  const semantic = parseAny(input, sourceLanguage);
  const outputLanguage = targetLanguage ?? sourceLanguage;
  const rendered = isExplicitSyntax(input)
    ? renderExplicit(semantic)
    : render(semantic, outputLanguage);

  // If target language is explicitly provided, return just the rendered string
  if (targetLanguage !== undefined) {
    return rendered;
  }

  // Normalize for comparison (trim whitespace, lowercase)
  const normalizedOriginal = input.trim().toLowerCase();
  const normalizedRendered = rendered.trim().toLowerCase();

  return {
    original: input,
    semantic,
    rendered,
    matches: normalizedOriginal === normalizedRendered,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get all translations of a hyperscript statement.
 *
 * **Best-effort:** a language whose render fails is omitted from the result
 * rather than throwing, so the count of keys can be lower than the number of
 * languages asked for. Use {@link getAllTranslationsWithStatus} when you need to
 * know which ones were dropped and why.
 *
 * @param input Hyperscript input
 * @param sourceLanguage Source language (or 'explicit')
 * @param targetLanguages Target language codes. Defaults to every **registered**
 *   language (all 24 as of writing) — derived from the tokenizer registry, so a
 *   newly added language is included automatically.
 * @returns Object mapping language codes to translations, plus an `explicit` key
 */
export function getAllTranslations(
  input: string,
  sourceLanguage: string,
  targetLanguages: string[] = getRegisteredLanguages()
): Record<string, string> {
  return getAllTranslationsWithStatus(input, sourceLanguage, targetLanguages).translations;
}

/**
 * {@link getAllTranslations} with the omissions made visible.
 *
 * @returns `translations` (including the `explicit` key, matching
 *   {@link getAllTranslations}) and `failed`, mapping each dropped language code
 *   to the error message that caused it to be dropped.
 */
export function getAllTranslationsWithStatus(
  input: string,
  sourceLanguage: string,
  targetLanguages: string[] = getRegisteredLanguages()
): { translations: Record<string, string>; failed: Record<string, string> } {
  const translations: Record<string, string> = {};
  const failed: Record<string, string> = {};

  // Parse once
  const node = parseAny(input, sourceLanguage);

  // Render for each target language. A language that cannot render this
  // particular node is skipped — one unsupported command must not deny the
  // caller the 23 languages that did render.
  for (const lang of targetLanguages) {
    try {
      translations[lang] = render(node, lang);
    } catch (error) {
      failed[lang] = error instanceof Error ? error.message : String(error);
    }
  }

  // Also include explicit
  translations['explicit'] = renderExplicit(node);

  return { translations, failed };
}

/**
 * Validate that a translation is semantically equivalent.
 *
 * @param original Original hyperscript
 * @param translated Translated hyperscript
 * @param originalLang Original language
 * @param translatedLang Translated language
 * @returns true if semantically equivalent
 */
export function validateTranslation(
  original: string,
  translated: string,
  originalLang: string,
  translatedLang: string
): boolean {
  try {
    const originalNode = parseAny(original, originalLang);
    const translatedNode = parseAny(translated, translatedLang);

    // Compare semantic content
    if (originalNode.action !== translatedNode.action) {
      return false;
    }

    // Compare roles
    for (const [role, value] of originalNode.roles) {
      const translatedValue = translatedNode.roles.get(role);
      if (!translatedValue) {
        return false;
      }

      // Deep compare values
      if (!semanticValuesEqual(value, translatedValue)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if two semantic values are equal.
 */
function semanticValuesEqual(a: any, b: any): boolean {
  if (a.type !== b.type) return false;

  switch (a.type) {
    case 'literal':
      return a.value === b.value;
    case 'selector':
      return a.value === b.value;
    case 'reference':
      return a.value === b.value;
    case 'property-path':
      return semanticValuesEqual(a.object, b.object) && a.property === b.property;
    case 'expression':
      return a.raw === b.raw;
    case 'flag':
      return a.name === b.name && a.enabled === b.enabled;
    default:
      return false;
  }
}
