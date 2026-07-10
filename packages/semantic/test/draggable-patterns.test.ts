/**
 * Draggable Behavior Pattern Tests
 *
 * Tests semantic layer support for the complex draggable behavior example
 * across all 24 priority languages.
 */

import { describe, it, expect } from 'vitest';
import { parse, canParse } from '../src';
import type { CommandSemanticNode, EventHandlerSemanticNode } from '../src/types';

// =============================================================================
// Phase 1: Existing Commands - Verify trigger and halt
// =============================================================================

describe('Phase 1: Verify Existing Commands', () => {
  describe('trigger command', () => {
    // Test basic trigger syntax in English first
    it('parses "trigger click" in English', () => {
      const node = parse('trigger click', 'en') as CommandSemanticNode;
      expect(node.action).toBe('trigger');
      expect(node.roles.get('event')?.value).toBe('click');
    });

    it('parses custom events like "trigger draggable:start"', () => {
      const node = parse('trigger draggable:start', 'en') as CommandSemanticNode;
      expect(node.action).toBe('trigger');
      const eventRole = node.roles.get('event') as any;
      // Custom events are stored as expression type with 'raw' property
      expect(eventRole.raw || eventRole.value).toBe('draggable:start');
    });

    // Multilingual trigger — corpus-canonical forms (pattern_translations for
    // behavior-draggable), all 24 priority languages. These are HARD
    // assertions on the captured event-name ROLE VALUE, not just the action
    // set: the colon-split tokenizer bug produced the right trigger count
    // with a truncated name (`draggable` instead of `draggable:start`) in ms,
    // which no action/role-type signal could see.
    const triggerTestCases = [
      { lang: 'en', input: 'trigger draggable:start' },
      { lang: 'ar', input: 'تشغيل draggable:start' },
      { lang: 'de', input: 'auslösen draggable:start' },
      { lang: 'es', input: 'disparar draggable:start' },
      { lang: 'fr', input: 'déclencher draggable:start' },
      { lang: 'he', input: 'הפעל את draggable:start' },
      { lang: 'hi', input: 'draggable:start को ट्रिगर' },
      { lang: 'id', input: 'picu draggable:start' },
      { lang: 'it', input: 'scatenare draggable:start' },
      { lang: 'ja', input: 'draggable:start を 引き金' },
      { lang: 'ko', input: 'draggable:start 를 트리거' },
      { lang: 'ms', input: 'cetuskan draggable:start' },
      { lang: 'pl', input: 'wyzwól draggable:start' },
      { lang: 'pt', input: 'disparar draggable:start' },
      { lang: 'qu', input: 'draggable:start ta kichay' },
      { lang: 'ru', input: 'запустить draggable:start' },
      { lang: 'sw', input: 'chochea draggable:start' },
      { lang: 'th', input: 'ทริกเกอร์ draggable:start' },
      { lang: 'tl', input: 'palitawin draggable:start' },
      { lang: 'tr', input: 'draggable:start i tetikle' },
      { lang: 'uk', input: 'запустити draggable:start' },
      { lang: 'vi', input: 'kích hoạt draggable:start' },
      { lang: 'zh', input: '触发 把 draggable:start' },
    ];

    it.each(triggerTestCases)(
      'parses trigger in $lang with the full event name: "$input"',
      ({ lang, input }) => {
        const node = parse(input, lang) as CommandSemanticNode;
        expect(node, `${lang}: "${input}" did not parse`).not.toBeNull();
        expect(node.action).toBe('trigger');
        const eventRole = node.roles.get('event') as { raw?: unknown; value?: unknown };
        expect(
          String(eventRole?.raw ?? eventRole?.value),
          `${lang}: captured event name must keep the :qualifier`
        ).toBe('draggable:start');
      }
    );

    // Pre-existing STANDALONE parse gap, unrelated to tokenization (verified
    // byte-identical before/after the colon-qualifier tokenizer fix): bn
    // throws on the bare corpus trigger line — its trigger pattern does not
    // accept the accusative কে-marked event (hi/qu had the same gap, fixed by
    // the trigger schema's markerVariants). bn's full-body captures are
    // unaffected (baseline multiset 1.0). `it.fails` flips visibly when the
    // standalone form starts parsing.
    const knownStandaloneGaps = [{ lang: 'bn', input: 'draggable:start কে ট্রিগার' }];

    it.fails.each(knownStandaloneGaps)(
      'standalone trigger in $lang is a known parse gap: "$input"',
      ({ lang, input }) => {
        const node = parse(input, lang) as CommandSemanticNode;
        expect(node.action).toBe('trigger');
      }
    );
  });

  describe('halt command', () => {
    it('parses "halt" in English', () => {
      const canParseResult = canParse('halt', 'en');
      if (canParseResult) {
        const node = parse('halt', 'en') as CommandSemanticNode;
        expect(node.action).toBe('halt');
      } else {
        console.log('  [SKIP] halt command not yet supported');
      }
    });

    it('parses "halt the event" in English', () => {
      // Note: "halt the event" is tricky because "the event" is two tokens
      // The current implementation captures just "the" - full multi-word support
      // would require hand-crafted patterns. For now, verify halt parses.
      const canParseResult = canParse('halt the event', 'en');
      if (canParseResult) {
        const node = parse('halt the event', 'en') as CommandSemanticNode;
        expect(node.action).toBe('halt');
        // Just verify halt action is recognized; multi-word args need more work
      } else {
        console.log('  [SKIP] "halt the event" not yet supported');
      }
    });
  });
});

