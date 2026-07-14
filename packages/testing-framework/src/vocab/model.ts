/**
 * Loads the real five-surface vocab model.
 *
 * S1/S2/S5 come from `@lokascript/semantic`, S3/S4 from `@lokascript/i18n` —
 * all via the package entries, so a stale `dist/` scores code that differs
 * from the checkout (the CLI guards this before loading).
 */

import {
  KNOWN_PROFILES,
  commandSchemas,
  getTokenizer,
  eventNameTranslations,
  getSOVEventMarkers,
  getEventLocalizationDenylist,
} from '@lokascript/semantic';
import { dictionaries, profiles as grammarProfiles } from '@lokascript/i18n';
import type { LangVocab, VocabModel } from './types';

export function loadVocabModel(languageFilter?: readonly string[]): VocabModel {
  const codes = Object.keys(KNOWN_PROFILES).filter(
    code => !languageFilter || languageFilter.includes(code)
  );
  const sovEventMarkers = getSOVEventMarkers();
  const eventDenylists = getEventLocalizationDenylist();

  const languages: LangVocab[] = [];
  for (const code of codes) {
    const profile = KNOWN_PROFILES[code];
    if (!profile) continue;

    const keywords: LangVocab['keywords'] = {};
    for (const [concept, t] of Object.entries(profile.keywords ?? {})) {
      keywords[concept] = { primary: t.primary, alternatives: t.alternatives };
    }

    const roleMarkers: LangVocab['roleMarkers'] = {};
    for (const [role, m] of Object.entries(profile.roleMarkers ?? {})) {
      if (m) roleMarkers[role] = { primary: m.primary, alternatives: m.alternatives };
    }

    const schemaMarkers: LangVocab['schemaMarkers'] = [];
    for (const [action, schema] of Object.entries(commandSchemas)) {
      for (const spec of schema.roles ?? []) {
        const override = spec.markerOverride?.[code];
        if (override) {
          schemaMarkers.push({ action, role: spec.role, marker: override, kind: 'override' });
        }
        for (const variant of spec.markerVariants?.[code] ?? []) {
          if (variant)
            schemaMarkers.push({ action, role: spec.role, marker: variant, kind: 'variant' });
        }
      }
    }

    const grammar = (
      grammarProfiles as Record<string, { markers?: readonly unknown[] } | undefined>
    )[code];
    const grammarMarkers: LangVocab['grammarMarkers'] = [];
    for (const raw of grammar?.markers ?? []) {
      const m = raw as {
        form: string;
        role: string;
        position?: string;
        alternatives?: readonly string[];
      };
      if (m.form)
        grammarMarkers.push({
          form: m.form,
          role: m.role,
          position: m.position,
          alternatives: m.alternatives,
        });
    }

    const dictionary = (
      dictionaries as unknown as Record<string, Record<string, Record<string, string>> | undefined>
    )[code];

    const tokenizer = getTokenizer(code);

    languages.push({
      language: code,
      keywords,
      roleMarkers,
      schemaMarkers,
      dictionary,
      grammarMarkers,
      eventTranslations: eventNameTranslations[code],
      sovEventMarkers: sovEventMarkers[code],
      classify: tokenizer ? (word: string) => tokenizer.classifyToken(word) : undefined,
      normalizeWord: tokenizer
        ? (word: string) => {
            // Parse-authority resolution: what the keyword table turns this
            // word into. Only trustworthy when the word survives as ONE token
            // (a shattered compound resolves to its first fragment — that is
            // the broken-listener class itself, not a resolution).
            const stream = tokenizer.tokenize(word) as {
              tokens?: readonly { normalized?: string }[];
            };
            const toks = stream.tokens ?? [];
            return toks.length === 1 ? toks[0]?.normalized : undefined;
          }
        : undefined,
      eventDenylist: eventDenylists[code],
    });
  }

  return { languages };
}
