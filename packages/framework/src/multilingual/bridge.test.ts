/**
 * Tests for the framework ↔ semantic bridge builders.
 *
 * Uses inline fixture slices (en-like SVO, ja-like SOV particle, ar-like RTL
 * VSO) — no semantic dependency: any `@lokascript/semantic` LanguageProfile
 * satisfies GrammarProfileSlice structurally, and so do these fixtures.
 */

import { describe, it, expect } from 'vitest';
import {
  buildPatternProfile,
  buildDomainTokenizer,
  buildLanguageConfig,
  deriveRoleMarkers,
} from './builders';
import type { GrammarProfileSlice, DomainVocabulary } from './types';
import { generatePattern } from '../generation/pattern-generator';
import { defineCommand, defineRole } from '../schema';
import { createMultilingualDSL } from '../api/create-dsl';

// =============================================================================
// Fixture slices (mirror the shape of semantic KNOWN_PROFILES entries)
// =============================================================================

const EN_SLICE: GrammarProfileSlice = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  wordOrder: 'SVO',
  direction: 'ltr',
  script: 'latin',
  usesSpaces: true,
  markingStrategy: 'preposition',
  roleMarkers: {
    source: { primary: 'from', position: 'before' },
    destination: { primary: 'into', alternatives: ['to'], position: 'before' },
  },
};

const JA_SLICE: GrammarProfileSlice = {
  code: 'ja',
  name: 'Japanese',
  nativeName: '日本語',
  wordOrder: 'SOV',
  direction: 'ltr',
  script: 'cjk',
  usesSpaces: false,
  markingStrategy: 'particle',
  tokenization: { particles: ['を', 'に', 'から'], boundaryStrategy: 'particle' },
  roleMarkers: {
    patient: { primary: 'を', position: 'after' },
    destination: { primary: 'に', alternatives: ['へ'], position: 'after' },
    source: { primary: 'から', position: 'after' },
  },
};

const AR_SLICE: GrammarProfileSlice = {
  code: 'ar',
  wordOrder: 'VSO',
  direction: 'rtl',
  script: 'arabic',
  usesSpaces: true,
  markingStrategy: 'preposition',
  roleMarkers: {
    source: { primary: 'من', position: 'before' },
    destination: { primary: 'في', position: 'before' },
  },
};

const EN_VOCAB: DomainVocabulary = {
  keywords: {
    select: { primary: 'select', alternatives: ['get'] },
    insert: { primary: 'insert' },
  },
  tokenizerKeywords: ['where', 'and'],
};

const JA_VOCAB: DomainVocabulary = {
  keywords: {
    select: { primary: '選択' },
    insert: { primary: '挿入' },
  },
  roleMarkerOverrides: {
    condition: { primary: '条件', position: 'before' },
  },
};

const AR_VOCAB: DomainVocabulary = {
  keywords: {
    select: { primary: 'اختر' },
    insert: { primary: 'أدخل' },
  },
};

// =============================================================================
// GrammarProfileSlice structural acceptance
// =============================================================================

describe('GrammarProfileSlice', () => {
  it('accepts a full semantic-LanguageProfile-shaped object without a cast', () => {
    // Mirrors the field set of a semantic LanguageProfile, including the
    // hyperscript-specific fields the slice ignores (keywords, references,
    // possessive, eventHandler). Structural typing must accept it as-is.
    const semanticShaped = {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      regions: ['east-asian', 'priority'],
      direction: 'ltr',
      script: 'cjk',
      wordOrder: 'SOV',
      markingStrategy: 'particle',
      usesSpaces: false,
      defaultVerbForm: 'base',
      verb: { position: 'end', suffixes: ['る', 'て'], subjectDrop: true },
      references: { me: '自分', it: 'それ' },
      possessive: { marker: 'の', markerPosition: 'between' },
      roleMarkers: {
        patient: { primary: 'を', position: 'after' },
        destination: { primary: 'に', alternatives: ['へ', 'で'], position: 'after' },
      },
      keywords: {
        toggle: { primary: '切り替え', alternatives: ['トグル'], normalized: 'toggle' },
      },
      tokenization: { particles: ['を', 'に'], boundaryStrategy: 'particle' },
    } as const;

    const slice: GrammarProfileSlice = semanticShaped;
    expect(slice.code).toBe('ja');
    expect(slice.roleMarkers?.patient?.primary).toBe('を');
  });
});

