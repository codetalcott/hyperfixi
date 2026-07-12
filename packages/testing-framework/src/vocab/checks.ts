/**
 * The V1–V4 cross-surface consistency checks
 * (check matrix: docs-internal/HANDOFF_vocab-consistency.md).
 *
 * Tiering rule of thumb: a CONFLICT between two surfaces is an error; a
 * MISSING entry is warn/info depending on the pair's direction of authority.
 * Comparison is always over normalized form SETS with containment — never
 * naive 1:1 string equality (markers have allomorphs and alternatives).
 */

import type { CheckId, Finding, LangVocab, VocabModel } from './types';
import { formSet, norm } from './types';

const ACCEPTED_TOKEN_KINDS = new Set(['keyword', 'particle']);

/** Look an English concept key up across all dictionary categories. */
function findInDictionary(
  dictionary: NonNullable<LangVocab['dictionary']>,
  concept: string
): { category: string; value: string } | undefined {
  for (const [category, entries] of Object.entries(dictionary)) {
    const value = entries[concept];
    if (value !== undefined) return { category, value };
  }
  return undefined;
}

/** V1/V1b — S1 profile keywords ↔ S3 i18n dictionary. */
function checkKeywords(lang: LangVocab, findings: Finding[]): void {
  if (!lang.dictionary) return;

  const dictKeys = new Set<string>();
  for (const entries of Object.values(lang.dictionary)) {
    for (const key of Object.keys(entries)) dictKeys.add(key);
  }

  for (const [concept, entry] of Object.entries(lang.keywords)) {
    const hit = findInDictionary(lang.dictionary, concept);
    if (!hit) {
      findings.push({
        check: 'V1b',
        tier: 'warn',
        language: lang.language,
        key: concept,
        message: `profile concept "${concept}" (${entry.primary}) has no i18n dictionary entry`,
        source: `profile.keywords.${concept}`,
      });
      continue;
    }
    const forms = formSet(entry);
    if (forms.size > 0 && !forms.has(norm(hit.value))) {
      findings.push({
        check: 'V1',
        tier: 'error',
        language: lang.language,
        key: concept,
        message: `"${concept}": profile says "${entry.primary}"${
          entry.alternatives?.length ? ` (alts: ${entry.alternatives.join(', ')})` : ''
        } but dictionary ${hit.category} says "${hit.value}"`,
        source: `dictionary.${hit.category}.${concept}`,
      });
    }
  }

  // Dictionary-only keys: S3 legitimately holds render vocabulary S1 never
  // needs — coverage note, not a defect.
  for (const key of dictKeys) {
    if (!(key in lang.keywords)) {
      findings.push({
        check: 'V1b',
        tier: 'info',
        language: lang.language,
        key,
        message: `dictionary key "${key}" has no profile concept (dictionary-only vocabulary)`,
      });
    }
  }
}

/** V2 — role markers three-way: S1 profile ↔ S2 schemas ↔ S4 grammar profile. */
function checkRoleMarkers(lang: LangVocab, findings: Finding[]): void {
  // Parse-side union per role: profile markers + every schema override/variant.
  const parseSet = new Map<string, Set<string>>();
  const add = (role: string, word: string) => {
    if (!word) return;
    let set = parseSet.get(role);
    if (!set) parseSet.set(role, (set = new Set()));
    set.add(norm(word));
  };
  for (const [role, entry] of Object.entries(lang.roleMarkers)) {
    for (const f of formSet(entry)) add(role, f);
  }
  for (const sm of lang.schemaMarkers) add(sm.role, sm.marker);
  // Surface #6: hardcoded SOV event markers count as parse-side knowledge for
  // the event role (they live in semantic-parser.ts, not in any vocab file).
  for (const marker of lang.sovEventMarkers ?? []) add('event', marker);

  // Render-side forms per role (S4).
  const renderSet = new Map<string, Set<string>>();
  for (const gm of lang.grammarMarkers) {
    let set = renderSet.get(gm.role);
    if (!set) renderSet.set(gm.role, (set = new Set()));
    set.add(norm(gm.form));
    for (const a of gm.alternatives ?? []) if (a) set.add(norm(a));
  }

  // Error: the transformer renders a marker the parse side does not know for
  // that role (the tr `ya`-vs-`e` class). Only when the parse side HAS
  // markers for the role — an entirely unmarked role is a coverage note.
  for (const [role, forms] of renderSet) {
    const parse = parseSet.get(role);
    for (const form of forms) {
      if (!parse || parse.size === 0) {
        findings.push({
          check: 'V2',
          tier: 'info',
          language: lang.language,
          key: `${role}:${form}`,
          message: `grammar renders "${form}" for role ${role}, which has no parse-side markers at all`,
          source: `grammar.${role}`,
        });
      } else if (!parse.has(form)) {
        findings.push({
          check: 'V2',
          tier: 'error',
          language: lang.language,
          key: `${role}:${form}`,
          message: `grammar renders "${form}" for role ${role} but neither the profile role marker nor any schema override/variant knows it (parse side: ${[...parse].join(', ')})`,
          source: `grammar.${role}`,
        });
      }
    }
  }

  // Warn: the profile's canonical marker never appears among the grammar
  // forms for a role the grammar does render — the two canonical copies
  // disagree even if parsing still succeeds via alternatives.
  for (const [role, entry] of Object.entries(lang.roleMarkers)) {
    const render = renderSet.get(role);
    if (!render || !entry.primary) continue;
    if (!render.has(norm(entry.primary))) {
      findings.push({
        check: 'V2',
        tier: 'warn',
        language: lang.language,
        key: `${role}:primary`,
        message: `profile canonical marker "${entry.primary}" for role ${role} is not among the grammar forms (${[...render].join(', ')})`,
        source: `profile.roleMarkers.${role}`,
      });
    }
  }
}

