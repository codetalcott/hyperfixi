/**
 * diagnose-coverage.ts
 *
 * Read-only sweep that counts how often the semantic parser matches a pattern
 * covering only PART of its input — the `unconsumed-input` diagnostic.
 *
 * Why this exists: confidence is computed from role coverage (how many of the
 * pattern's own roles were filled), never from input coverage. A short pattern
 * can fill every role, score 1.0, and silently drop a trailing clause. Turning
 * that into a scoring penalty would move the multilingual fidelity baseline
 * across all 24 languages, so the firing rate has to be MEASURED first — on the
 * real corpus, per language, with the dropped spans visible.
 *
 * This tool never writes a baseline and never gates. It only reads.
 */
import { parseSemantic } from '@lokascript/semantic';

import { loadPatterns } from '../pattern-loader';
import type { TestConfig } from '../types';

interface LanguageTally {
  language: string;
  total: number;
  fired: number;
  /** A few representative dropped spans, for eyeballing false positives. */
  samples: Array<{ source: string; message: string; confidence: number }>;
}

const MAX_SAMPLES_PER_LANGUAGE = 3;
const UNCONSUMED_CODE = 'unconsumed-input';

function unconsumedMessages(node: unknown): string[] {
  const diagnostics = (node as { diagnostics?: Array<{ code?: string; message: string }> } | null)
    ?.diagnostics;
  if (!diagnostics?.length) return [];
  return diagnostics.filter(d => d.code === UNCONSUMED_CODE).map(d => d.message);
}

/**
 * Sweep the corpus and report the `unconsumed-input` firing rate per language.
 *
 * @returns the total number of firings (0 when the signal never trips)
 */
export async function diagnoseCoverage(config: TestConfig): Promise<number> {
  const patterns = await loadPatterns(config);
  const byLanguage = new Map<string, LanguageTally>();

  for (const pattern of patterns) {
    const tally = byLanguage.get(pattern.language) ?? {
      language: pattern.language,
      total: 0,
      fired: 0,
      samples: [],
    };
    tally.total++;

    let messages: string[] = [];
    let confidence = 0;
    try {
      const result = parseSemantic(pattern.hyperscript, pattern.language);
      confidence = result.confidence;
      messages = unconsumedMessages(result.node);
    } catch {
      // A parse failure is not an input-coverage problem — it is already visible
      // to the parse-rate gate. Skip it rather than double-counting.
    }

    const firstMessage = messages[0];
    if (firstMessage !== undefined) {
      tally.fired++;
      if (tally.samples.length < MAX_SAMPLES_PER_LANGUAGE) {
        tally.samples.push({ source: pattern.hyperscript, message: firstMessage, confidence });
      }
    }
    byLanguage.set(pattern.language, tally);
  }

  report([...byLanguage.values()].sort((a, b) => b.fired / b.total - a.fired / a.total));
  return [...byLanguage.values()].reduce((sum, t) => sum + t.fired, 0);
}

function report(tallies: LanguageTally[]): void {
  const total = tallies.reduce((s, t) => s + t.total, 0);
  const fired = tallies.reduce((s, t) => s + t.fired, 0);

  console.log('\nInput-coverage diagnostic — `unconsumed-input` firing rate');
  console.log('(a fired row parsed successfully but ignored part of its source)\n');
  console.log('  lang    fired /  total    rate');
  console.log('  ─────────────────────────────────');
  for (const t of tallies) {
    const rate = t.total ? (t.fired / t.total) * 100 : 0;
    console.log(
      `  ${t.language.padEnd(6)} ${String(t.fired).padStart(5)} / ${String(t.total).padStart(6)}  ${rate.toFixed(1).padStart(6)}%`
    );
  }
  console.log('  ─────────────────────────────────');
  const overall = total ? (fired / total) * 100 : 0;
  console.log(
    `  ALL    ${String(fired).padStart(5)} / ${String(total).padStart(6)}  ${overall.toFixed(1).padStart(6)}%\n`
  );

  const withSamples = tallies.filter(t => t.samples.length > 0);
  if (withSamples.length === 0) {
    console.log('No unconsumed input anywhere in the corpus.\n');
    return;
  }

  console.log('Sample dropped spans (check these for false positives — trailing');
  console.log('particles and legitimately-optional tokens are expected residue):\n');
  for (const t of withSamples) {
    console.log(`  [${t.language}]`);
    for (const s of t.samples) {
      console.log(`    source (conf ${s.confidence.toFixed(2)}): ${s.source}`);
      console.log(`    ${s.message}`);
    }
    console.log('');
  }
}