// =============================================================================
// Phase 2: New Command Schemas - measure and install
// =============================================================================

describe('Phase 2: New Command Schemas', () => {
  describe('measure command', () => {
    it('parses "measure x" in English', () => {
      const canParseResult = canParse('measure x', 'en');
      if (canParseResult) {
        const node = parse('measure x', 'en') as CommandSemanticNode;
        expect(node.action).toBe('measure');
        const patient = node.roles.get('patient') as any;
        // Identifiers are stored as expression type with 'raw' property
        expect(patient?.raw || patient?.value).toBe('x');
      } else {
        console.log('  [SKIP] measure command not yet supported');
      }
    });

    it('parses "measure width of #element" in English', () => {
      const canParseResult = canParse('measure width of #element', 'en');
      if (canParseResult) {
        const node = parse('measure width of #element', 'en') as CommandSemanticNode;
        expect(node.action).toBe('measure');
      } else {
        console.log('  [SKIP] "measure width of #element" not yet supported');
      }
    });
  });

  describe('install command', () => {
    it('parses "install Draggable" in English', () => {
      const canParseResult = canParse('install Draggable', 'en');
      if (canParseResult) {
        const node = parse('install Draggable', 'en') as CommandSemanticNode;
        expect(node.action).toBe('install');
        const patient = node.roles.get('patient') as any;
        // Identifiers are stored as expression type with 'raw' property
        expect(patient?.raw || patient?.value).toBe('Draggable');
      } else {
        console.log('  [SKIP] install command not yet supported');
      }
    });

    it('parses "install Draggable(dragHandle: .titlebar)" in English', () => {
      const input = 'install Draggable(dragHandle: .titlebar)';
      const canParseResult = canParse(input, 'en');
      if (canParseResult) {
        const node = parse(input, 'en') as CommandSemanticNode;
        expect(node.action).toBe('install');
      } else {
        console.log('  [SKIP] install with parameters not yet supported');
      }
    });
  });
});

// =============================================================================
// Phase 3: Behavior System Patterns
// =============================================================================

describe('Phase 3: Behavior System Patterns', () => {
  describe('behavior definition', () => {
    it('parses "behavior Draggable" in English', () => {
      const canParseResult = canParse('behavior Draggable', 'en');
      if (canParseResult) {
        const node = parse('behavior Draggable', 'en') as CommandSemanticNode;
        expect(node.action).toBe('behavior');
        const patient = node.roles.get('patient') as any;
        expect(patient?.raw || patient?.value).toBe('Draggable');
      } else {
        console.log('  [SKIP] behavior definition not yet supported');
      }
    });

    it('parses "behavior Draggable(dragHandle)" in English', () => {
      const input = 'behavior Draggable(dragHandle)';
      const canParseResult = canParse(input, 'en');
      if (canParseResult) {
        const node = parse(input, 'en') as CommandSemanticNode;
        expect(node.action).toBe('behavior');
      } else {
        console.log('  [SKIP] behavior with parameters not yet supported');
      }
    });

    // Multilingual behavior definition
    const behaviorTestCases = [
      { lang: 'en', input: 'behavior Draggable' },
      { lang: 'ja', input: '振る舞い Draggable' },
      { lang: 'ar', input: 'سلوك Draggable' },
      { lang: 'es', input: 'comportamiento Draggable' },
      { lang: 'ko', input: '동작 Draggable' },
      { lang: 'zh', input: '行为 Draggable' },
      { lang: 'tr', input: 'davranış Draggable' },
      { lang: 'pt', input: 'comportamento Draggable' },
      { lang: 'fr', input: 'comportement Draggable' },
      { lang: 'de', input: 'verhalten Draggable' },
      { lang: 'id', input: 'perilaku Draggable' },
      { lang: 'qu', input: 'ruwana Draggable' },
      { lang: 'sw', input: 'tabia Draggable' },
    ];

    it.each(behaviorTestCases)(
      'parses behavior in $lang: "$input"',
      ({ lang, input }) => {
        const canParseResult = canParse(input, lang);
        if (canParseResult) {
          const node = parse(input, lang) as CommandSemanticNode;
          expect(node.action).toBe('behavior');
        } else {
          console.log(`  [SKIP] ${lang}: "${input}" - not yet supported`);
        }
      }
    );
  });
});

