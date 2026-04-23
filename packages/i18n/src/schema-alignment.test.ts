/**
 * Schema ↔ i18n Alignment Tests
 *
 * Verifies that every CommandSchema exported by @lokascript/semantic has a
 * matching English dictionary entry in en.ts's `commands` category, and that
 * every COMPLETE language dictionary covers the same set of command keys as
 * English.
 *
 * Catches drift going forward: adding a new schema without updating en.ts,
 * or adding commands to en.ts without propagating via the semantic profile
 * generator.
 */

import { describe, it, expect } from 'vitest';
import { commandSchemas } from '@lokascript/semantic';
import { dictionaries } from './dictionaries';
import type { Dictionary } from './types';
import { DICTIONARY_CATEGORIES } from './types';

/**
 * Dictionaries store each English keyword once in whichever category it
 * primarily belongs to — `focus`/`blur` end up in `events`, `empty` in
 * `expressions`. This helper looks up a keyword across all categories.
 */
function findInDictionary(dict: Dictionary, keyword: string): string | undefined {
  for (const cat of DICTIONARY_CATEGORIES) {
    const v = dict[cat]?.[keyword];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

// Actions that don't need a user-facing keyword translation at command
// position. They're either AST meta-nodes (`compound`) or definition-time
// feature keywords (`init`, `behavior`) handled elsewhere in the parser.
const NON_USER_FACING_ACTIONS = new Set(['compound', 'init', 'behavior']);

// Event handler 'on' is a top-level feature, not a command the user writes at
// command position in the same way. It's handled specially by the parser.
// Still, it has an i18n entry under `commands` in en.ts.

// Languages we consider "complete" for schema coverage. Kept in sync with
// translation-validation.test.ts's COMPLETE_LANGUAGES.
const COMPLETE_LANGUAGES = [
  'en',
  'es',
  'ja',
  'ko',
  'ar',
  'id',
  'pt',
  'it',
  'vi',
  'qu',
  'sw',
  'pl',
  'ru',
  'zh',
  'hi',
  'bn',
  'de',
  'th',
  'fr',
  'uk',
  'tl',
  'ms',
] as const;

describe('Schema ↔ i18n alignment', () => {
  const schemaActions = Object.keys(commandSchemas).filter(
    action => !NON_USER_FACING_ACTIONS.has(action)
  );

  describe('every command schema has an English dictionary entry', () => {
    const en = dictionaries.en as Dictionary;
    schemaActions.forEach(action => {
      it(`en dictionary contains '${action}'`, () => {
        const value = findInDictionary(en, action);
        expect(
          value,
          `CommandSchema '${action}' is exported from @lokascript/semantic but has no en.ts dictionary entry in any category. Add it to packages/i18n/src/dictionaries/en.ts and run \`npm run generate:language-assets\`.`
        ).toBeDefined();
      });
    });
  });

  describe('Phase 1 commands (v0.9.90) are present in all complete languages', () => {
    const PHASE_1_COMMANDS = [
      'focus',
      'blur',
      'empty',
      'open',
      'close',
      'select',
      'clear',
      'reset',
      'breakpoint',
    ] as const;

    COMPLETE_LANGUAGES.forEach(code => {
      const dict = dictionaries[code] as Dictionary | undefined;
      if (!dict) return;

      it(`${code}: has all 9 Phase 1 commands (any category)`, () => {
        const missing: string[] = [];
        for (const cmd of PHASE_1_COMMANDS) {
          if (!findInDictionary(dict, cmd)) {
            missing.push(cmd);
          }
        }
        expect(
          missing,
          `Missing Phase 1 commands in ${code}: ${missing.join(', ')}. ` +
            `Fix by adding to packages/semantic/src/generators/profiles/${code}.ts ` +
            `and running \`npm run generate:language-assets\`.`
        ).toEqual([]);
      });
    });
  });

  describe('Phase 2 comparators (v0.9.90) are present in all complete languages', () => {
    // Expression operators wired into the core Pratt parser. Unlike Phase 1
    // commands, these live in the hand-written `expressions` category (or
    // `modifiers` for `between`) rather than deriving from semantic profiles.
    const PHASE_2_COMPARATORS = ['starts with', 'ends with', 'between', 'ignoring case'] as const;

    COMPLETE_LANGUAGES.forEach(code => {
      const dict = dictionaries[code] as Dictionary | undefined;
      if (!dict) return;

      it(`${code}: has all Phase 2 comparators (any category)`, () => {
        const missing: string[] = [];
        for (const op of PHASE_2_COMPARATORS) {
          if (!findInDictionary(dict, op)) {
            missing.push(op);
          }
        }
        expect(
          missing,
          `Missing Phase 2 comparators in ${code}: ${missing.join(', ')}. ` +
            `Add to packages/i18n/src/dictionaries/${code}.ts's \`expressions\` ` +
            `category (or \`modifiers\` for \`between\`).`
        ).toEqual([]);
      });
    });
  });
});
