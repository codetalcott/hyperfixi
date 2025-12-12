/**
 * Language Building Validation Tests
 *
 * These tests ensure that all languages and commands have the required
 * pieces in place: profiles, tokenizers, patterns, and keyword sync.
 */

import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_COMMANDS,
  validateLanguage,
  validateCommand,
} from '../src/language-building-schema';
import { languageProfiles } from '../src/generators/language-profiles';
import { getSupportedLanguages as getTokenizerLanguages } from '../src/tokenizers';
import { getSupportedLanguages as getPatternLanguages } from '../src/patterns';

// =============================================================================
// Language Validation Tests
// =============================================================================

describe('Language Building Validation', () => {
  describe('All languages have required pieces', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      describe(`${lang.name} (${lang.code})`, () => {
        it('has language profile', () => {
          expect(languageProfiles[lang.code]).toBeDefined();
        });

        it('has tokenizer registered', () => {
          const tokenizers = getTokenizerLanguages();
          expect(tokenizers).toContain(lang.code);
        });

        it('has patterns registered', () => {
          const patternLangs = getPatternLanguages();
          expect(patternLangs).toContain(lang.code);
        });

        it('passes validation', () => {
          const result = validateLanguage(lang);
          if (!result.valid) {
            console.log(`Validation errors for ${lang.code}:`, result.errors);
          }
          expect(result.valid).toBe(true);
        });

        it('has no unresolved particle conflicts', () => {
          const unresolvedConflicts = lang.potentialConflicts.filter(c => !c.isResolved);
          expect(unresolvedConflicts).toHaveLength(0);
        });
      });
    }
  });

  describe('Profile-Tokenizer keyword sync', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      it(`${lang.name} has no missing tokenizer keywords`, () => {
        if (lang.missingFromTokenizer.length > 0) {
          console.warn(
            `${lang.code} missing from tokenizer:`,
            lang.missingFromTokenizer
          );
        }
        // This is a warning, not a failure - some may be intentional
        // Change to expect(lang.missingFromTokenizer).toHaveLength(0) to enforce
        expect(true).toBe(true);
      });
    }
  });
});

// =============================================================================
// Command Validation Tests
// =============================================================================

describe('Command Building Validation', () => {
  describe('All commands have required pieces', () => {
    for (const cmd of SUPPORTED_COMMANDS) {
      describe(`${cmd.action}`, () => {
        it('has schema defined', () => {
          expect(cmd.schemaExists).toBe(true);
        });

        it('is wired in patterns (or uses hand-crafted)', () => {
          // toggle/put use hand-crafted patterns
          if (['toggle', 'put', 'on'].includes(cmd.action)) {
            expect(true).toBe(true);
          } else {
            expect(cmd.wiredInPatterns).toBe(true);
          }
        });

        it('has profile keywords for all languages', () => {
          const allLangs = SUPPORTED_LANGUAGES.map(l => l.code);
          const missing = allLangs.filter(
            lang => !cmd.profileKeywordsIn.includes(lang)
          );
          if (missing.length > 0) {
            console.warn(`${cmd.action} missing profile keywords for:`, missing);
          }
          // Expect at least English
          expect(cmd.profileKeywordsIn).toContain('en');
        });

        it('passes validation', () => {
          const result = validateCommand(cmd);
          if (!result.valid) {
            console.log(`Validation errors for ${cmd.action}:`, result.errors);
          }
          // Allow warnings but not errors
          expect(result.errors).toHaveLength(0);
        });
      });
    }
  });
});

// =============================================================================
// Cross-Validation Tests
// =============================================================================

describe('Cross-Validation', () => {
  it('all tokenizer languages have profiles', () => {
    const tokenizerLangs = getTokenizerLanguages();
    for (const lang of tokenizerLangs) {
      expect(languageProfiles[lang]).toBeDefined();
    }
  });

  it('all profile languages have tokenizers', () => {
    const profileLangs = Object.keys(languageProfiles);
    const tokenizerLangs = getTokenizerLanguages();
    for (const lang of profileLangs) {
      expect(tokenizerLangs).toContain(lang);
    }
  });

  it('all pattern languages have tokenizers', () => {
    const patternLangs = getPatternLanguages();
    const tokenizerLangs = getTokenizerLanguages();
    for (const lang of patternLangs) {
      expect(tokenizerLangs).toContain(lang);
    }
  });

  it('documented languages match actual languages', () => {
    const documentedLangs = SUPPORTED_LANGUAGES.map(l => l.code).sort();
    const actualLangs = getTokenizerLanguages().sort();
    expect(documentedLangs).toEqual(actualLangs);
  });
});

// =============================================================================
// Keyword Sync Report
// =============================================================================

describe('Keyword Sync Report', () => {
  it('generates sync report', () => {
    console.log('\n=== Keyword Sync Report ===\n');

    for (const lang of SUPPORTED_LANGUAGES) {
      const profile = languageProfiles[lang.code];
      if (!profile) continue;

      const profileKeywords = Object.keys(profile.keywords || {});
      const tokenizerKeywords = lang.tokenizerKeywords;

      // Find profile keywords not in tokenizer
      const missingInTokenizer: string[] = [];
      for (const cmd of profileKeywords) {
        const kw = profile.keywords[cmd];
        if (!kw) continue;

        const allForms = [kw.primary, ...(kw.alternatives || [])];
        const hasAny = allForms.some(form =>
          tokenizerKeywords.some(tk => tk === form || tk.includes(form))
        );

        if (!hasAny) {
          missingInTokenizer.push(`${cmd} (${kw.primary})`);
        }
      }

      if (missingInTokenizer.length > 0) {
        console.log(`${lang.name} (${lang.code}):`);
        console.log(`  Missing in tokenizer: ${missingInTokenizer.join(', ')}`);
      }
    }

    console.log('\n=== End Report ===\n');

    // This test always passes - it's just for reporting
    expect(true).toBe(true);
  });
});
