/**
 * The workspace index (files that are not open), alone and through the
 * built server: a behavior defined in one file and installed from another.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { buildSymbolTable } from './symbol-table.js';
import { createWorkspaceIndex } from './workspace-index.js';
import { LSPTestClient } from './lsp-test-client.js';

const BEHAVIORS = [
  '<script type="text/hyperscript">', // 0
  'behavior Removable(removeButton)', // 1
  '  on click from removeButton remove me end', // 2
  'end', // 3
  'def greet(name) return name end', // 4
  '</script>', // 5
].join('\n');

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), 'ls-workspace-'));
  mkdirSync(join(root, 'templates'));
  mkdirSync(join(root, 'node_modules', 'pkg'), { recursive: true });
  writeFileSync(join(root, 'templates', 'behaviors.html'), BEHAVIORS);
  writeFileSync(join(root, 'templates', 'other.html'), '<b _="install Removable">x</b>');
  writeFileSync(
    join(root, 'node_modules', 'pkg', 'x.html'),
    '<script type="text/hyperscript">behavior Vendored end</script>'
  );
  writeFileSync(join(root, 'notes.txt'), 'behavior NotIndexed');
  return root;
}
const uriOf = (...parts: string[]) => pathToFileURL(join(...parts)).href;

describe('createWorkspaceIndex', () => {
  const root = workspace();
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  const build = (_uri: string, text: string) =>
    buildSymbolTable([
      { code: text, startLine: 0, startChar: 0, endLine: 0, endChar: 0, type: 'script' },
    ]);
  /** The behaviors the tables DEFINE (an install site alone is a usage). */
  const names = (tables: Array<{ table: ReturnType<typeof build> }>) =>
    tables
      .flatMap(t => [...t.table.symbols.values()])
      .filter(e => e.kind === 'behavior' && e.definitions.length > 0)
      .map(e => e.name)
      .sort();

  it('reads the hyperscript-bearing files, not node_modules or other types', () => {
    const index = createWorkspaceIndex({
      roots: [uriOf(root)],
      build,
      isOpen: () => false,
      log: () => {},
    });
    const tables = index.tables();
    expect(tables.map(t => t.uri).sort()).toEqual([
      uriOf(root, 'templates', 'behaviors.html'),
      uriOf(root, 'templates', 'other.html'),
    ]);
    expect(names(tables)).toEqual(['Removable']);
  });

  it('leaves an open document to the editor', () => {
    const open = uriOf(root, 'templates', 'behaviors.html');
    const index = createWorkspaceIndex({
      roots: [uriOf(root)],
      build,
      isOpen: uri => uri === open,
      log: () => {},
    });
    expect(index.tables().map(t => t.uri)).toEqual([uriOf(root, 'templates', 'other.html')]);
  });

  it('re-reads a file that changed, and sees a new one once the listing is old', () => {
    let clock = 0;
    let builds = 0;
    const index = createWorkspaceIndex({
      roots: [uriOf(root)],
      build: (uri, text) => (builds++, build(uri, text)),
      isOpen: () => false,
      log: () => {},
      now: () => clock,
    });
    index.tables();
    index.tables();
    expect(builds).toBe(2);

    const changed = join(root, 'templates', 'other.html');
    writeFileSync(
      changed,
      '<b _="install Removable">x</b><script type="text/hyperscript">behavior Added end</script>'
    );
    utimesSync(changed, new Date(), new Date(Date.now() + 5000));
    writeFileSync(join(root, 'templates', 'new.hs'), 'behavior Fresh\nend');
    expect(names(index.tables())).toEqual(['Added', 'Removable']);
    expect(builds).toBe(3);

    clock = 5000;
    expect(names(index.tables())).toEqual(['Added', 'Fresh', 'Removable']);
  });

  it('has nothing without a file: workspace folder', () => {
    const index = createWorkspaceIndex({
      roots: ['untitled:x'],
      build,
      isOpen: () => false,
      log: () => {},
    });
    expect(index.tables()).toEqual([]);
  });
});

