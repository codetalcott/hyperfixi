import { describe, it, expect, beforeEach } from 'vitest';
import { Aggregator } from './aggregator';

describe('Aggregator', () => {
  let aggregator: Aggregator;

  beforeEach(() => {
    aggregator = new Aggregator();
  });

  describe('add()', () => {
    it('adds file usage', () => {
      const changed = aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      expect(changed).toBe(true);
      expect(aggregator.getUsage().commands.has('toggle')).toBe(true);
    });

    it('aggregates commands from multiple files', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });
      aggregator.add('b.html', {
        commands: new Set(['show', 'hide']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      const usage = aggregator.getUsage();
      expect(usage.commands.has('toggle')).toBe(true);
      expect(usage.commands.has('show')).toBe(true);
      expect(usage.commands.has('hide')).toBe(true);
      expect(usage.commands.size).toBe(3);
    });

    it('aggregates blocks from multiple files', () => {
      aggregator.add('a.html', {
        commands: new Set(),
        blocks: new Set(['if']),
        positional: false,
        detectedLanguages: new Set(),
      });
      aggregator.add('b.html', {
        commands: new Set(),
        blocks: new Set(['for', 'fetch']),
        positional: false,
        detectedLanguages: new Set(),
      });

      const usage = aggregator.getUsage();
      expect(usage.blocks.has('if')).toBe(true);
      expect(usage.blocks.has('for')).toBe(true);
      expect(usage.blocks.has('fetch')).toBe(true);
    });

    it('deduplicates commands across files', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });
      aggregator.add('b.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      expect(aggregator.getUsage().commands.size).toBe(1);
    });

    it('returns false when no change', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      const changed = aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      expect(changed).toBe(false);
    });

    it('returns true when commands change', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      const changed = aggregator.add('a.html', {
        commands: new Set(['toggle', 'show']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      expect(changed).toBe(true);
    });

    it('returns true when blocks change', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      const changed = aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(['if']),
        positional: false,
        detectedLanguages: new Set(),
      });

      expect(changed).toBe(true);
    });

    it('returns true when positional changes', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      const changed = aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: true,
        detectedLanguages: new Set(),
      });

      expect(changed).toBe(true);
    });

    it('returns true when languages change', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      const changed = aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(['ja']),
      });

      expect(changed).toBe(true);
    });
  });

  describe('positional tracking', () => {
    it('tracks positional as OR across files', () => {
      aggregator.add('a.html', {
        commands: new Set(),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });
      aggregator.add('b.html', {
        commands: new Set(),
        blocks: new Set(),
        positional: true,
        detectedLanguages: new Set(),
      });

      expect(aggregator.getUsage().positional).toBe(true);
    });

    it('positional is false when no file uses it', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });
      aggregator.add('b.html', {
        commands: new Set(['show']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      expect(aggregator.getUsage().positional).toBe(false);
    });
  });

  describe('language aggregation', () => {
    it('aggregates languages from multiple files', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(['ja']),
      });
      aggregator.add('b.html', {
        commands: new Set(['show']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(['es', 'ko']),
      });

      const usage = aggregator.getUsage();
      expect(usage.detectedLanguages.has('ja')).toBe(true);
      expect(usage.detectedLanguages.has('es')).toBe(true);
      expect(usage.detectedLanguages.has('ko')).toBe(true);
      expect(usage.detectedLanguages.size).toBe(3);
    });

    it('deduplicates languages across files', () => {
      aggregator.add('a.html', {
        commands: new Set(),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(['ja']),
      });
      aggregator.add('b.html', {
        commands: new Set(),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(['ja']),
      });

      expect(aggregator.getUsage().detectedLanguages.size).toBe(1);
    });
  });

  describe('remove()', () => {
    it('removes file contribution', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });
      aggregator.add('b.html', {
        commands: new Set(['show']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      aggregator.remove('a.html');

      const usage = aggregator.getUsage();
      expect(usage.commands.has('toggle')).toBe(false);
      expect(usage.commands.has('show')).toBe(true);
    });

    it('returns true when file existed', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      expect(aggregator.remove('a.html')).toBe(true);
    });

    it('returns false when file did not exist', () => {
      expect(aggregator.remove('nonexistent.html')).toBe(false);
    });

    it('updates positional when removing file with positional', () => {
      aggregator.add('a.html', {
        commands: new Set(),
        blocks: new Set(),
        positional: true,
        detectedLanguages: new Set(),
      });
      aggregator.add('b.html', {
        commands: new Set(),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      aggregator.remove('a.html');

      expect(aggregator.getUsage().positional).toBe(false);
    });

    it('updates languages when removing file', () => {
      aggregator.add('a.html', {
        commands: new Set(),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(['ja']),
      });
      aggregator.add('b.html', {
        commands: new Set(),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(['es']),
      });

      aggregator.remove('a.html');

      const usage = aggregator.getUsage();
      expect(usage.detectedLanguages.has('ja')).toBe(false);
      expect(usage.detectedLanguages.has('es')).toBe(true);
    });
  });

  describe('loadFromScan()', () => {
    it('loads scanned files', () => {
      const scanned = new Map([
        [
          'a.html',
          {
            commands: new Set(['toggle']),
            blocks: new Set<string>(),
            positional: false,
            detectedLanguages: new Set<string>(),
          },
        ],
        [
          'b.html',
          {
            commands: new Set(['show']),
            blocks: new Set(['if']),
            positional: true,
            detectedLanguages: new Set(['ja']),
          },
        ],
      ]);

      aggregator.loadFromScan(scanned);

      const usage = aggregator.getUsage();
      expect(usage.commands.has('toggle')).toBe(true);
      expect(usage.commands.has('show')).toBe(true);
      expect(usage.blocks.has('if')).toBe(true);
      expect(usage.positional).toBe(true);
      expect(usage.detectedLanguages.has('ja')).toBe(true);
    });

    it('replaces existing usage', () => {
      aggregator.add('old.html', {
        commands: new Set(['hide']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      aggregator.loadFromScan(
        new Map([
          [
            'new.html',
            {
              commands: new Set(['toggle']),
              blocks: new Set(),
              positional: false,
              detectedLanguages: new Set(),
            },
          ],
        ])
      );

      const usage = aggregator.getUsage();
      expect(usage.commands.has('hide')).toBe(false);
      expect(usage.commands.has('toggle')).toBe(true);
    });
  });

  describe('hasUsage()', () => {
    it('returns false when empty', () => {
      expect(aggregator.hasUsage()).toBe(false);
    });

    it('returns true when has commands', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      expect(aggregator.hasUsage()).toBe(true);
    });

    it('returns true when has blocks', () => {
      aggregator.add('a.html', {
        commands: new Set(),
        blocks: new Set(['if']),
        positional: false,
        detectedLanguages: new Set(),
      });

      expect(aggregator.hasUsage()).toBe(true);
    });

    it('returns true when has positional', () => {
      aggregator.add('a.html', {
        commands: new Set(),
        blocks: new Set(),
        positional: true,
        detectedLanguages: new Set(),
      });

      expect(aggregator.hasUsage()).toBe(true);
    });

    it('returns true when has detected languages', () => {
      aggregator.add('a.html', {
        commands: new Set(),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(['ja']),
      });

      expect(aggregator.hasUsage()).toBe(true);
    });
  });

  describe('getSummary()', () => {
    it('returns sorted summary', () => {
      aggregator.add('a.html', {
        commands: new Set(['show', 'toggle', 'hide']),
        blocks: new Set(['while', 'if', 'for']),
        positional: true,
        detectedLanguages: new Set(['ko', 'ja', 'es']),
      });

      const summary = aggregator.getSummary();

      expect(summary.commands).toEqual(['hide', 'show', 'toggle']);
      expect(summary.blocks).toEqual(['for', 'if', 'while']);
      expect(summary.positional).toBe(true);
      expect(summary.languages).toEqual(['es', 'ja', 'ko']);
      expect(summary.fileCount).toBe(1);
    });

    it('includes file count', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });
      aggregator.add('b.html', {
        commands: new Set(['show']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });
      aggregator.add('c.html', {
        commands: new Set(['hide']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      expect(aggregator.getSummary().fileCount).toBe(3);
    });
  });

  describe('clear()', () => {
    it('clears all usage', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(['if']),
        positional: true,
        detectedLanguages: new Set(['ja']),
      });

      aggregator.clear();

      const usage = aggregator.getUsage();
      expect(usage.commands.size).toBe(0);
      expect(usage.blocks.size).toBe(0);
      expect(usage.positional).toBe(false);
      expect(usage.detectedLanguages.size).toBe(0);
    });
  });

  describe('caching', () => {
    it('caches getUsage result', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      const usage1 = aggregator.getUsage();
      const usage2 = aggregator.getUsage();

      expect(usage1).toBe(usage2); // Same object reference
    });

    it('invalidates cache on add', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      const usage1 = aggregator.getUsage();

      aggregator.add('b.html', {
        commands: new Set(['show']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      const usage2 = aggregator.getUsage();

      expect(usage1).not.toBe(usage2);
    });

    it('invalidates cache on remove', () => {
      aggregator.add('a.html', {
        commands: new Set(['toggle']),
        blocks: new Set(),
        positional: false,
        detectedLanguages: new Set(),
      });

      const usage1 = aggregator.getUsage();

      aggregator.remove('a.html');

      const usage2 = aggregator.getUsage();

      expect(usage1).not.toBe(usage2);
    });
  });
});
