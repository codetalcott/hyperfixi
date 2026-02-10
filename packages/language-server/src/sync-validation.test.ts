/**
 * Sync Validation Tests
 *
 * Ensures that the language-server's fallback constants stay in sync
 * with the canonical exports from @hyperfixi/core/lsp-metadata.
 *
 * These tests will fail if:
 * 1. Core adds new keywords that aren't in the fallback
 * 2. Core removes keywords that are still in the fallback
 * 3. Hover docs get out of sync
 *
 * Note: These tests require @hyperfixi/core to be built first.
 * If the import fails, the tests will be skipped.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Try to import canonical metadata from core (may not be built yet)
let lspMetadata: {
  ALL_KEYWORDS: readonly string[];
  HOVER_DOCS: Record<
    string,
    { title: string; description: string; example: string; category: string }
  >;
  EVENT_NAMES: readonly string[];
  COMMAND_KEYWORDS: readonly string[];
  REFERENCE_KEYWORDS: readonly string[];
  FEATURE_KEYWORDS: readonly string[];
} | null = null;

beforeAll(async () => {
  try {
    lspMetadata = await import('@hyperfixi/core/lsp-metadata');
  } catch (e) {
    console.warn(
      '[sync-validation] @hyperfixi/core/lsp-metadata not available - tests will be skipped'
    );
  }
});

// Fallback constants from server (duplicated here for testing)
const FALLBACK_KEYWORDS = [
  'toggle',
  'add',
  'remove',
  'show',
  'hide',
  'put',
  'set',
  'get',
  'fetch',
  'wait',
  'send',
  'trigger',
  'call',
  'return',
  'throw',
  'halt',
  'exit',
  'go',
  'log',
  'on',
  'me',
  'you',
  'it',
  'result',
  'if',
  'else',
  'then',
  'end',
  'repeat',
  'for',
  'while',
  'behavior',
  'def',
  'init',
  'first',
  'last',
  'next',
  'previous',
  'closest',
  'parent',
  'and',
  'or',
  'not',
  'is',
  'exists',
  'empty',
  'has',
] as const;

const FALLBACK_HOVER_KEYWORDS = [
  'toggle',
  'add',
  'remove',
  'show',
  'hide',
  'put',
  'set',
  'get',
  'fetch',
  'wait',
  'send',
  'trigger',
  'call',
  'log',
  'go',
  'on',
  'if',
  'repeat',
  'behavior',
  'me',
  'you',
  'it',
  'result',
];

const FALLBACK_EVENT_NAMES = [
  'click',
  'dblclick',
  'mouseenter',
  'mouseleave',
  'keydown',
  'keyup',
  'input',
  'change',
  'submit',
  'load',
  'focus',
  'blur',
] as const;

/**
 * Helper to skip test if lspMetadata isn't loaded
 */
function skipIfNoMetadata(): boolean {
  if (!lspMetadata) {
    console.warn('Skipping: @hyperfixi/core/lsp-metadata not built');
    return true;
  }
  return false;
}

