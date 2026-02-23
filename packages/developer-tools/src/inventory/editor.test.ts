/**
 * Editor unit tests
 *
 * Tests the safe edit-and-save logic: byte-offset splicing,
 * mtime guards, content verification, and per-file mutex.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractSnippetsFromFile } from './extractor';
import { updateSnippetInFile, StaleFileError, ContentMismatchError } from './editor';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inventory-edit-test-'));
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

// ── Successful edits ───────────────────────────────────────────────

describe('updateSnippetInFile', () => {
  describe('successful edits', () => {
    it('replaces a snippet value and returns updated snippet', async () => {
      const content = '<button _="on click toggle .active">Go</button>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);
      const original = snippets[0];

      const updated = await updateSnippetInFile(original, 'on click add .clicked', tmpDir);

      expect(updated.value).toBe('on click add .clicked');
      expect(updated.attributeName).toBe('_');
      expect(updated.category).toBe('hyperscript');

      // Verify the file was actually changed
      const newContent = fs.readFileSync(fp, 'utf-8');
      expect(newContent).toContain('on click add .clicked');
      expect(newContent).not.toContain('toggle .active');
    });

    it('handles edits that make the value shorter', async () => {
      const content = '<button _="on click toggle .active on me">Go</button>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      const updated = await updateSnippetInFile(snippets[0], 'on click hide me', tmpDir);

      expect(updated.value).toBe('on click hide me');
      const newContent = fs.readFileSync(fp, 'utf-8');
      expect(newContent).toBe('<button _="on click hide me">Go</button>');
    });

    it('handles edits that make the value longer', async () => {
      const content = '<button _="on click hide me">Go</button>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      const updated = await updateSnippetInFile(
        snippets[0],
        'on click add .loading then wait 2s then remove .loading',
        tmpDir
      );

      expect(updated.value).toBe('on click add .loading then wait 2s then remove .loading');
    });

    it('preserves surrounding content when editing', async () => {
      const content = [
        '<div id="header">Header</div>',
        '<button _="on click toggle .a">Click</button>',
        '<div id="footer">Footer</div>',
      ].join('\n');
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      await updateSnippetInFile(snippets[0], 'on click toggle .b', tmpDir);

      const newContent = fs.readFileSync(fp, 'utf-8');
      expect(newContent).toContain('<div id="header">Header</div>');
      expect(newContent).toContain('<div id="footer">Footer</div>');
      expect(newContent).toContain('on click toggle .b');
    });

    it('updated snippet has correct byte offsets', async () => {
      const content = '<button _="on click toggle .a">Go</button>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      const newValue = 'on click add .x then remove .y';
      const updated = await updateSnippetInFile(snippets[0], newValue, tmpDir);

      // Verify the new byte offsets are correct
      const newContent = fs.readFileSync(fp, 'utf-8');
      const sliced = newContent.slice(updated.valueByteOffset, updated.valueByteEndOffset);
      expect(sliced).toBe(newValue);
    });

    it('edits the correct snippet when multiple exist', async () => {
      const content = [
        '<button _="on click toggle .first">One</button>',
        '<button _="on click toggle .second">Two</button>',
      ].join('\n');
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      // Edit the second snippet
      await updateSnippetInFile(snippets[1], 'on click add .replaced', tmpDir);

      const newContent = fs.readFileSync(fp, 'utf-8');
      expect(newContent).toContain('toggle .first'); // first unchanged
      expect(newContent).toContain('add .replaced'); // second changed
      expect(newContent).not.toContain('toggle .second');
    });
  });

  // ── Safety checks ────────────────────────────────────────────────

  describe('safety checks', () => {
    it('throws StaleFileError when file mtime has changed', async () => {
      const fp = writeTemp('test.html', '<button _="on click toggle .a">Go</button>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);
      const original = snippets[0];

      // Modify the file externally to change its mtime
      // Need to ensure mtime actually differs — use utimesSync to set a past time
      const pastTime = new Date(Date.now() - 10000);
      fs.utimesSync(fp, pastTime, pastTime);

      await expect(updateSnippetInFile(original, 'on click add .new', tmpDir)).rejects.toThrow(
        StaleFileError
      );
    });

    it('throws ContentMismatchError when content at offset has changed', async () => {
      const fp = writeTemp('test.html', '<button _="on click toggle .a">Go</button>');
      const snippets = extractSnippetsFromFile(fp, tmpDir);
      const original = snippets[0];

      // Tamper with the snippet object: pretend the value was different
      const tampered = { ...original, value: 'WRONG VALUE' };

      await expect(updateSnippetInFile(tampered, 'on click add .new', tmpDir)).rejects.toThrow(
        ContentMismatchError
      );
    });

    it('StaleFileError has correct name property', () => {
      const err = new StaleFileError('test');
      expect(err.name).toBe('StaleFileError');
      expect(err).toBeInstanceOf(Error);
    });

    it('ContentMismatchError has correct name property', () => {
      const err = new ContentMismatchError('test');
      expect(err.name).toBe('ContentMismatchError');
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ── Concurrent edit safety ───────────────────────────────────────

  describe('concurrent edit safety (per-file mutex)', () => {
    it('serializes concurrent edits to the same file', async () => {
      const content = [
        '<button _="on click toggle .a">One</button>',
        '<button _="on click toggle .b">Two</button>',
      ].join('\n');
      const fp = writeTemp('test.html', content);

      // Extract, edit first, re-extract, edit second
      const snippets1 = extractSnippetsFromFile(fp, tmpDir);

      // Launch first edit
      const edit1 = updateSnippetInFile(snippets1[0], 'on click add .first-edited', tmpDir);
      // Wait for it to complete before starting the second
      await edit1;

      // Re-extract to get fresh offsets
      const snippets2 = extractSnippetsFromFile(fp, tmpDir);
      const secondSnippet = snippets2.find(s => s.value.includes('toggle .b'));
      expect(secondSnippet).toBeDefined();

      await updateSnippetInFile(secondSnippet!, 'on click add .second-edited', tmpDir);

      const finalContent = fs.readFileSync(fp, 'utf-8');
      expect(finalContent).toContain('add .first-edited');
      expect(finalContent).toContain('add .second-edited');
    });
  });

  // ── Multiline edits ──────────────────────────────────────────────

  describe('multiline edits', () => {
    it('replaces a single-line value with multiline', async () => {
      const content = '<button _="on click toggle .a">Go</button>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      const newValue = 'on click\n  add .loading\n  then wait 1s\n  then remove .loading';
      const updated = await updateSnippetInFile(snippets[0], newValue, tmpDir);

      expect(updated.isMultiline).toBe(true);
      expect(updated.value).toBe(newValue);
    });

    it('replaces a multiline value with single-line', async () => {
      const content = '<button _="on click\n  toggle .a\n  then wait 1s">Go</button>';
      const fp = writeTemp('test.html', content);
      const snippets = extractSnippetsFromFile(fp, tmpDir);

      const updated = await updateSnippetInFile(snippets[0], 'on click toggle .a', tmpDir);

      expect(updated.isMultiline).toBe(false);
      expect(updated.value).toBe('on click toggle .a');
    });
  });
});
