/**
 * triage-r1.ts
 *
 * Read-only sweep that itemizes R1 role-fidelity misses per language: for every
 * corpus pattern whose roleFidelity < 1, the `action.role:type` entries present
 * in the en reference parse but absent from the translation's parse — clustered
 * by entry so the dominant failure families are visible, with the entries the
 * translation captured INSTEAD for the same action (the mistype pairing).
 *
 * Why this exists: avgRoleFidelity summarizes the SOV-six gap (qu ~0.95, the
 * rest ~0.97) to one number per language, and the regression gate only reports
 * DROPS. Planning an improvement arc needs the misses themselves — which roles,
 * on which actions, in which patterns — measured with exactly the pipeline the
 * gate scores (ParseValidator → fillSchemaDefaults → collectRoleSignature →
 * Set recall vs the en reference), so a "fix" that moves the probe also moves
 * the signal.
 *
 * This tool never writes a baseline and never gates. It only reads.
 */
import { computeFidelity } from '../fidelity';
import { loadPatterns } from '../pattern-loader';
import { ParseValidator } from '../validators/parse-validator';
import type { ParseResult, TestConfig } from '../types';

interface MissCluster {
  /** The en-reference `action.role:type` entry the language failed to recall. */
  entry: string;
  /** Pattern ids where this entry was missed. */
  patterns: string[];
  /**
   * What the language's parse captured for the SAME action in those patterns
   * (entries absent from the en reference) — usually the mistype the miss
   * paired with (`trigger.patient:literal` opposite a missing
   * `trigger.event:literal`). Empty when the whole command dropped.
   */
  haveInstead: Set<string>;
}

const MAX_PATTERN_IDS_SHOWN = 6;

/**
 * Sweep the corpus and itemize R1 misses for the requested languages
 * (default: every non-en language in the run).
 */
export async function triageR1(config: TestConfig): Promise<void> {
  // The en rows ARE the reference — force-load them even when the caller
  // filtered --languages to the triage targets.
  const requested = config.languages?.filter(l => l !== 'en');
  const loadConfig: TestConfig =
    requested && requested.length > 0
      ? { ...config, languages: [...requested, 'en' as const] }
      : config;

  const patterns = await loadPatterns(loadConfig);
  const validator = new ParseValidator();
  const results = await validator.validate(patterns);

  const reference = new Map<string, string[]>();
  for (const r of results) {
    if (r.pattern.language !== 'en') continue;
    if (r.success && r.roleSignature && r.roleSignature.length > 0) {
      reference.set(r.pattern.codeExampleId, r.roleSignature);
    }
  }

  const byLanguage = new Map<string, ParseResult[]>();
  for (const r of results) {
    if (r.pattern.language === 'en') continue;
    if (requested && requested.length > 0 && !requested.includes(r.pattern.language)) continue;
    const list = byLanguage.get(r.pattern.language) ?? [];
    list.push(r);
    byLanguage.set(r.pattern.language, list);
  }

  console.log('\nR1 role-fidelity triage (action.role:type recall vs the en reference)');
  console.log('━'.repeat(72));

  for (const [language, langResults] of [...byLanguage.entries()].sort()) {
    const clusters = new Map<string, MissCluster>();
    const scores: number[] = [];
    let patternsWithMisses = 0;

    for (const result of langResults) {
      if (!result.success || !result.roleSignature) continue;
      const ref = reference.get(result.pattern.codeExampleId);
      if (!ref) continue;

      const fidelity = computeFidelity(ref, result.roleSignature);
      if (fidelity === undefined) continue;
      scores.push(fidelity);
      if (fidelity >= 1) continue;

      patternsWithMisses++;
      const candidate = new Set(result.roleSignature);
      const refSet = new Set(ref);
      const missing = ref.filter(e => !candidate.has(e));
      // Entries this parse has that the reference doesn't — candidates for the
      // "captured instead" pairing, keyed by action.
      const extrasByAction = new Map<string, string[]>();
      for (const e of result.roleSignature) {
        if (refSet.has(e)) continue;
        const action = e.slice(0, e.indexOf('.'));
        const list = extrasByAction.get(action) ?? [];
        list.push(e);
        extrasByAction.set(action, list);
      }

      for (const entry of missing) {
        const cluster = clusters.get(entry) ?? {
          entry,
          patterns: [],
          haveInstead: new Set<string>(),
        };
        cluster.patterns.push(result.pattern.codeExampleId);
        const action = entry.slice(0, entry.indexOf('.'));
        for (const e of extrasByAction.get(action) ?? []) cluster.haveInstead.add(e);
        clusters.set(entry, cluster);
      }
    }

    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
    const totalMisses = [...clusters.values()].reduce((a, c) => a + c.patterns.length, 0);

    console.log(
      `\n[${language}] avgRoleFidelity ${avg?.toFixed(4) ?? 'n/a'} — ` +
        `${totalMisses} miss(es) across ${patternsWithMisses} pattern(s), ` +
        `${clusters.size} distinct entry(ies)`
    );

    const sorted = [...clusters.values()].sort(
      (a, b) => b.patterns.length - a.patterns.length || a.entry.localeCompare(b.entry)
    );
    for (const cluster of sorted) {
      const ids =
        cluster.patterns.length > MAX_PATTERN_IDS_SHOWN
          ? `${cluster.patterns.slice(0, MAX_PATTERN_IDS_SHOWN).join(', ')}, +${
              cluster.patterns.length - MAX_PATTERN_IDS_SHOWN
            } more`
          : cluster.patterns.join(', ');
      console.log(`  ×${cluster.patterns.length}  missing ${cluster.entry}`);
      console.log(`        in: ${ids}`);
      if (cluster.haveInstead.size > 0) {
        console.log(`        captured instead: ${[...cluster.haveInstead].sort().join(', ')}`);
      }
    }
  }

  console.log();
}