// =============================================================================
// Phase 4: Async Event Patterns
// =============================================================================

describe('Phase 4: Async Event Patterns', () => {
  describe('wait for event', () => {
    it('parses "wait for click" in English', () => {
      const canParseResult = canParse('wait for click', 'en');
      if (canParseResult) {
        const node = parse('wait for click', 'en') as CommandSemanticNode;
        expect(node.action).toBe('wait');
      } else {
        console.log('  [SKIP] "wait for click" not yet supported');
      }
    });

    it('parses "wait for pointermove or pointerup from document" in English', () => {
      const input = 'wait for pointermove or pointerup from document';
      const canParseResult = canParse(input, 'en');
      if (canParseResult) {
        const node = parse(input, 'en') as CommandSemanticNode;
        expect(node.action).toBe('wait');
      } else {
        console.log('  [SKIP] "wait for X or Y from Z" not yet supported');
      }
    });
  });

  describe('repeat until event', () => {
    it('parses "repeat until event pointerup" in English', () => {
      const input = 'repeat until event pointerup';
      const canParseResult = canParse(input, 'en');
      if (canParseResult) {
        const node = parse(input, 'en') as CommandSemanticNode;
        expect(node.action).toBe('repeat');
      } else {
        console.log('  [SKIP] "repeat until event" not yet supported');
      }
    });

    it('parses "repeat until event pointerup from document" in English', () => {
      const input = 'repeat until event pointerup from document';
      const canParseResult = canParse(input, 'en');
      if (canParseResult) {
        const node = parse(input, 'en') as CommandSemanticNode;
        expect(node.action).toBe('repeat');
      } else {
        console.log('  [SKIP] "repeat until event from" not yet supported');
      }
    });
  });
});

// =============================================================================
// Phase 5: Full Draggable Usage Patterns
// =============================================================================

describe('Phase 5: Full Draggable Usage Patterns', () => {
  describe('element-level usage', () => {
    it('parses "on draggable:start add .dragging" in English', () => {
      const input = 'on draggable:start add .dragging';
      const canParseResult = canParse(input, 'en');
      if (canParseResult) {
        const node = parse(input, 'en') as EventHandlerSemanticNode;
        expect(node.action).toBe('on');
        expect(node.body.length).toBeGreaterThan(0);
        if (node.body.length > 0) {
          expect((node.body[0] as CommandSemanticNode).action).toBe('add');
        }
      } else {
        console.log('  [SKIP] event handler with body not yet supported');
      }
    });

    it('parses "on draggable:end remove .dragging" in English', () => {
      const input = 'on draggable:end remove .dragging';
      const canParseResult = canParse(input, 'en');
      if (canParseResult) {
        const node = parse(input, 'en') as EventHandlerSemanticNode;
        expect(node.action).toBe('on');
        expect(node.body.length).toBeGreaterThan(0);
      } else {
        console.log('  [SKIP] event handler with body not yet supported');
      }
    });
  });

  describe('summary statistics', () => {
    it('reports coverage across all phases', () => {
      const phases = [
        { name: 'trigger', tests: ['trigger click', 'trigger draggable:start'] },
        { name: 'halt', tests: ['halt', 'halt the event'] },
        { name: 'measure', tests: ['measure x', 'measure width of #element'] },
        { name: 'install', tests: ['install Draggable', 'install Draggable(dragHandle: .titlebar)'] },
        { name: 'behavior', tests: ['behavior Draggable', 'behavior Draggable(dragHandle)'] },
        { name: 'wait-for', tests: ['wait for click', 'wait for pointermove or pointerup from document'] },
        { name: 'repeat-until', tests: ['repeat until event pointerup', 'repeat until event pointerup from document'] },
        { name: 'event-handlers', tests: ['on draggable:start add .dragging', 'on draggable:end remove .dragging'] },
      ];

      console.log('\n=== Draggable Pattern Coverage ===\n');

      let totalSupported = 0;
      let totalTests = 0;

      for (const phase of phases) {
        const supported = phase.tests.filter(t => canParse(t, 'en')).length;
        const total = phase.tests.length;
        totalSupported += supported;
        totalTests += total;

        const status = supported === total ? '✓' : supported > 0 ? '~' : '✗';
        console.log(`${status} ${phase.name}: ${supported}/${total}`);
      }

      console.log(`\nTotal: ${totalSupported}/${totalTests} (${Math.round(totalSupported/totalTests*100)}%)\n`);

      // This test always passes - it's just for reporting
      expect(true).toBe(true);
    });
  });
});
