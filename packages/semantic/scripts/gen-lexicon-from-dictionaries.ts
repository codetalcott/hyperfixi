#!/usr/bin/env npx tsx
/**
 * One-shot: populate each profile's `lexicon` block from the vocabulary that
 * already exists in @lokascript/i18n's dictionaries.
 *
 * WHY THIS EXISTS
 * ---------------
 * The renderer emits value interiors (`true`, `value`, `seconds`) in English
 * because the profile has never carried that vocabulary — only command verbs
 * (`keywords`) and role particles (`roleMarkers`). The words themselves have
 * been curated for years in the i18n dictionaries. This script moves them onto
 * the profile so the render side can reach them; nothing is deleted, and the
 * i18n dictionaries keep working exactly as before.
 *
 * It is deliberately a ONE-SHOT, not a build step: once the block is on the
 * profile, the profile is the source of truth and the block is hand-edited
 * like the rest of the file. Re-running it would overwrite hand edits, so it
 * refuses to touch a profile that already has a `lexicon`.
 *
 * Usage:
 *   npx tsx scripts/gen-lexicon-from-dictionaries.ts [--dry-run] [--language=es]
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = path.join(__dirname, '../src/generators/profiles');
const REPO_ROOT = path.join(__dirname, '../../..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyLang = args.find(a => a.startsWith('--language='))?.split('=')[1];

/** The six Dictionary categories that have no home on the profile today. */
const CATEGORIES = ['events', 'logical', 'temporal', 'values', 'attributes', 'expressions'] as const;

/**
 * Profile FILE basename → ISO code. The profiles directory mixes english-word
 * filenames with ISO ones (`spanish.ts` but `he.ts`), which is why this map is
 * needed at all; `sync-keywords.ts` in the vite plugin carries the same map.
 */
const FILE_TO_CODE: Record<string, string> = {
  arabic: 'ar', bengali: 'bn', chinese: 'zh', english: 'en', french: 'fr',
  german: 'de', he: 'he', hindi: 'hi', indonesian: 'id', italian: 'it',
  japanese: 'ja', korean: 'ko', ms: 'ms', polish: 'pl', portuguese: 'pt',
  quechua: 'qu', russian: 'ru', spanish: 'es', swahili: 'sw', thai: 'th',
  tl: 'tl', turkish: 'tr', ukrainian: 'uk', vietnamese: 'vi',
};

const SKIP = new Set(['index', 'types', 'marker-templates']);

function quote(s: string): string {
  return s.includes("'") ? JSON.stringify(s) : `'${s}'`;
}

/** Render one category as TS source. English keys are quoted only when needed. */
function renderCategory(name: string, entries: Record<string, string>): string[] {
  const keys = Object.keys(entries).sort();
  if (!keys.length) return [];
  const out = [`    ${name}: {`];
  for (const k of keys) {
    const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : quote(k);
    out.push(`      ${key}: { primary: ${quote(entries[k])} },`);
  }
  out.push('    },');
  return out;
}

async function main() {
  // Import the dictionaries from the built i18n dist (the same surface the
  // Prism generator and gen-htmx-vocab read).
  const { dictionaries } = await import('@lokascript/i18n');

  let touched = 0;
  const summary: string[] = [];

  for (const file of fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.ts'))) {
    const base = file.replace(/\.ts$/, '');
    if (SKIP.has(base)) continue;
    const code = FILE_TO_CODE[base];
    if (!code) {
      console.warn(`  ! no ISO code mapped for profiles/${file} — skipped`);
      continue;
    }
    if (onlyLang && code !== onlyLang) continue;

    const dict = (dictionaries as Record<string, Record<string, Record<string, string>>>)[code];
    if (!dict) {
      console.warn(`  ! no i18n dictionary for '${code}' — skipped`);
      continue;
    }

    const filePath = path.join(PROFILES_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    if (/^\s*lexicon:\s*\{/m.test(content)) {
      summary.push(`  = ${code.padEnd(3)} already has a lexicon — left alone`);
      continue;
    }

    const lines: string[] = ['  lexicon: {'];
    let count = 0;
    for (const cat of CATEGORIES) {
      const entries = dict[cat] ?? {};
      // For English the dictionary is an identity map; carrying it adds bytes
      // and no information, but it IS the reference the lint compares against,
      // so keep it.
      const rendered = renderCategory(cat, entries);
      if (rendered.length) {
        lines.push(...rendered);
        count += Object.keys(entries).length;
      }
    }
    lines.push('  },');
    if (count === 0) {
      summary.push(`  - ${code.padEnd(3)} dictionary has no lexicon categories — skipped`);
      continue;
    }

    // Insert before the final `};` that closes the profile object literal.
    const closeIdx = content.lastIndexOf('\n};');
    if (closeIdx === -1) {
      console.warn(`  ! could not find the profile object close in ${file} — skipped`);
      continue;
    }
    content = content.slice(0, closeIdx) + '\n' + lines.join('\n') + content.slice(closeIdx);

    if (!dryRun) fs.writeFileSync(filePath, content);
    touched++;
    summary.push(`  + ${code.padEnd(3)} ${String(count).padStart(3)} entries → profiles/${file}`);
  }

  console.log(`\n${dryRun ? '[dry-run] ' : ''}lexicon population\n`);
  summary.forEach(l => console.log(l));
  console.log(`\n${touched} profile(s) ${dryRun ? 'would be' : ''} updated.`);

  if (!dryRun && touched) {
    // The pre-commit hook runs prettier; format now so the diff is the content,
    // not the formatting (the generated-artifact idempotency lesson).
    console.log('\nFormatting with the pinned prettier…');
    execFileSync('npx', ['prettier', '--write', 'src/generators/profiles/*.ts'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
