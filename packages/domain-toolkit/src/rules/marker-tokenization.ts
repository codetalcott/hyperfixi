/**
 * R7: Marker and keyword tokenization.
 *
 * Every lexical item the parser needs to match atomically — marker words,
 * profile keyword primaries, and profile keyword alternatives — must
 * tokenize as a single token in its target language. A word that splits
 * across multiple tokens (e.g., `añadir` → `["a", "ñadir"]` when the
 * tokenizer lacks `LatinExtendedIdentifierExtractor`) will never match a
 * pattern's literal token.
 *
 * This is the exact gap that bit us on the Spanish tokenizer mid-session.
 */

import type { LintFinding, LintRule, DomainLintInput } from '../types';
import type { LanguageTokenizer } from '@lokascript/framework';

const RULE_ID = 'marker-tokenization';

function tokenCount(tokenizer: LanguageTokenizer, word: string): number {
  const stream = tokenizer.tokenize(word);
  return stream.tokens.length;
}

function collectLexicalItems(input: DomainLintInput): Array<{
  lang: string;
  word: string;
  source: string; // "schema marker <action>.<role>" | "profile keyword <action>.primary" | ...
}> {
  const items: Array<{ lang: string; word: string; source: string }> = [];

  // Schema marker overrides (per language)
  for (const schema of input.schemas) {
    for (const role of schema.roles) {
      if (!role.markerOverride) continue;
      for (const [lang, word] of Object.entries(role.markerOverride)) {
        items.push({
          lang,
          word,
          source: `schema markerOverride ${String(schema.action)}.${role.role}`,
        });
      }
    }
  }

  // Profile keywords (primary + alternatives)
  for (const profile of input.profiles) {
    for (const [action, entry] of Object.entries(profile.keywords)) {
      if (entry.primary) {
        items.push({
          lang: profile.code,
          word: entry.primary,
          source: `profile keyword ${action}.primary`,
        });
      }
      for (const alt of entry.alternatives ?? []) {
        items.push({
          lang: profile.code,
          word: alt,
          source: `profile keyword ${action}.alternatives`,
        });
      }
    }
  }

  // Profile role markers (primary + alternatives)
  for (const profile of input.profiles) {
    for (const [role, marker] of Object.entries(profile.roleMarkers ?? {})) {
      if (marker.primary) {
        items.push({
          lang: profile.code,
          word: marker.primary,
          source: `profile roleMarker ${role}.primary`,
        });
      }
      for (const alt of marker.alternatives ?? []) {
        items.push({
          lang: profile.code,
          word: alt,
          source: `profile roleMarker ${role}.alternatives`,
        });
      }
    }
  }

  return items;
}

export const markerTokenizationRule: LintRule = input => {
  const findings: LintFinding[] = [];
  const items = collectLexicalItems(input);

  for (const { lang, word, source } of items) {
    const tokenizer = input.tokenizers[lang];
    if (!tokenizer) {
      // Tokenizer for this language isn't registered with the linter.
      // R6 (keyword-coverage) catches the schema side; nothing to do here.
      continue;
    }

    // Empty-string markers mean "no marker in this language" (an explicit
    // opt-out pattern used by domain-learn to signal that a role is
    // positional in some languages but marker-bearing in others).
    if (word === '') continue;

    // Whitespace-containing markers (e.g., 'mettre-à-jour' is one word, but
    // 'ask X to Y' wouldn't be) — tokenize the raw word and expect 1 token.
    // Multi-word markers with explicit spaces are out of scope for this rule;
    // skip them rather than flag false positives.
    if (/\s/.test(word)) continue;

    const count = tokenCount(tokenizer, word);
    if (count !== 1) {
      findings.push({
        rule: RULE_ID,
        severity: 'error',
        message: `"${word}" tokenizes as ${count} tokens in ${lang} (${source})`,
        context: {
          domain: input.name,
          lang,
          word,
          source,
          tokenCount: count,
        },
      });
    }
  }

  return findings;
};
