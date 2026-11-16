/**
 * How good is a language server's completion at the next WORD of hyperscript?
 *
 *   npx tsx src/tools/completion-measure.ts [--json] [--limit N] [--server <cmd> <args…>]
 *
 * The corpus is the command-shape cases (testing-framework): scripts authors
 * wrote, harvested from upstream's own test suite and the reference examples.
 * Each source the engine parses is cut before every token the engine's parser
 * matched as a grammar word (`Parser.match`: `on`, `toggle`, `into`, `then`…,
 * not names, selectors or literals). At each cut the server is asked for
 * completions on a page holding the text before the cut, and scored twice:
 *
 * - recall: the list holds the word the author wrote next;
 * - precision: of the words the list offers, the share the engine reads as a
 *   grammar word at the cut (text + word is parsed; the word counts when the
 *   parser matched it there and did not stop at it).
 *
 * Neither number means anything alone: every keyword at every cut is recall
 * 1.0, and one sure word at every cut is precision 1.0.
 *
 * Limits. A word matched in a branch the parser later abandons counts as
 * accepted. Only the first word of an item is scored, and only items that are
 * a word (an offered `#id` or `.class` is neither right nor wrong here). The
 * page holds nothing after the cut. `--server` measures another LSP server
 * with the same requests; without it, this package's built `dist/server.js`.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import * as engine from '@hyperfixi/engine';
import { LSPTestClient } from '../lsp-test-client.js';

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const serverAt = argv.indexOf('--server');
const serverCommand = serverAt >= 0 ? argv.slice(serverAt + 1) : undefined;
const ownArgs = serverAt >= 0 ? argv.slice(0, serverAt) : argv;
const limitAt = ownArgs.indexOf('--limit');
const limit = limitAt >= 0 ? Number(ownArgs[limitAt + 1]) : Infinity;

const casesPath = fileURLToPath(
  new URL('../../../testing-framework/src/multilingual/command-shapes.cases.json', import.meta.url)
);
const corpus = JSON.parse(readFileSync(casesPath, 'utf8')) as {
  upstream: string;
  cases: Array<{ id: string; source: string; family: string }>;
};

engine.register(...engine.everything);

interface MatchedWord {
  value: string;
  start: number;
}
type MatchFn = (this: unknown, value: string, type?: string) => MatchedWord | undefined;

/** Parse `source`, recording each token the grammar matched as a word. */
function read(source: string): { words: MatchedWord[]; stoppedAt: number | null } | null {
  const proto = engine.Parser.prototype as unknown as { match: MatchFn };
  const original = proto.match;
  const words = new Map<number, MatchedWord>();
  proto.match = function (value, type) {
    const token = original.call(this, value, type);
    if (token && (type ?? 'IDENTIFIER') === 'IDENTIFIER') words.set(token.start, token);
    return token;
  };
  try {
    engine.parse(source);
    return { words: [...words.values()], stoppedAt: null };
  } catch (error) {
    const token = (error as { token?: { start: number } }).token;
    if (!token) return null;
    return { words: [...words.values()], stoppedAt: token.start };
  } finally {
    proto.match = original;
  }
}

/** Does the engine read `word` as a grammar word right after `before`? */
function accepts(before: string, word: string): boolean {
  const result = read(before + word);
  if (!result) return false;
  const matched = result.words.some(w => w.start === before.length && w.value === word);
  return matched && (result.stoppedAt === null || result.stoppedAt > before.length);
}

const WORD = /^[A-Za-z][\w-]*!?$/;
/** The word an item would put at the cursor, or null when it is not a word. */
function firstWord(item: { label: string; insertText?: string }): string | null {
  const text = (item.insertText ?? item.label).replace(/\$\{\d+:?([^}]*)\}|\$\d+/g, '$1');
  const word = text.trim().split(/\s+/)[0] ?? '';
  return WORD.test(word) ? word : null;
}

const OPEN = '<script type="text/hyperscript">\n';
const CLOSE = '\n</script>\n';
const uri = 'file:///measure/page.html';

async function main(): Promise<void> {
  const client = new LSPTestClient();
  await client.start({}, serverCommand);
  await client.initialize({
    textDocument: { completion: { completionItem: { snippetSupport: true } } },
  });
  client.sendNotification('textDocument/didOpen', {
    textDocument: { uri, languageId: 'html', version: 1, text: OPEN + CLOSE },
  });

  let version = 1;
  let sources = 0;
  let unparsed = 0;
  let cuts = 0;
  let hits = 0;
  let offered = 0;
  let accepted = 0;
  let listed = 0;
  const missed = new Map<string, number>();
  const asked = new Map<string, number>();
  const started = Date.now();

  for (const testCase of corpus.cases.slice(0, limit)) {
    const whole = read(testCase.source);
    if (!whole || whole.stoppedAt !== null) {
      unparsed++;
      continue;
    }
    sources++;
    for (const word of whole.words.sort((a, b) => a.start - b.start)) {
      const before = testCase.source.slice(0, word.start);
      const lines = (OPEN + before).split('\n');
      client.sendNotification('textDocument/didChange', {
        textDocument: { uri, version: ++version },
        contentChanges: [{ text: OPEN + before + CLOSE }],
      });
      const response = await client.sendRequest('textDocument/completion', {
        textDocument: { uri },
        position: { line: lines.length - 1, character: lines[lines.length - 1]!.length },
      });
      const result = response.result as
        | Array<{ label: string; insertText?: string }>
        | { items: Array<{ label: string; insertText?: string }> }
        | null
        | undefined;
      const items = Array.isArray(result) ? result : (result?.items ?? []);
      const words = new Set(items.map(firstWord).filter((w): w is string => w !== null));

      cuts++;
      listed += items.length;
      asked.set(word.value, (asked.get(word.value) ?? 0) + 1);
      if (words.has(word.value)) hits++;
      else missed.set(word.value, (missed.get(word.value) ?? 0) + 1);
      for (const candidate of words) {
        offered++;
        if (candidate === word.value || accepts(before, candidate)) accepted++;
      }
    }
  }
  await client.stop();

  const round = (n: number) => Math.round(n * 1000) / 1000;
  const summary = {
    server: serverCommand ? serverCommand.join(' ') : '@lokascript/language-server dist/server.js',
    corpus: `command-shape cases (upstream ${corpus.upstream})`,
    sources,
    unparsed,
    cuts,
    recall: round(hits / cuts),
    precision: offered ? round(accepted / offered) : null,
    meanListLength: round(listed / cuts),
    seconds: Math.round((Date.now() - started) / 1000),
    missedMost: [...missed.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, n]) => `${word} ${n}/${asked.get(word)}`),
  };
  if (flag('--json')) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`server          ${summary.server}`);
    console.log(`corpus          ${summary.corpus}: ${sources} sources, ${cuts} cuts`);
    console.log(`                (${unparsed} sources the engine does not parse as one script)`);
    console.log(`recall          ${summary.recall}`);
    console.log(`precision       ${summary.precision}`);
    console.log(`mean list       ${summary.meanListLength} items`);
    console.log(`missed most     ${summary.missedMost.join(', ')}`);
    console.log(`time            ${summary.seconds}s`);
  }
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
