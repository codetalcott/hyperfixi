/**
 * `dump` — one concept × language table over the loaded vocab model, so a
 * translation can be reviewed in a single view instead of five files.
 */

import type { VocabModel } from './types';

export type DumpTarget = 'keywords' | 'markers' | 'events';
export type DumpFormat = 'md' | 'tsv' | 'json';

interface Table {
  header: string[];
  rows: string[][];
}

function buildTable(model: VocabModel, target: DumpTarget, conceptFilter?: string): Table {
  const langs = model.languages.map(l => l.language);
  const header = [
    target === 'markers' ? 'role' : target === 'events' ? 'event' : 'concept',
    ...langs,
  ];

  const keys = new Set<string>();
  for (const lang of model.languages) {
    if (target === 'keywords') Object.keys(lang.keywords).forEach(k => keys.add(k));
    else if (target === 'markers') Object.keys(lang.roleMarkers).forEach(k => keys.add(k));
    else for (const english of Object.values(lang.eventTranslations ?? {})) keys.add(english);
  }

  const rows: string[][] = [];
  for (const key of [...keys].sort()) {
    if (conceptFilter && key !== conceptFilter) continue;
    const row = [key];
    for (const lang of model.languages) {
      if (target === 'keywords') {
        const e = lang.keywords[key];
        row.push(
          e ? e.primary + (e.alternatives?.length ? ` (${e.alternatives.join('|')})` : '') : ''
        );
      } else if (target === 'markers') {
        const e = lang.roleMarkers[key];
        row.push(
          e ? e.primary + (e.alternatives?.length ? ` (${e.alternatives.join('|')})` : '') : ''
        );
      } else {
        const natives = Object.entries(lang.eventTranslations ?? {})
          .filter(([, english]) => english === key)
          .map(([native]) => native);
        row.push(natives.join('|'));
      }
    }
    rows.push(row);
  }
  return { header, rows };
}

export function renderDump(
  model: VocabModel,
  target: DumpTarget,
  format: DumpFormat,
  conceptFilter?: string
): string {
  const { header, rows } = buildTable(model, target, conceptFilter);
  if (format === 'json') {
    return JSON.stringify(
      rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i]]))),
      null,
      2
    );
  }
  if (format === 'tsv') {
    return [header.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
  }
  const md = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map(r => `| ${r.map(c => c.replace(/\|/g, '\\|')).join(' | ')} |`),
  ];
  return md.join('\n');
}
