/**
 * The domain gate's second pass: old input still reads.
 *
 * The domains' round trip (their scripts/gate-upstream.sh, which domain-gate.sh runs first) renders
 * each command with this tree's packages and reads it back with the same packages, so a change both
 * sides share moves nothing: semantic's ja patient marker を → お changed learn's Japanese
 * (`.activeを 追加` → `.active お 追加`) with 0 worse and 0 parses moved (measured 2026-10-20). A
 * user's input is fixed text, written against the release the domains lock. So `dump` renders every
 * gate command in every language with the domains' LOCKED framework, semantic and intent, and `read`
 * reads those sentences back with this tree's (under the domains' resolve hook) and requires the same
 * parse summary.
 *
 * Run from the domains' packages/domains, on their tsx and resolve hook (domain-gate.sh does):
 *
 *   node --import tsx --import ./gate/upstream.mjs <this> dump <sentences.json>
 *   GATE_UPSTREAM_ROOT=<root> node --import tsx --import ./gate/upstream.mjs \
 *     <this> read <sentences.json> <accepted.json>
 *
 * `read` fails on a sentence that reads differently or no longer reads, unless the accepted list
 * (scripts/domain-gate-accepted.json) has it with what it reads now and why; and on a listed sentence
 * that reads as before or is no longer rendered, so the list only shrinks. A sentence the locked
 * packages refused and this tree reads is reported, not failed: it was no one's working input.
 */
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [mode, sentencesPath, acceptedPath] = process.argv.slice(2);
const upstreamRoot = process.env.GATE_UPSTREAM_ROOT;

/** Whether `@lokascript/*` resolves to this tree's packages: GATE_UPSTREAM_ROOT set, the hook on. */
function hooked() {
  try {
    return import.meta
      .resolve('@lokascript/framework')
      .startsWith(pathToFileURL(realpathSync(upstreamRoot)).href);
  } catch {
    return false;
  }
}

if (mode === 'dump' && upstreamRoot) {
  console.error("dump renders with the domains' locked packages: unset GATE_UPSTREAM_ROOT");
  process.exit(2);
}
// Without the hook both passes would read with the lockfile's packages, and agree on everything.
if (mode === 'read' && !hooked()) {
  console.error(
    "read needs this tree's packages: GATE_UPSTREAM_ROOT and --import ./gate/upstream.mjs"
  );
  process.exit(2);
}
if (mode !== 'dump' && mode !== 'read') {
  console.error(
    'usage: domain-gate-read-back.mjs dump <sentences.json> | read <sentences.json> <accepted.json>'
  );
  process.exit(2);
}

// The domains' gate API (`DOMAINS`, `loadDomain`, `commandsFor`, and the kit's `summarize`), from the
// checkout this runs in: its framework, semantic and intent are the lockfile's, or under the resolve
// hook this tree's.
const gate = await import(pathToFileURL(resolve('gate/round-trip.ts')).href);

/** The framework, semantic and intent this pass runs on. */
async function versions() {
  return Object.entries(await gate.upstreamVersions())
    .map(([name, version]) => `${name}@${version}`)
    .join(', ');
}

/** What the domain's parser reads `text` as: the kit's one-line summary, or `refused`. */
function readOf(dsl, text, lang) {
  try {
    return gate.summarize(dsl.parse(text, lang));
  } catch {
    return 'refused';
  }
}

if (mode === 'dump') {
  const sentences = [];
  for (const domain of gate.DOMAINS) {
    const { dsl, schemas } = await gate.loadDomain(domain);
    for (const source of gate.commandsFor(domain, schemas)) {
      const ref = dsl.parse(source, 'en');
      for (const lang of dsl.getSupportedLanguages()) {
        const text = dsl.render?.(ref, lang);
        if (text) sentences.push({ domain, source, lang, text, read: readOf(dsl, text, lang) });
      }
    }
  }
  writeFileSync(sentencesPath, JSON.stringify(sentences));
  console.log(
    `Rendered ${sentences.length} sentences on ${await versions()} (the domains' lockfile)`
  );
} else {
  const sentences = JSON.parse(readFileSync(sentencesPath, 'utf8'));
  const accepted = JSON.parse(readFileSync(acceptedPath, 'utf8'));
  const key = s => `${s.domain}\u0000${s.lang}\u0000${s.source}`;
  const listed = new Map(accepted.map(a => [key(a), a]));
  const rendered = new Map(sentences.map(s => [key(s), s]));

  const failing = [];
  const nowRead = [];
  const unfit = [];
  let acceptedCount = 0;
  for (const a of accepted) {
    if (!a.reason?.trim()) unfit.push({ ...a, problem: 'has no reason' });
    else if (rendered.get(key(a))?.text !== a.text)
      unfit.push({ ...a, problem: 'is not a sentence the domains render at DOMAINS_REF' });
  }

  for (const domain of gate.DOMAINS) {
    const { dsl } = await gate.loadDomain(domain);
    const mine = sentences.filter(s => s.domain === domain);
    let differ = 0;
    for (const s of mine) {
      const now = readOf(dsl, s.text, s.lang);
      const entry = listed.get(key(s));
      if (now === s.read) {
        if (entry?.text === s.text) unfit.push({ ...entry, problem: 'reads as before' });
        continue;
      }
      differ++;
      if (entry?.text === s.text && entry.now === now) acceptedCount++;
      else if (s.read === 'refused') nowRead.push({ ...s, now });
      else
        failing.push({
          domain,
          lang: s.lang,
          source: s.source,
          text: s.text,
          was: s.read,
          now,
          reason: '',
        });
    }
    console.log(
      `${domain.padEnd(13)} read back ${mine.length - differ}/${mine.length} as before` +
        (differ ? ` (${differ} differ)` : '')
    );
  }

  for (const s of nowRead)
    console.log(
      `  now reads (was refused) ${s.domain} ${s.lang} ${s.source}: ${s.text} → ${s.now}`
    );
  if (failing.length) {
    console.log(
      `\nRead differently. Fix, or accept a deliberate change by adding each line to ` +
        `scripts/domain-gate-accepted.json with a reason:`
    );
    for (const f of failing) console.log(`  ${JSON.stringify(f)}`);
  }
  for (const s of unfit)
    console.log(`  ACCEPTED ENTRY ${s.problem}: ${s.domain} ${s.lang} ${s.source}`);

  console.log(
    `\nRead back on ${await versions()} (this tree): ${failing.length} read differently, ` +
      `${acceptedCount} accepted, ${nowRead.length} now read, ${unfit.length} entries to prune or fix`
  );
  process.exit(failing.length || unfit.length ? 1 : 0);
}
