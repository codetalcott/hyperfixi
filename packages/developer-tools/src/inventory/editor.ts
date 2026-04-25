/**
 * Template Inventory — Safe Edit-and-Save
 *
 * Updates a snippet's attribute value in its source file using byte-offset
 * splicing. Includes mtime checks and content verification to prevent
 * data loss from concurrent edits.
 */

import * as fs from 'fs';
import { extractSnippetsFromFile } from './extractor';
import type { Snippet } from './types';

/** Per-file mutex to prevent concurrent edits */
const fileLocks = new Map<string, Promise<void>>();

/**
 * Acquire a per-file lock. Returns a release function.
 */
function acquireLock(filePath: string): Promise<() => void> {
  const existing = fileLocks.get(filePath) ?? Promise.resolve();

  let release: () => void;
  const lock = new Promise<void>(resolve => {
    release = resolve;
  });

  fileLocks.set(
    filePath,
    existing.then(() => lock)
  );

  return existing.then(() => release!);
}

/**
 * Update a snippet's value in its source file.
 *
 * Safety checks:
 * 1. File mtime must match what we recorded at scan time
 * 2. Content at the recorded byte offsets must match the expected value
 * 3. Per-file mutex prevents concurrent writes
 *
 * Returns the updated Snippet (with new byte offsets from re-scanning).
 *
 * @throws {StaleFileError} if the file has been modified since scanning
 * @throws {ContentMismatchError} if the content at the offset doesn't match
 */
export async function updateSnippetInFile(
  snippet: Snippet,
  newValue: string,
  projectRoot: string
): Promise<Snippet> {
  const release = await acquireLock(snippet.filePath);

  try {
    // 1. Check mtime
    const stat = fs.statSync(snippet.filePath);
    if (stat.mtimeMs !== snippet.fileMtime) {
      throw new StaleFileError(`File has been modified since last scan: ${snippet.relativePath}`);
    }

    // 2. Read file and verify content at offsets
    const content = fs.readFileSync(snippet.filePath, 'utf-8');
    const currentValue = content.slice(snippet.valueByteOffset, snippet.valueByteEndOffset);

    if (currentValue !== snippet.value) {
      throw new ContentMismatchError(
        `Content at byte offset ${snippet.valueByteOffset} doesn't match expected value`
      );
    }

    // 3. Splice in the new value
    const newContent =
      content.slice(0, snippet.valueByteOffset) +
      newValue +
      content.slice(snippet.valueByteEndOffset);

    // 4. Write the file
    fs.writeFileSync(snippet.filePath, newContent, 'utf-8');

    // 5. Re-scan this file to get updated offsets
    const updatedSnippets = extractSnippetsFromFile(snippet.filePath, projectRoot);

    // 6. Find the updated snippet (match by proximity to original line + attribute name)
    const updated = findUpdatedSnippet(updatedSnippets, snippet, newValue);

    if (!updated) {
      throw new Error(`Could not locate updated snippet after edit in ${snippet.relativePath}`);
    }

    return updated;
  } finally {
    release();
  }
}

/**
 * Find the snippet that corresponds to our edit in the re-scanned results.
 * Match by: same attribute name, same line (or close), and the new value.
 */
function findUpdatedSnippet(
  snippets: Snippet[],
  original: Snippet,
  newValue: string
): Snippet | undefined {
  // Exact match: same attr name + new value
  const exactMatches = snippets.filter(
    s => s.attributeName === original.attributeName && s.value === newValue
  );

  if (exactMatches.length === 1) return exactMatches[0];

  // Multiple matches: pick the one closest to the original line
  if (exactMatches.length > 1) {
    exactMatches.sort(
      (a, b) => Math.abs(a.line - original.line) - Math.abs(b.line - original.line)
    );
    return exactMatches[0];
  }

  // Fallback: closest snippet with same attribute name (edit may have changed
  // the value in a way that doesn't exactly match due to whitespace normalization)
  const sameName = snippets.filter(s => s.attributeName === original.attributeName);
  sameName.sort((a, b) => Math.abs(a.line - original.line) - Math.abs(b.line - original.line));
  return sameName[0];
}

/** Thrown when the file's mtime has changed since the last scan */
export class StaleFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaleFileError';
  }
}

/** Thrown when the content at the expected byte offset doesn't match */
export class ContentMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentMismatchError';
  }
}
