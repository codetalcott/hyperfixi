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
} from '@lokascript/semantic';
import { dictionaries, profiles as grammarProfiles } from '@lokascript/i18n';
import type { LangVocab, VocabModel } from './types';

export function loadVocabModel(languageFilter?: readonly string[]): VocabModel {
  const codes = Object.keys(KNOWN_PROFILES).filter(
    code => !languageFilter || languageFilter.includes(code)
  );
  const sovEventMarkers = getSOVEventMarkers();

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
    });
  }

  return { languages };
}