// =============================================================================
// buildPatternProfile
// =============================================================================

describe('buildPatternProfile', () => {
  it('combines domain keywords with slice grammar', () => {
    const profile = buildPatternProfile(EN_SLICE, EN_VOCAB);

    expect(profile.code).toBe('en');
    expect(profile.wordOrder).toBe('SVO');
    expect(profile.keywords.select).toEqual({ primary: 'select', alternatives: ['get'] });
    expect(profile.keywords.insert).toEqual({ primary: 'insert' });
    expect(profile.roleMarkers?.source).toEqual({ primary: 'from', position: 'before' });
    expect(profile.roleMarkers?.destination).toEqual({
      primary: 'into',
      alternatives: ['to'],
      position: 'before',
    });
  });

  it('merges vocab roleMarkerOverrides over slice markers (vocab wins, adds domain roles)', () => {
    const profile = buildPatternProfile(JA_SLICE, JA_VOCAB);

    // Slice defaults preserved
    expect(profile.roleMarkers?.patient).toEqual({ primary: 'を', position: 'after' });
    // Domain-specific role added by the vocabulary
    expect(profile.roleMarkers?.condition).toEqual({ primary: '条件', position: 'before' });
  });

  it('lets an override replace a slice marker, and an empty primary remove one', () => {
    const vocab: DomainVocabulary = {
      keywords: { select: { primary: 'seç' } },
      roleMarkerOverrides: {
        source: { primary: 'den', position: 'after' },
        destination: { primary: '' },
      },
    };
    const profile = buildPatternProfile(JA_SLICE, vocab);

    expect(profile.roleMarkers?.source).toEqual({ primary: 'den', position: 'after' });
    expect(profile.roleMarkers?.destination).toBeUndefined();
  });

  it('omits roleMarkers entirely when neither slice nor vocab provides any', () => {
    const bare: GrammarProfileSlice = { code: 'xx', wordOrder: 'SVO' };
    const profile = buildPatternProfile(bare, { keywords: { go: { primary: 'go' } } });

    expect(profile.roleMarkers).toBeUndefined();
  });

  it('copies alternatives into fresh mutable arrays', () => {
    const profile = buildPatternProfile(EN_SLICE, EN_VOCAB);
    const alternatives = EN_VOCAB.keywords.select.alternatives!;

    expect(profile.keywords.select.alternatives).not.toBe(alternatives);
    expect(profile.keywords.select.alternatives).toEqual([...alternatives]);
  });

  describe('generatePattern integration', () => {
    const moveSchema = defineCommand({
      action: 'move',
      description: 'Move a thing',
      category: 'test',
      primaryRole: 'patient',
      roles: [
        defineRole({
          role: 'patient',
          required: true,
          expectedTypes: ['expression'],
          svoPosition: 2,
          sovPosition: 2,
        }),
        defineRole({
          role: 'destination',
          required: true,
          expectedTypes: ['expression'],
          svoPosition: 1,
          sovPosition: 1,
        }),
      ],
    });

    it('SVO (en-like): keyword first, prepositional marker before its role', () => {
      const vocab: DomainVocabulary = { keywords: { move: { primary: 'move' } } };
      const pattern = generatePattern(moveSchema, buildPatternProfile(EN_SLICE, vocab));

      expect(pattern.template.tokens).toEqual([
        { type: 'literal', value: 'move' },
        { type: 'role', role: 'patient', optional: false, expectedTypes: ['expression'] },
        { type: 'literal', value: 'into' },
        { type: 'role', role: 'destination', optional: false, expectedTypes: ['expression'] },
      ]);
    });

    it('SOV (ja-like): particles after their roles, verb last', () => {
      const vocab: DomainVocabulary = { keywords: { move: { primary: '移動' } } };
      const pattern = generatePattern(moveSchema, buildPatternProfile(JA_SLICE, vocab));

      expect(pattern.template.tokens).toEqual([
        { type: 'role', role: 'patient', optional: false, expectedTypes: ['expression'] },
        { type: 'literal', value: 'を' },
        { type: 'role', role: 'destination', optional: false, expectedTypes: ['expression'] },
        { type: 'literal', value: 'に' },
        { type: 'literal', value: '移動' },
      ]);
    });

    it('VSO (ar-like): verb first', () => {
      const vocab: DomainVocabulary = { keywords: { move: { primary: 'انقل' } } };
      const pattern = generatePattern(moveSchema, buildPatternProfile(AR_SLICE, vocab));

      expect(pattern.template.tokens[0]).toEqual({ type: 'literal', value: 'انقل' });
    });
  });
});