/** V3/V3b — event names: S5b eventNameTranslations ↔ S3 dictionary `events`. */
function checkEventNames(lang: LangVocab, findings: Finding[]): void {
  if (!lang.eventTranslations) {
    findings.push({
      check: 'V3b',
      tier: 'info',
      language: lang.language,
      key: 'coverage',
      message: `language has no eventNameTranslations table (native event words fall back to English)`,
    });
    return;
  }
  const events = lang.dictionary?.events;
  if (!events) return;

  // Invert S5b: English event → set of native forms.
  const englishToNatives = new Map<string, Set<string>>();
  for (const [native, english] of Object.entries(lang.eventTranslations)) {
    let set = englishToNatives.get(english);
    if (!set) englishToNatives.set(english, (set = new Set()));
    set.add(norm(native));
  }

  for (const [english, native] of Object.entries(events)) {
    const natives = englishToNatives.get(english);
    if (!natives) continue; // S5b does not cover this event — parse-side coverage gap, not a conflict
    if (!natives.has(norm(native))) {
      findings.push({
        check: 'V3',
        tier: 'error',
        language: lang.language,
        key: english,
        message: `event "${english}": dictionary renders "${native}" but eventNameTranslations only recognizes ${[...natives].map(n => `"${n}"`).join(', ')}`,
        source: `dictionary.events.${english}`,
      });
    }
  }
}

/** V4 — every parse/render vocab word must classify as keyword/particle in that language's tokenizer. */
function checkTokenizerClassification(lang: LangVocab, findings: Finding[]): void {
  if (!lang.classify) return;

  // (word → sources) — dedupe so one bad word yields one finding.
  const words = new Map<string, string[]>();
  const collect = (word: string | undefined, source: string) => {
    if (!word) return;
    if (/\s/.test(word)) return; // classifyToken is word-level; multi-word forms are out of its scope
    const list = words.get(word);
    if (list) list.push(source);
    else words.set(word, [source]);
  };

  for (const [concept, entry] of Object.entries(lang.keywords)) {
    collect(entry.primary, `profile.keywords.${concept}`);
    for (const a of entry.alternatives ?? []) collect(a, `profile.keywords.${concept}`);
  }
  for (const [role, entry] of Object.entries(lang.roleMarkers)) {
    collect(entry.primary, `profile.roleMarkers.${role}`);
    for (const a of entry.alternatives ?? []) collect(a, `profile.roleMarkers.${role}`);
  }
  for (const sm of lang.schemaMarkers) {
    collect(sm.marker, `schema.${sm.action}.${sm.role}`);
  }
  for (const gm of lang.grammarMarkers) {
    collect(gm.form, `grammar.${gm.role}`);
    for (const a of gm.alternatives ?? []) collect(a, `grammar.${gm.role}`);
  }

  for (const [word, sources] of words) {
    const kind = lang.classify(word);
    if (!ACCEPTED_TOKEN_KINDS.has(kind)) {
      findings.push({
        check: 'V4',
        tier: 'error',
        language: lang.language,
        key: word,
        message: `"${word}" classifies as '${kind}' (not keyword/particle) — it cannot tokenize as vocabulary`,
        source:
          sources.slice(0, 3).join(', ') +
          (sources.length > 3 ? ` (+${sources.length - 3} more)` : ''),
      });
    }
  }
}

export function runChecks(model: VocabModel, checks?: readonly CheckId[]): Finding[] {
  const enabled = (id: CheckId) => !checks || checks.includes(id);
  const findings: Finding[] = [];
  for (const lang of model.languages) {
    if (enabled('V1') || enabled('V1b')) checkKeywords(lang, findings);
    if (enabled('V2')) checkRoleMarkers(lang, findings);
    if (enabled('V3') || enabled('V3b')) checkEventNames(lang, findings);
    if (enabled('V4')) checkTokenizerClassification(lang, findings);
  }
  return checks ? findings.filter(f => checks.includes(f.check)) : findings;
}
