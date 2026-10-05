/**
 * Each language's hand-crafted patterns, registered by its language module.
 *
 * The per-command files (`toggle.ts`, `put.ts`, …) hold every language's
 * hand-crafted patterns side by side. Their dispatchers used to name each
 * language's function in a `switch`, so a bundle that could build patterns at
 * all held every language's: a single-language bundle (semantic's
 * `browser-<lang>`, the adapter's `hyperscript-i18n-<lang>`) carried ~200 KB
 * minified of other languages' patterns, about a seventh of its gzipped size.
 *
 * Now `languages/<lang>.ts` registers its own list (`patterns/handcrafted/<lang>.ts`)
 * here, and the dispatchers look it up, so a bundle keeps the languages it
 * imports. The dispatchers keep what they add around a language's own patterns
 * (put's shared positional shapes, set's trailing scope), and the built list is
 * the one they built before (test/handcrafted-registry.test.ts).
 *
 * Two rules come from `dist/languages/<lang>.js`, which inlines everything a
 * language module imports except `../core`: a language module registers through
 * `../core` (an inlined copy of this Map would be one the dispatchers never read),
 * and a source reads its profile from the argument, not from the registry (an
 * inlined copy of the registry holds no profiles).
 */
import type { LanguagePattern } from '../types';
import type { LanguageProfile } from '../generators/language-profiles';
import { tryGetProfile } from '../registry';

/** One command's hand-crafted patterns for a language, given that language's profile. */
export type HandcraftedSource = (profile: LanguageProfile | undefined) => LanguagePattern[];

/** A language's hand-crafted patterns: one source per command. */
export type HandcraftedPatterns = ReadonlyArray<
  readonly [command: string, source: HandcraftedSource]
>;

const sources = new Map<string, HandcraftedSource>();

/** Register `language`'s hand-crafted patterns (from its `patterns/handcrafted/<lang>.ts`). */
export function registerHandcrafted(language: string, patterns: HandcraftedPatterns): void {
  for (const [command, source] of patterns) sources.set(`${command}:${language}`, source);
}

/** `language`'s hand-crafted patterns for `command`; undefined when none is registered. */
export function handcrafted(command: string, language: string): LanguagePattern[] | undefined {
  return sources.get(`${command}:${language}`)?.(tryGetProfile(language));
}

/** Every registered (command, language) pair, for the registry's own test. */
export function registeredHandcrafted(): ReadonlyArray<readonly [string, string]> {
  return [...sources.keys()].map(key => key.split(':') as [string, string]);
}
