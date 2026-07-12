/**
 * Waiver application + console/JSON reporting for the vocab checks.
 *
 * Waivers apply to error-tier findings only (warn/info never gate), keyed by
 * `check|language|key` with a mandatory reason. A waiver that matches nothing
 * is stale and reported so the file cannot rot silently.
 */

import * as fs from 'node:fs';
import type { Finding, Tier, Waiver } from './types';
import { findingKey } from './types';

export interface Ledger {
  generatedAt: string;
  totals: Record<Tier, number>;
  unwaivedErrors: number;
  staleWaivers: string[];
  findings: Array<Finding & { waived?: string | undefined }>;
}

export function loadWaivers(path: string): Waiver[] {
  if (!fs.existsSync(path)) return [];
  const raw = JSON.parse(fs.readFileSync(path, 'utf8')) as Waiver[];
  for (const w of raw) {
    if (!w.key || !w.reason) throw new Error(`waiver missing key or reason: ${JSON.stringify(w)}`);
  }
  return raw;
}

export function buildLedger(findings: Finding[], waivers: Waiver[]): Ledger {
  const byKey = new Map(waivers.map(w => [w.key, w] as const));
  const used = new Set<string>();

  const annotated: Array<Finding & { waived?: string | undefined }> = findings.map(f => {
    const w = f.tier === 'error' ? byKey.get(findingKey(f)) : undefined;
    if (w) used.add(w.key);
    return w ? { ...f, waived: w.reason } : { ...f };
  });

  const totals: Record<Tier, number> = { error: 0, warn: 0, info: 0 };
  for (const f of annotated) totals[f.tier]++;

  return {
    generatedAt: new Date().toISOString(),
    totals,
    unwaivedErrors: annotated.filter(f => f.tier === 'error' && !f.waived).length,
    staleWaivers: waivers.map(w => w.key).filter(k => !used.has(k)),
    findings: annotated,
  };
}

const PRINT_CAPS: Record<Tier, number> = { error: 50, warn: 20, info: 0 };

export function printLedger(ledger: Ledger): void {
  const { totals } = ledger;
  console.log('Vocab consistency — cross-surface check (V1–V4)');
  console.log(
    `  errors: ${totals.error} (${ledger.unwaivedErrors} unwaived) · warns: ${totals.warn} · infos: ${totals.info}\n`
  );

  // Per-check × per-language matrix of error/warn counts.
  const cells = new Map<string, { error: number; warn: number; info: number }>();
  for (const f of ledger.findings) {
    const key = `${f.check}|${f.language}`;
    const cell = cells.get(key) ?? { error: 0, warn: 0, info: 0 };
    cell[f.tier]++;
    cells.set(key, cell);
  }
  const checks = [...new Set(ledger.findings.map(f => f.check))].sort();
  const langs = [...new Set(ledger.findings.map(f => f.language))].sort();
  if (checks.length > 0) {
    console.log(`  ${'lang'.padEnd(6)}${checks.map(c => c.padEnd(14)).join('')}`);
    for (const lang of langs) {
      const row = checks
        .map(c => {
          const cell = cells.get(`${c}|${lang}`);
          if (!cell) return '—'.padEnd(14);
          return `${cell.error}e/${cell.warn}w/${cell.info}i`.padEnd(14);
        })
        .join('');
      console.log(`  ${lang.padEnd(6)}${row}`);
    }
    console.log('');
  }

  for (const tier of ['error', 'warn'] as const) {
    const cap = PRINT_CAPS[tier];
    const list = ledger.findings.filter(f => f.tier === tier && !f.waived);
    if (list.length === 0) continue;
    console.log(
      `  ${tier.toUpperCase()}S${list.length > cap ? ` (first ${cap} of ${list.length} — full list via --json)` : ''}:`
    );
    for (const f of list.slice(0, cap)) {
      console.log(
        `    [${f.check}|${f.language}|${f.key}] ${f.message}${f.source ? ` (${f.source})` : ''}`
      );
    }
    console.log('');
  }

  const waived = ledger.findings.filter(f => f.waived);
  if (waived.length > 0) console.log(`  waived errors: ${waived.length}`);
  if (ledger.staleWaivers.length > 0) {
    console.log(
      `  STALE waivers (match no finding — remove them): ${ledger.staleWaivers.join(', ')}`
    );
  }
}
