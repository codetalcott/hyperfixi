/**
 * `@hyperfixi/core/multilingual` — hyperscript in 24 languages, as text.
 *
 * Three functions over `@lokascript/semantic`:
 * - `parse(code, lang)`: a semantic node, or null
 * - `render(node, lang)`: that node as hyperscript in a language
 * - `translate(code, from, to)`: the two together
 *
 * Text is the interchange: a translation is hyperscript a host reads, as
 * `@lokascript/hyperscript-adapter` hands it to `@hyperfixi/engine` or to
 * upstream _hyperscript. (Until 4.0 this entry also carried the
 * `MultilingualHyperscript` class, removed in Phase C2 of the engine cutover,
 * and `schemaRoleInferrer`, which fed core's own AST converter and left with
 * core's engine in C6.) The language list is semantic's `getSupportedLanguages()`.
 *
 * `@lokascript/semantic` is loaded on first use, so importing this entry costs
 * nothing until a function is called.
 *
 * @example
 * ```typescript
 * import { parse, render, translate } from '@hyperfixi/core/multilingual';
 *
 * const node = await parse('#button の .active を 切り替え', 'ja');
 * const arabic = node && (await render(node, 'ar'));
 * const english = await translate('alternar .active', 'es', 'en');
 * ```
 */

import type { SemanticNode } from '@lokascript/semantic';

let semanticModule: typeof import('@lokascript/semantic') | null = null;

async function semantic(): Promise<typeof import('@lokascript/semantic')> {
  semanticModule ??= await import('@lokascript/semantic');
  return semanticModule;
}

/**
 * Parse hyperscript written in `lang` to a semantic node, or null when it does
 * not parse. Confidence is not filtered: a caller that executes decides.
 */
export async function parse(input: string, lang = 'en'): Promise<SemanticNode | null> {
  return (await semantic()).parseSemantic(input, lang).node ?? null;
}

/** Render a semantic node as hyperscript in `lang`. */
export async function render(node: SemanticNode, lang: string): Promise<string> {
  return (await semantic()).render(node, lang);
}

/**
 * Translate hyperscript from one language to another. Returns the input
 * unchanged when it cannot be translated (or when the languages match).
 */
export async function translate(
  input: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (sourceLang === targetLang) return input;
  try {
    return (await semantic()).translate(input, sourceLang, targetLang);
  } catch {
    return input;
  }
}
