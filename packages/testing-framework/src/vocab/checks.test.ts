/**
 * Each check is proven against a seeded disagreement (fires) and a seeded
 * agreement (stays silent) — never "does it run".
 */

import { describe, expect, it } from 'vitest';
import { runChecks } from './checks';
import { buildLedger } from './report';
import type { Finding, LangVocab, VocabModel } from './types';
import { findingKey } from './types';

function lang(partial: Partial<LangVocab>): LangVocab {
  return {
    language: 'xx',
    keywords: {},
    roleMarkers: {},
    schemaMarkers: [],
    grammarMarkers: [],
    ...partial,
  };
}

const model = (l: Partial<LangVocab>): VocabModel => ({ languages: [lang(l)] });

const of = (findings: Finding[], check: string, tier?: string) =>
  findings.filter(f => f.check === check && (!tier || f.tier === tier));

describe('V1 — profile keywords vs i18n dictionary', () => {
  it('fires an error when the dictionary translates a concept differently', () => {
    const findings = runChecks(
      model({
        keywords: { toggle: { primary: 'alternar', alternatives: ['conmutar'] } },
        dictionary: { commands: { toggle: 'cambiar' } },
      })
    );
    const errors = of(findings, 'V1', 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].key).toBe('toggle');
    expect(errors[0].message).toContain('cambiar');
  });

  it('accepts a dictionary value matching an alternative form (set containment, not 1:1)', () => {
    const findings = runChecks(
      model({
        keywords: { toggle: { primary: 'alternar', alternatives: ['conmutar'] } },
        dictionary: { commands: { toggle: 'Conmutar' } }, // case difference must normalize away
      })
    );
    expect(of(findings, 'V1', 'error')).toHaveLength(0);
  });

  it('V1b: warns on a profile concept missing from the dictionary, infos on dictionary-only keys', () => {
    const findings = runChecks(
      model({
        keywords: { toggle: { primary: 'alternar' } },
        dictionary: { commands: { add: 'añadir' } },
      })
    );
    expect(of(findings, 'V1b', 'warn').map(f => f.key)).toEqual(['toggle']);
    expect(of(findings, 'V1b', 'info').map(f => f.key)).toEqual(['add']);
  });

  it('stays silent without a dictionary (no S3 surface for the language)', () => {
    const findings = runChecks(model({ keywords: { toggle: { primary: 'x' } } }));
    expect(of(findings, 'V1')).toHaveLength(0);
    expect(of(findings, 'V1b')).toHaveLength(0);
  });
});

describe('V2 — role markers three-way', () => {
  it('fires an error when the grammar renders a marker the parse side does not know', () => {
    const findings = runChecks(
      model({
        roleMarkers: { destination: { primary: 'e' } },
        schemaMarkers: [{ action: 'set', role: 'destination', marker: 'de', kind: 'override' }],
        grammarMarkers: [{ form: 'ya', role: 'destination' }], // the tr allomorph class
      })
    );
    const errors = of(findings, 'V2', 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].key).toBe('destination:ya');
  });

  it('accepts a grammar form known via a schema variant (union across S1+S2)', () => {
    const findings = runChecks(
      model({
        roleMarkers: { destination: { primary: 'e' } },
        schemaMarkers: [{ action: 'set', role: 'destination', marker: 'ya', kind: 'variant' }],
        grammarMarkers: [
          { form: 'ya', role: 'destination' },
          { form: 'e', role: 'destination' },
        ],
      })
    );
    expect(of(findings, 'V2', 'error')).toHaveLength(0);
  });

  it('downgrades to info when the role has no parse-side markers at all', () => {
    const findings = runChecks(model({ grammarMarkers: [{ form: 'на', role: 'locative' }] }));
    expect(of(findings, 'V2', 'error')).toHaveLength(0);
    expect(of(findings, 'V2', 'info')).toHaveLength(1);
  });

  it('accepts an event marker known only via the hardcoded SOV table (surface #6)', () => {
    const withoutSurface6 = runChecks(
      model({
        roleMarkers: { event: { primary: 'に' } },
        grammarMarkers: [{ form: 'で', role: 'event' }], // the ja class from the first ledger
      })
    );
    expect(of(withoutSurface6, 'V2', 'error')).toHaveLength(1);

    const withSurface6 = runChecks(
      model({
        roleMarkers: { event: { primary: 'に' } },
        grammarMarkers: [{ form: 'で', role: 'event' }],
        sovEventMarkers: ['で'],
      })
    );
    expect(of(withSurface6, 'V2', 'error')).toHaveLength(0);
  });

  it('warns when the profile canonical marker never appears among the grammar forms', () => {
    const findings = runChecks(
      model({
        roleMarkers: { destination: { primary: 'zu', alternatives: ['nach'] } },
        grammarMarkers: [{ form: 'nach', role: 'destination' }],
      })
    );
    const warns = of(findings, 'V2', 'warn');
    expect(warns).toHaveLength(1);
    expect(warns[0].key).toBe('destination:primary');
  });
});