// =============================================================================
// buildDomainTokenizer
// =============================================================================

describe('buildDomainTokenizer', () => {
  it('sets language and direction from the slice', () => {
    expect(buildDomainTokenizer(EN_SLICE, EN_VOCAB).language).toBe('en');
    expect(buildDomainTokenizer(EN_SLICE, EN_VOCAB).direction).toBe('ltr');
    expect(buildDomainTokenizer(AR_SLICE, AR_VOCAB).direction).toBe('rtl');
  });

  it('classifies vocab verbs, alternatives, slice markers, and extra keywords as keywords', () => {
    const tokenizer = buildDomainTokenizer(EN_SLICE, EN_VOCAB);

    expect(tokenizer.classifyToken('select')).toBe('keyword');
    expect(tokenizer.classifyToken('get')).toBe('keyword'); // alternative
    expect(tokenizer.classifyToken('from')).toBe('keyword'); // slice role marker
    expect(tokenizer.classifyToken('to')).toBe('keyword'); // marker alternative
    expect(tokenizer.classifyToken('where')).toBe('keyword'); // tokenizerKeywords
    expect(tokenizer.classifyToken('users')).toBe('identifier');
    expect(tokenizer.classifyToken('42')).toBe('literal');
  });

  it('is case-insensitive by default for Latin scripts', () => {
    const tokenizer = buildDomainTokenizer(EN_SLICE, EN_VOCAB);
    expect(tokenizer.classifyToken('SELECT')).toBe('keyword');
    expect(tokenizer.classifyToken('From')).toBe('keyword');
  });

  it('classifies particles and non-Latin verbs as keywords (ja-like)', () => {
    const tokenizer = buildDomainTokenizer(JA_SLICE, JA_VOCAB);

    expect(tokenizer.classifyToken('選択')).toBe('keyword');
    expect(tokenizer.classifyToken('を')).toBe('keyword'); // tokenization particle
    expect(tokenizer.classifyToken('条件')).toBe('keyword'); // vocab roleMarkerOverride
  });

  it('includes operators by default and honors includeOperators: false', () => {
    const withOps = buildDomainTokenizer(EN_SLICE, EN_VOCAB);
    const withoutOps = buildDomainTokenizer(EN_SLICE, EN_VOCAB, { includeOperators: false });

    expect(withOps.classifyToken('=')).toBe('operator');
    expect(withoutOps.classifyToken('=')).toBe('identifier');
  });

  it('keeps diacritic identifiers whole for latin-script slices (R8 by construction)', () => {
    const esSlice: GrammarProfileSlice = { code: 'es', wordOrder: 'SVO', script: 'latin' };
    const vocab: DomainVocabulary = { keywords: { insert: { primary: 'añadir' } } };
    const tokenizer = buildDomainTokenizer(esSlice, vocab);

    const stream = tokenizer.tokenize('añadir usuarios');
    const first = stream.advance();
    expect(first.value).toBe('añadir');
    expect(tokenizer.classifyToken(first.value)).toBe('keyword');
  });

  it('tokenizes multi-word vocab keywords as a single normalized token', () => {
    const frSlice: GrammarProfileSlice = { code: 'fr', wordOrder: 'SVO', script: 'latin' };
    const vocab: DomainVocabulary = { keywords: { update: { primary: 'mettre à jour' } } };
    const tokenizer = buildDomainTokenizer(frSlice, vocab);

    const stream = tokenizer.tokenize('mettre à jour utilisateurs');
    const first = stream.advance();
    expect(first.value).toBe('mettre à jour');
    expect(first.kind).toBe('keyword');
    expect(first.normalized).toBe('update');
  });

  it('threads vocab keywordExtras into the keyword map', () => {
    const vocab: DomainVocabulary = {
      ...JA_VOCAB,
      keywordExtras: [{ native: 'すべて 削除', normalized: 'truncate' }],
    };
    const tokenizer = buildDomainTokenizer(JA_SLICE, vocab);

    const stream = tokenizer.tokenize('すべて 削除');
    const first = stream.advance();
    expect(first.value).toBe('すべて 削除');
    expect(first.normalized).toBe('truncate');
  });
});