describe('across files, through the server', () => {
  const root = workspace();
  const client = new LSPTestClient();
  const pageUri = uriOf(root, 'page.html');
  const behaviorsUri = uriOf(root, 'templates', 'behaviors.html');
  const PAGE = [
    '<button _="install Removable(removeButton: #x)">A</button>', // 0
    `<button _="on click call greet('a')">B</button>`, // 1
    '<button _="install Elsewhere">C</button>', // 2
    '<button _="on click install ">D</button>', // 3
  ].join('\n');

  beforeAll(async () => {
    await client.start();
    await client.initialize({}, undefined, uriOf(root));
    await client.open(pageUri, PAGE, 'html');
  });
  afterAll(async () => {
    await client.stop();
    rmSync(root, { recursive: true, force: true });
  });

  const position = (line: number, needle: string) => ({
    line,
    character: PAGE.split('\n')[line]!.indexOf(needle) + 1,
  });

  it('goes to a behavior and a function defined in a file that is not open', async () => {
    const behavior = await client.sendRequest('textDocument/definition', {
      textDocument: { uri: pageUri },
      position: position(0, 'Removable'),
    });
    expect(behavior.result).toMatchObject({
      uri: behaviorsUri,
      range: { start: { line: 1, character: 9 } },
    });
    const fn = await client.sendRequest('textDocument/definition', {
      textDocument: { uri: pageUri },
      position: position(1, 'greet'),
    });
    expect(fn.result).toMatchObject({
      uri: behaviorsUri,
      range: { start: { line: 4, character: 4 } },
    });
  });

  it('finds references in every file, and renames them all', async () => {
    const references = await client.sendRequest('textDocument/references', {
      textDocument: { uri: pageUri },
      position: position(0, 'Removable'),
      context: { includeDeclaration: true },
    });
    const uris = (references.result as Array<{ uri: string }>).map(l => l.uri).sort();
    expect(uris).toEqual([pageUri, behaviorsUri, uriOf(root, 'templates', 'other.html')].sort());

    const rename = await client.sendRequest('textDocument/rename', {
      textDocument: { uri: pageUri },
      position: position(0, 'Removable'),
      newName: 'Dismissable',
    });
    const changes = (rename.result as { changes: Record<string, Array<{ newText: string }>> })
      .changes;
    expect(Object.keys(changes).sort()).toEqual(uris);
    expect(
      Object.values(changes)
        .flat()
        .every(e => e.newText === 'Dismissable')
    ).toBe(true);
  });

  it('does not link a name nothing defines across files', async () => {
    const references = await client.sendRequest('textDocument/references', {
      textDocument: { uri: pageUri },
      position: position(2, 'Elsewhere'),
      context: { includeDeclaration: true },
    });
    expect((references.result as Array<{ uri: string }>).map(l => l.uri)).toEqual([pageUri]);
  });

  it('answers workspace/symbol with the definitions', async () => {
    const response = await client.sendRequest('workspace/symbol', { query: 'remov' });
    const symbols = response.result as Array<{ name: string; location: { uri: string } }>;
    expect(symbols.map(s => [s.name, s.location.uri])).toEqual([['Removable', behaviorsUri]]);
  });

  it("offers the workspace's behaviors after install", async () => {
    const line = PAGE.split('\n')[3]!;
    const response = await client.sendRequest('textDocument/completion', {
      textDocument: { uri: pageUri },
      position: { line: 3, character: line.indexOf('">') },
    });
    const labels = (response.result as Array<{ label: string }>).map(i => i.label);
    expect(labels).toContain('Removable');
    expect(labels).not.toContain('Vendored');
  });
});

// Found in VS Code on this repo's examples: two pages each define
// `behavior Draggable`, and a rename in one rewrote the other.
describe('a name two files define', () => {
  const root = mkdtempSync(join(tmpdir(), 'ls-two-pages-'));
  const page = (extra = '') =>
    [
      '<script type="text/hyperscript">',
      'behavior Draggable',
      '  on click log 1',
      '  end',
      'end',
      '</script>',
      '<b _="install Draggable">x</b>',
      extra,
    ].join('\n');
  writeFileSync(join(root, 'one.html'), page());
  writeFileSync(join(root, 'two.html'), page());
  writeFileSync(join(root, 'user.html'), '<b _="install Draggable">x</b>');
  const client = new LSPTestClient();
  const oneUri = uriOf(root, 'one.html');
  const userUri = uriOf(root, 'user.html');

  beforeAll(async () => {
    await client.start();
    await client.initialize({}, undefined, uriOf(root));
    await client.open(oneUri, page(), 'html');
    await client.open(userUri, '<b _="install Draggable">x</b>', 'html');
  });
  afterAll(async () => {
    await client.stop();
    rmSync(root, { recursive: true, force: true });
  });

  it('is renamed in its own file only', async () => {
    const rename = await client.sendRequest('textDocument/rename', {
      textDocument: { uri: oneUri },
      position: { line: 1, character: 10 },
      newName: 'Movable',
    });
    const changes = (rename.result as { changes: Record<string, unknown[]> }).changes;
    expect(Object.keys(changes)).toEqual([oneUri]);
    expect(changes[oneUri]).toHaveLength(2);
  });

  it('is offered as candidates from a file that only uses it, and not linked', async () => {
    const at = { textDocument: { uri: userUri }, position: { line: 0, character: 16 } };
    const definition = await client.sendRequest('textDocument/definition', at);
    const uris = (definition.result as Array<{ uri: string }>).map(l => l.uri).sort();
    expect(uris).toEqual([oneUri, uriOf(root, 'two.html')].sort());
    const references = await client.sendRequest('textDocument/references', {
      ...at,
      context: { includeDeclaration: true },
    });
    expect((references.result as Array<{ uri: string }>).map(l => l.uri)).toEqual([userUri]);
  });
});
