/**
 * Hand-crafted patterns inherit the schema's optional-role defaults.
 *
 * `generatePattern` runs every optional role that declares a `default` through
 * `buildExtractionRulesWithDefaults`, so a GENERATED pattern that captures no
 * `toggle.destination` still materializes the schema's implicit `me`
 * (`applyExtractionRules` tags it `implicit: true`, and the renderers suppress
 * exactly those). The hand-crafted patterns in `src/patterns/*.ts` hand-write
 * their `extraction` maps and had never been given those defaults — so which
 * pattern happened to win a match decided whether the implicit role existed at
 * all:
 *
 *   .active কে টগল        → toggle-bn-generated → destination: me (implicit)
 *   .active কে টগল করুন   → toggle-bn-full      → destination MISSING
 *
 * Both render back to identical English, so the English round-trip cannot see
 * it; it shows up only as an R1 role-set difference against the English
 * reference. That is where the `i18n-kept-rows` ratchet found it: eleven
 * canonical corpus rows across bn/de/qu (accordion-toggle, halt-propagation,
 * if-matches, repeat-forever, increment-counter, decrement-counter,
 * caret-var-increment, multiple-events, remove-element, settle-animations,
 * toggle-class-basic) whose stored row had to stay on the i18n renderer purely
 * because the semantic re-parse dropped an implicit role.
 *
 * `buildPatternsForLanguage` now applies the generated path's rule to every
 * pattern it hands out. The structural test below is the invariant; the
 * behavioural rows are what actually redden if the inheritance is removed.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parseSemantic, render } from '../src/index';
import { buildPatternsForLanguage, getHandcraftedLanguages } from '../src/patterns/builders';
import { getSchema } from '../src/generators/command-schemas';
import type { ActionType } from '../src/types';

/** The one documented exclusion — see DEFAULT_INHERITANCE_EXCLUSIONS. */
const EXCLUDED = new Set(['on.source']);

function roleOf(surface: string, language: string, role: string) {
  const node = parseSemantic(surface, language)?.node as
    { roles?: Map<string, unknown> | Record<string, unknown> } | undefined;
  const roles = node?.roles;
  if (roles instanceof Map) return roles.get(role) as Record<string, unknown> | undefined;
  return (roles as Record<string, unknown> | undefined)?.[role] as
    Record<string, unknown> | undefined;
}

describe('every registered pattern carries its schema defaults', () => {
  it('no pattern is missing an optional role default the schema declares', () => {
    const missing: string[] = [];
    for (const language of getHandcraftedLanguages()) {
      for (const pattern of buildPatternsForLanguage(language)) {
        const schema = getSchema(pattern.command as ActionType);
        if (!schema) continue;
        for (const roleSpec of schema.roles) {
          if (roleSpec.required || !roleSpec.default) continue;
          const key = `${pattern.command}.${roleSpec.role}`;
          if (EXCLUDED.has(key)) continue;
          const rule = pattern.extraction?.[roleSpec.role];
          if (rule?.default === undefined && rule?.value === undefined) {
            missing.push(`${pattern.id} ${key}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('a hand-crafted pattern materializes the implicit role', () => {
  // Each surface is what `render(parse_en(<english>), <lang>)` emits, and each
  // is matched by a hand-crafted pattern whose extraction had no default.
  it.each([
    ['bn', '.active কে টগল করুন', 'destination', 'me', 'toggle-bn-full'],
    ['de', 'verringern #counter', 'quantity', 1, 'decrement-de-full'],
    ['hi', '#c को बढ़ाएं', 'quantity', 1, 'increment-hi-full'],
    ['qu', ".active ta t'ikray", 'destination', 'me', 'toggle-qu-sov'],
    ['qu', '.item ta qichuy', 'source', 'me', 'remove-qu-sov'],
    ['qu', '.active ta yapay', 'destination', 'me', 'add-qu-sov'],
  ])('%s %s carries an implicit %s', (language, surface, role, value, patternId) => {
    const parsed = parseSemantic(surface, language);
    expect(parsed?.node?.metadata?.patternId).toBe(patternId);
    expect(roleOf(surface, language, role)).toMatchObject({ value, implicit: true });
  });

  it('the implicit role stays implicit — it never reaches the rendered surface', () => {
    // Suppression is what keeps this a fixed point: materializing the default
    // must not make `toggle .active` render as `toggle .active on me`.
    for (const [language, surface] of [
      ['bn', '.active কে টগল করুন'],
      ['qu', ".active ta t'ikray"],
    ] as const) {
      const node = parseSemantic(surface, language)?.node;
      expect(node).toBeTruthy();
      expect(render(node!, language)).toBe(surface);
      expect(render(node!, 'en')).toBe('toggle .active');
    }
  });
});

describe('the corpus rows the ratchet named', () => {
  // The oracle for this queue: parse the English reference, render it to the
  // language, parse THAT back, and compare role signatures. Before the
  // inheritance these lost exactly one implicit role each while the English
  // round-trip stayed identical — the shape no other gate can see.
  const signature = (node: unknown): string[] => {
    const out: string[] = [];
    const walk = (n: unknown): void => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(walk);
      const rec = n as Record<string, unknown>;
      const roles = rec.roles;
      if (typeof rec.action === 'string' && roles) {
        const entries = roles instanceof Map ? [...roles] : Object.entries(roles);
        for (const [role, value] of entries) {
          out.push(`${rec.action}.${role}:${(value as { type?: string })?.type}`);
        }
      }
      for (const value of Object.values(rec)) walk(value);
    };
    walk(node);
    return out.sort();
  };

  it.each([
    ['bn', 'on click halt the event then toggle .active'], // halt-propagation
    ['bn', 'on click if I match .disabled halt else toggle .active end'], // if-matches
    ['bn', 'on load repeat forever toggle .pulse wait 1s end'], // repeat-forever
    ['de', 'on click increment #counter'], // increment-counter
    ['de', 'on click decrement #counter'], // decrement-counter
    ['qu', 'on click toggle .active'], // toggle-class-basic
    ['qu', 'on click remove me'], // remove-element
  ])('%s keeps every role of `%s` through a render/re-parse', (language, english) => {
    const reference = parseSemantic(english, 'en')?.node;
    expect(reference).toBeTruthy();
    const surface = render(reference!, language);
    const reparsed = parseSemantic(surface, language)?.node;
    expect(reparsed, `${language} could not re-parse ${surface}`).toBeTruthy();
    expect(signature(reparsed)).toEqual(signature(reference));
    expect(render(reparsed!, 'en')).toBe(render(reference!, 'en'));
  });
});
