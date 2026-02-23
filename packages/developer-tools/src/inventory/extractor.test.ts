/**
 * Extractor unit tests
 *
 * Tests the core snippet extraction logic using real temp files.
 * Verifies byte offsets, category classification, command/event detection,
 * line/column numbers, and element type detection.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractSnippetsFromFile } from './extractor';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Write a temp file and return its absolute path */
function writeTemp(name: string, content: string): string {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// ── Hyperscript extraction ─────────────────────────────────────────

describe('extractSnippetsFromFile', () => {
  describe('hyperscript (_=) extraction', () => {
    it('extracts a simple hyperscript attribute', () => {
      const fp = writeTemp('test.html', '<button _="on click toggle .active">Click</button>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets).toHaveLength(1);
      expect(snippets[0].attributeName).toBe('_');
      expect(snippets[0].value).toBe('on click toggle .active');
      expect(snippets[0].category).toBe('hyperscript');
    });

    it('detects commands in hyperscript', () => {
      const fp = writeTemp(
        'test.html',
        '<div _="on click add .a then remove .b then toggle .c">x</div>'
      );
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].commands).toContain('add');
      expect(snippets[0].commands).toContain('remove');
      expect(snippets[0].commands).toContain('toggle');
    });

    it('detects events in hyperscript', () => {
      const fp = writeTemp('test.html', '<div _="on click on mouseenter add .hover">x</div>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].events).toContain('click');
      expect(snippets[0].events).toContain('mouseenter');
    });

    it('detects multiline values', () => {
      const fp = writeTemp(
        'test.html',
        '<button _="on click\n  add .active to me\n  then wait 500ms">Go</button>'
      );
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].isMultiline).toBe(true);
      expect(snippets[0].value).toContain('\n');
      expect(snippets[0].commands).toContain('add');
      expect(snippets[0].commands).toContain('wait');
    });

    it('handles single-quoted attributes', () => {
      const fp = writeTemp('test.html', "<button _='on click toggle .active'>Go</button>");
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets).toHaveLength(1);
      expect(snippets[0].value).toBe('on click toggle .active');
      expect(snippets[0].quoteChar).toBe("'");
    });

    it('extracts hx-on:* as hyperscript', () => {
      const fp = writeTemp('test.html', '<button hx-on:click="toggle .active on me">Go</button>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets).toHaveLength(1);
      expect(snippets[0].attributeName).toBe('hx-on:click');
      expect(snippets[0].category).toBe('hyperscript');
    });
  });

  // ── htmx extraction ──────────────────────────────────────────────

  describe('htmx attribute extraction', () => {
    it('extracts hx-get as htmx-request', () => {
      const fp = writeTemp('test.html', '<button hx-get="/api/data">Load</button>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets).toHaveLength(1);
      expect(snippets[0].attributeName).toBe('hx-get');
      expect(snippets[0].value).toBe('/api/data');
      expect(snippets[0].category).toBe('htmx-request');
    });

    it('extracts all htmx request methods', () => {
      const fp = writeTemp(
        'test.html',
        [
          '<a hx-get="/a">get</a>',
          '<form hx-post="/b">post</form>',
          '<div hx-put="/c">put</div>',
          '<div hx-patch="/d">patch</div>',
          '<button hx-delete="/e">delete</button>',
        ].join('\n')
      );
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      const categories = snippets.map(s => s.category);
      expect(categories.every(c => c === 'htmx-request')).toBe(true);
      expect(snippets).toHaveLength(5);
    });

    it('extracts hx-swap as htmx-swap', () => {
      const fp = writeTemp('test.html', '<div hx-swap="outerHTML">x</div>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].category).toBe('htmx-swap');
    });

    it('extracts hx-target as htmx-target', () => {
      const fp = writeTemp('test.html', '<button hx-target="#results">Go</button>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].category).toBe('htmx-target');
    });

    it('extracts hx-trigger as htmx-trigger', () => {
      const fp = writeTemp('test.html', '<input hx-trigger="keyup changed delay:500ms">');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].category).toBe('htmx-trigger');
    });

    it('extracts other hx-* attrs as htmx-other', () => {
      const fp = writeTemp('test.html', '<div hx-indicator="#spinner">x</div>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].category).toBe('htmx-other');
    });

    it('does not detect commands/events in htmx attributes', () => {
      const fp = writeTemp('test.html', '<button hx-get="/api/toggle">Toggle</button>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      // htmx-request snippets should not have commands/events extracted
      expect(snippets[0].commands).toEqual([]);
      expect(snippets[0].events).toEqual([]);
    });
  });

  // ── fixi extraction ──────────────────────────────────────────────

  describe('fixi attribute extraction', () => {
    it('extracts fx-action as fixi', () => {
      const fp = writeTemp('test.html', '<button fx-action="/api/submit">Submit</button>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].category).toBe('fixi');
      expect(snippets[0].attributeName).toBe('fx-action');
    });

    it('extracts fx-swap as htmx-swap', () => {
      const fp = writeTemp('test.html', '<div fx-swap="innerHTML">x</div>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].category).toBe('htmx-swap');
    });

    it('extracts fx-target as htmx-target', () => {
      const fp = writeTemp('test.html', '<div fx-target="#panel">x</div>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].category).toBe('htmx-target');
    });
  });

  // ── Byte offset accuracy ─────────────────────────────────────────

  describe('byte offset accuracy', () => {
    it('byte offsets correctly delimit the value', () => {
      const content = '<button _="on click toggle .active">Go</button>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      const s = snippets[0];
      const sliced = content.slice(s.valueByteOffset, s.valueByteEndOffset);
      expect(sliced).toBe(s.value);
    });

    it('byte offsets are correct for single-quoted values', () => {
      const content = "<div _='on click add .x'>y</div>";
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      const s = snippets[0];
      const sliced = content.slice(s.valueByteOffset, s.valueByteEndOffset);
      expect(sliced).toBe(s.value);
    });

    it('byte offsets are correct for multiline values', () => {
      const content = '<div _="on click\n  add .a\n  then remove .b">x</div>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      const s = snippets[0];
      const sliced = content.slice(s.valueByteOffset, s.valueByteEndOffset);
      expect(sliced).toBe(s.value);
    });

    it('byte offsets are correct for multiple snippets', () => {
      const content = [
        '<button _="on click toggle .a">one</button>',
        '<div hx-get="/api">two</div>',
        '<span _="on load show me">three</span>',
      ].join('\n');
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      for (const s of snippets) {
        const sliced = content.slice(s.valueByteOffset, s.valueByteEndOffset);
        expect(sliced).toBe(s.value);
      }
    });

    it('byte offsets survive spaces around the equals sign', () => {
      const content = '<button _  =  "on click toggle .x">Go</button>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      const s = snippets[0];
      const sliced = content.slice(s.valueByteOffset, s.valueByteEndOffset);
      expect(sliced).toBe(s.value);
    });
  });

  // ── Line and column numbers ──────────────────────────────────────

  describe('line and column numbers', () => {
    it('reports correct line number (1-indexed)', () => {
      const content = '<html>\n<body>\n<button _="on click toggle .a">x</button>\n</body>\n</html>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].line).toBe(3);
    });

    it('reports correct column number (1-indexed)', () => {
      const content = '  <button _="on click toggle .a">x</button>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      // The attribute starts at the underscore, column 11 (2 spaces + '<button ')
      expect(snippets[0].column).toBe(11);
    });

    it('sorts snippets by line number', () => {
      const content = [
        '<span _="on load show me">a</span>',
        '<button hx-get="/api">b</button>',
        '<div _="on click hide me">c</div>',
      ].join('\n');
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      for (let i = 1; i < snippets.length; i++) {
        expect(snippets[i].line).toBeGreaterThanOrEqual(snippets[i - 1].line);
      }
    });
  });

  // ── Element type detection ───────────────────────────────────────

  describe('element type detection', () => {
    it('detects button elements', () => {
      const fp = writeTemp('test.html', '<button _="on click toggle .a">x</button>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].elementType).toBe('button');
    });

    it('detects input elements', () => {
      const fp = writeTemp('test.html', '<input hx-trigger="change" hx-get="/api">');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].elementType).toBe('input');
    });

    it('detects div elements', () => {
      const fp = writeTemp('test.html', '<div class="panel" _="on click hide me">x</div>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].elementType).toBe('div');
    });

    it('detects form elements', () => {
      const fp = writeTemp('test.html', '<form hx-post="/submit">x</form>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].elementType).toBe('form');
    });
  });

  // ── Mixed attributes ─────────────────────────────────────────────

  describe('mixed attributes on one element', () => {
    it('extracts all attributes from a single element', () => {
      const fp = writeTemp(
        'test.html',
        '<div hx-get="/api" hx-target="#out" hx-swap="innerHTML" _="on htmx:afterSettle add .loaded">x</div>'
      );
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets.length).toBe(4);

      const categories = new Set(snippets.map(s => s.category));
      expect(categories).toContain('htmx-request');
      expect(categories).toContain('htmx-target');
      expect(categories).toContain('htmx-swap');
      expect(categories).toContain('hyperscript');
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns empty array for a file with no attributes', () => {
      const fp = writeTemp('test.html', '<html><body><h1>Hello</h1></body></html>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets).toEqual([]);
    });

    it('returns empty array for an empty file', () => {
      const fp = writeTemp('test.html', '');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets).toEqual([]);
    });

    it('handles escaped quotes in values', () => {
      const fp = writeTemp(
        'test.html',
        '<button _="on click set my innerHTML to \'hello\'">Go</button>'
      );
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets).toHaveLength(1);
      expect(snippets[0].value).toContain("'hello'");
    });

    it('generates unique IDs per snippet', () => {
      const fp = writeTemp(
        'test.html',
        '<button _="on click toggle .a">a</button>\n<button _="on click toggle .b">b</button>'
      );
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets.length).toBe(2);
      expect(snippets[0].id).not.toBe(snippets[1].id);
    });

    it('sets relativePath correctly', () => {
      const subdir = path.join(tmpDir, 'subdir');
      fs.mkdirSync(subdir, { recursive: true });
      const realFp = path.join(subdir, 'test.html');
      fs.writeFileSync(realFp, '<button _="on click toggle .a">x</button>');

      const snippets = extractSnippetsFromFile(realFp, tmpDir);

      expect(snippets[0].relativePath).toBe(path.join('subdir', 'test.html'));
    });

    it('records fileMtime', () => {
      const fp = writeTemp('test.html', '<button _="on click toggle .a">x</button>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].fileMtime).toBeGreaterThan(0);
      expect(snippets[0].fileMtime).toBe(fs.statSync(fp).mtimeMs);
    });

    it('does not produce duplicate snippets for overlapping patterns', () => {
      // fx-swap matches both the fx-swap pattern and potentially htmx patterns
      const fp = writeTemp('test.html', '<div fx-swap="innerHTML" fx-target="#out">x</div>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      // Each attribute should appear exactly once
      const offsets = snippets.map(s => s.valueByteOffset);
      expect(new Set(offsets).size).toBe(offsets.length);
    });
  });

  // ── Command detection specifics ──────────────────────────────────

  describe('command detection', () => {
    it('detects fetch command', () => {
      const fp = writeTemp(
        'test.html',
        '<div _="on click fetch /api/data as json then put result into me">x</div>'
      );
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].commands).toContain('fetch');
      expect(snippets[0].commands).toContain('put');
    });

    it('detects transition and wait commands', () => {
      const fp = writeTemp(
        'test.html',
        '<div _="on click transition opacity to 0 then wait 300ms then remove me">x</div>'
      );
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      expect(snippets[0].commands).toContain('transition');
      expect(snippets[0].commands).toContain('wait');
      expect(snippets[0].commands).toContain('remove');
    });

    it('deduplicates repeated commands', () => {
      const fp = writeTemp('test.html', '<div _="on click add .a then add .b then add .c">x</div>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      // 'add' should appear once despite being used three times
      expect(snippets[0].commands.filter(c => c === 'add')).toHaveLength(1);
    });
  });
});