describe('V3 — event names', () => {
  it('fires an error when the dictionary and eventNameTranslations disagree on an event', () => {
    const findings = runChecks(
      model({
        eventTranslations: { クリック: 'click' },
        dictionary: { events: { click: '押す' } },
      })
    );
    const errors = of(findings, 'V3', 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].key).toBe('click');
  });

  it('accepts agreement (any native form recognized for the event)', () => {
    const findings = runChecks(
      model({
        eventTranslations: { クリック: 'click', おす: 'click' },
        dictionary: { events: { click: 'クリック' } },
      })
    );
    expect(of(findings, 'V3', 'error')).toHaveLength(0);
  });

  it('V3b: infos when a language has no eventNameTranslations table', () => {
    const findings = runChecks(model({ dictionary: { events: { click: 'klik' } } }));
    expect(of(findings, 'V3b', 'info')).toHaveLength(1);
    expect(of(findings, 'V3', 'error')).toHaveLength(0);
  });
});

describe('V4 — tokenizer classification', () => {
  const classify = (word: string) => (word === 'kaydır' ? 'identifier' : 'keyword');

  it('fires an error when a vocab word does not classify as keyword/particle', () => {
    const findings = runChecks(
      model({
        keywords: { scroll: { primary: 'kaydır' } },
        classify,
      })
    );
    const errors = of(findings, 'V4', 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].key).toBe('kaydır');
    expect(errors[0].message).toContain("'identifier'");
  });

  it('collects from all four sources and dedupes the word into one finding', () => {
    const findings = runChecks(
      model({
        keywords: { scroll: { primary: 'kaydır' } },
        roleMarkers: { patient: { primary: 'kaydır' } },
        schemaMarkers: [{ action: 'go', role: 'patient', marker: 'kaydır', kind: 'override' }],
        grammarMarkers: [{ form: 'kaydır', role: 'patient' }],
        classify,
      })
    );
    const errors = of(findings, 'V4', 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].source).toContain('profile.keywords.scroll');
  });

  it('accepts particles and skips multi-word forms', () => {
    const findings = runChecks(
      model({
        roleMarkers: { patient: { primary: 'を' }, event: { primary: 'do not' } },
        classify: () => 'particle',
      })
    );
    expect(of(findings, 'V4')).toHaveLength(0);
  });

  it('stays silent without a tokenizer', () => {
    const findings = runChecks(model({ keywords: { scroll: { primary: 'kaydır' } } }));
    expect(of(findings, 'V4')).toHaveLength(0);
  });
});

describe('check filter + ledger/waivers', () => {
  const disagreeing = (): VocabModel =>
    model({
      keywords: { toggle: { primary: 'a' } },
      dictionary: { commands: { toggle: 'b' } },
    });

  it('--check filters to the requested checks only', () => {
    const findings = runChecks(disagreeing(), ['V4']);
    expect(findings).toHaveLength(0);
  });

  it('waivers suppress exactly the keyed error and flag stale keys', () => {
    const findings = runChecks(disagreeing());
    const key = findingKey(of(findings, 'V1', 'error')[0]);
    const ledger = buildLedger(findings, [
      { key, reason: 'legit morphology divergence' },
      { key: 'V1|zz|ghost', reason: 'stale' },
    ]);
    expect(ledger.unwaivedErrors).toBe(0);
    expect(ledger.findings.find(f => findingKey(f) === key)?.waived).toBe(
      'legit morphology divergence'
    );
    expect(ledger.staleWaivers).toEqual(['V1|zz|ghost']);
  });

  it('class waivers (wildcard segments) cover every finding in the class', () => {
    const twoLangs: VocabModel = {
      languages: [
        lang({
          language: 'es',
          keywords: { toggle: { primary: 'a' } },
          dictionary: { commands: { toggle: 'b' } },
        }),
        lang({
          language: 'fr',
          keywords: { toggle: { primary: 'c' } },
          dictionary: { commands: { toggle: 'd' } },
        }),
      ],
    };
    const findings = runChecks(twoLangs);
    expect(of(findings, 'V1', 'error')).toHaveLength(2);

    const ledger = buildLedger(findings, [
      { key: 'V1|*|*', reason: 'pending Arc B reconciliation' },
    ]);
    expect(ledger.unwaivedErrors).toBe(0);
    expect(
      ledger.findings
        .filter(f => f.waived)
        .map(f => f.language)
        .sort()
    ).toEqual(['es', 'fr']);
    expect(ledger.staleWaivers).toHaveLength(0);
  });

  it('a wildcard waiver matching nothing is stale', () => {
    const findings = runChecks(disagreeing());
    const ledger = buildLedger(findings, [{ key: 'V3|*|*', reason: 'nothing here' }]);
    expect(ledger.staleWaivers).toEqual(['V3|*|*']);
  });

  it('waivers never apply to warn/info tiers', () => {
    const findings = runChecks(
      model({ keywords: { toggle: { primary: 'a' } }, dictionary: { commands: {} } })
    );
    const warn = of(findings, 'V1b', 'warn')[0];
    const ledger = buildLedger(findings, [{ key: findingKey(warn), reason: 'nope' }]);
    expect(
      ledger.findings.find(f => f.check === 'V1b' && f.tier === 'warn')?.waived
    ).toBeUndefined();
    expect(ledger.staleWaivers).toHaveLength(1);
  });
});