// =============================================================================
// buildLanguageConfig
// =============================================================================

describe('buildLanguageConfig', () => {
  it('assembles a complete LanguageConfig from slice + vocab', () => {
    const config = buildLanguageConfig(JA_SLICE, JA_VOCAB);

    expect(config.code).toBe('ja');
    expect(config.name).toBe('Japanese');
    expect(config.nativeName).toBe('日本語');
    expect(config.tokenizer.language).toBe('ja');
    expect(config.patternProfile.code).toBe('ja');
    expect(config.patternProfile.wordOrder).toBe('SOV');
  });

  it('falls back to the language code when the slice has no names', () => {
    const config = buildLanguageConfig(AR_SLICE, AR_VOCAB);

    expect(config.name).toBe('ar');
    expect(config.nativeName).toBe('ar');
  });

  it('lets meta override names and tokenizer', () => {
    const customTokenizer = buildDomainTokenizer(EN_SLICE, EN_VOCAB, { includeOperators: false });
    const config = buildLanguageConfig(EN_SLICE, EN_VOCAB, {
      name: 'English (US)',
      nativeName: 'American English',
      tokenizer: customTokenizer,
    });

    expect(config.name).toBe('English (US)');
    expect(config.nativeName).toBe('American English');
    expect(config.tokenizer).toBe(customTokenizer);
  });

  describe('createMultilingualDSL integration', () => {
    const selectSchema = defineCommand({
      action: 'select',
      description: 'Select data',
      category: 'query',
      primaryRole: 'columns',
      roles: [
        defineRole({
          role: 'columns',
          required: true,
          expectedTypes: ['expression'],
          svoPosition: 2,
          sovPosition: 1,
        }),
        defineRole({
          role: 'source',
          required: true,
          expectedTypes: ['expression'],
          svoPosition: 1,
          sovPosition: 2,
        }),
      ],
    });

    const dsl = createMultilingualDSL({
      name: 'BridgeTestSQL',
      schemas: [selectSchema],
      languages: [buildLanguageConfig(EN_SLICE, EN_VOCAB), buildLanguageConfig(JA_SLICE, JA_VOCAB)],
    });

    it('parses English through a bridge-built config', () => {
      const node = dsl.parse('select name from users', 'en');

      expect(node.action).toBe('select');
      expect(node.roles.has('columns')).toBe(true);
      expect(node.roles.has('source')).toBe(true);
    });

    it('parses Japanese (SOV, particle markers) through a bridge-built config', () => {
      const node = dsl.parse('users から name 選択', 'ja');

      expect(node.action).toBe('select');
      expect(node.roles.has('source')).toBe(true);
    });
  });
});

// =============================================================================
// deriveRoleMarkers
// =============================================================================

describe('deriveRoleMarkers', () => {
  it('maps domain roles to the slice markers of their semantic counterparts', () => {
    expect(deriveRoleMarkers(JA_SLICE, { table: 'source', target: 'destination' })).toEqual({
      table: 'から',
      target: 'に',
    });
    expect(deriveRoleMarkers(EN_SLICE, { table: 'source', target: 'destination' })).toEqual({
      table: 'from',
      target: 'into',
    });
  });

  it('omits domain roles whose semantic role has no marker in the slice', () => {
    expect(deriveRoleMarkers(EN_SLICE, { table: 'source', cond: 'condition' })).toEqual({
      table: 'from',
    });
  });

  it('returns an empty record for a slice without roleMarkers', () => {
    const bare: GrammarProfileSlice = { code: 'xx', wordOrder: 'SVO' };
    expect(deriveRoleMarkers(bare, { table: 'source' })).toEqual({});
  });
});