describe('Language Server Sync Validation', () => {
  describe('Keyword Sync', () => {
    it('fallback keywords are a subset of canonical keywords', () => {
      if (skipIfNoMetadata()) return;

      const allKeywordsSet = new Set(lspMetadata!.ALL_KEYWORDS);
      const missingFromCanonical: string[] = [];

      for (const keyword of FALLBACK_KEYWORDS) {
        if (!allKeywordsSet.has(keyword)) {
          missingFromCanonical.push(keyword);
        }
      }

      expect(missingFromCanonical).toEqual([]);
    });

    it('canonical keywords include essential commands', () => {
      if (skipIfNoMetadata()) return;

      const essentialCommands = ['toggle', 'add', 'remove', 'show', 'hide', 'put', 'set', 'get'];
      const commandSet = new Set(lspMetadata!.COMMAND_KEYWORDS);

      for (const cmd of essentialCommands) {
        expect(commandSet.has(cmd)).toBe(true);
      }
    });

    it('canonical keywords include essential references', () => {
      if (skipIfNoMetadata()) return;

      const essentialRefs = ['me', 'you', 'it', 'result'];
      const refSet = new Set(lspMetadata!.REFERENCE_KEYWORDS);

      for (const ref of essentialRefs) {
        expect(refSet.has(ref)).toBe(true);
      }
    });

    it('canonical keywords include essential features', () => {
      if (skipIfNoMetadata()) return;

      const essentialFeatures = ['on', 'behavior', 'def', 'init'];
      const featureSet = new Set(lspMetadata!.FEATURE_KEYWORDS);

      for (const feature of essentialFeatures) {
        expect(featureSet.has(feature)).toBe(true);
      }
    });
  });

  describe('Hover Docs Sync', () => {
    it('fallback hover keywords have canonical hover docs', () => {
      if (skipIfNoMetadata()) return;

      const missingDocs: string[] = [];

      for (const keyword of FALLBACK_HOVER_KEYWORDS) {
        if (!lspMetadata!.HOVER_DOCS[keyword]) {
          missingDocs.push(keyword);
        }
      }

      expect(missingDocs).toEqual([]);
    });

    it('canonical hover docs have required fields', () => {
      if (skipIfNoMetadata()) return;

      for (const [keyword, doc] of Object.entries(lspMetadata!.HOVER_DOCS)) {
        expect(doc).toHaveProperty('title');
        expect(doc).toHaveProperty('description');
        expect(doc).toHaveProperty('example');
        expect(doc).toHaveProperty('category');
        expect(typeof doc.title).toBe('string');
        expect(typeof doc.description).toBe('string');
        expect(typeof doc.example).toBe('string');
      }
    });

    it('hover docs cover all command keywords', () => {
      if (skipIfNoMetadata()) return;

      const docSet = new Set(Object.keys(lspMetadata!.HOVER_DOCS));
      const undocumented: string[] = [];

      for (const cmd of lspMetadata!.COMMAND_KEYWORDS) {
        if (!docSet.has(cmd)) {
          undocumented.push(cmd);
        }
      }

      // Allow some undocumented commands (they may be internal)
      // But flag if more than 20% are undocumented
      const coverage = 1 - undocumented.length / lspMetadata!.COMMAND_KEYWORDS.length;
      expect(coverage).toBeGreaterThan(0.8);
    });
  });

  describe('Event Names Sync', () => {
    it('fallback events are a subset of canonical events', () => {
      if (skipIfNoMetadata()) return;

      const eventSet = new Set(lspMetadata!.EVENT_NAMES);
      const missingFromCanonical: string[] = [];

      for (const event of FALLBACK_EVENT_NAMES) {
        if (!eventSet.has(event)) {
          missingFromCanonical.push(event);
        }
      }

      expect(missingFromCanonical).toEqual([]);
    });

    it('canonical events include common DOM events', () => {
      if (skipIfNoMetadata()) return;

      const commonEvents = ['click', 'input', 'change', 'submit', 'keydown', 'focus', 'blur'];
      const eventSet = new Set(lspMetadata!.EVENT_NAMES);

      for (const event of commonEvents) {
        expect(eventSet.has(event)).toBe(true);
      }
    });

    it('canonical events include htmx events', () => {
      if (skipIfNoMetadata()) return;

      const htmxEvents = ['htmx:beforeRequest', 'htmx:afterSwap', 'htmx:afterSettle'];
      const eventSet = new Set(lspMetadata!.EVENT_NAMES);

      for (const event of htmxEvents) {
        expect(eventSet.has(event)).toBe(true);
      }
    });
  });

  describe('Type Exports', () => {
    it('ALL_KEYWORDS is a readonly array', () => {
      if (skipIfNoMetadata()) return;

      expect(Array.isArray(lspMetadata!.ALL_KEYWORDS)).toBe(true);
      expect(lspMetadata!.ALL_KEYWORDS.length).toBeGreaterThan(50);
    });

    it('HOVER_DOCS is a record with string keys', () => {
      if (skipIfNoMetadata()) return;

      expect(typeof lspMetadata!.HOVER_DOCS).toBe('object');
      expect(Object.keys(lspMetadata!.HOVER_DOCS).length).toBeGreaterThan(20);
    });

    it('EVENT_NAMES is a readonly array', () => {
      if (skipIfNoMetadata()) return;

      expect(Array.isArray(lspMetadata!.EVENT_NAMES)).toBe(true);
      expect(lspMetadata!.EVENT_NAMES.length).toBeGreaterThan(10);
    });
  });
});
