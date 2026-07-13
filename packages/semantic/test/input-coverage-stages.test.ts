/**
 * Arc C — per-segment input coverage across ALL parseInternal stages.
 *
 * Before this arc the `unconsumed-input` diagnostic fired only on the Stage-2
 * plain-command path: the event-handler, compound, and SOV/VSO stages
 * re-tokenize sub-segments and dropped tokens with ZERO diagnostics (the
 * "0/3696 is a floor, not a total" blind spot —
 * docs-internal/HANDOFF_arc-c-input-coverage.md). These are the red→green
 * probes from that handoff, locked: each construct was verified silently
 * dropped (probe log 2026-07-13) and must now fire with the dropped span in
 * the message.
 *
 * Diagnostic ONLY — these tests also pin that parse outcomes did not move
 * (same tree shapes as the red side). The scoring penalty is Arc D.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import type { EventHandlerSemanticNode, CommandSemanticNode, SemanticNode } from '../src/types';

function unconsumedMessages(node: SemanticNode): string[] {
  return (node.diagnostics ?? []).filter(d => d.code === 'unconsumed-input').map(d => d.message);
}

describe('per-segment input coverage (Arc C)', () => {
  describe('event-handler body path (Stage 1 → parseBodyWithClauses)', () => {
    it('fires for a break dropped from a loop body inside a handler', () => {
      const node = parse('on click repeat 3 times break end end', 'en');
      const messages = unconsumedMessages(node);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('break');
      // Parse outcome unchanged from the red side: the loop head survives,
      // break is still dropped (the diagnostic is the only delta).
      const handler = node as EventHandlerSemanticNode;
      expect(handler.kind).toBe('event-handler');
      expect(handler.body.map(c => (c as CommandSemanticNode).action)).toEqual(['repeat']);
    });

    it('fires for a continue dropped from a loop body inside a handler', () => {
      const node = parse('on click repeat 3 times continue end end', 'en');
      const messages = unconsumedMessages(node);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('continue');
    });

    it('stays silent for a fully-consumed handler', () => {
      const node = parse('on click toggle .active', 'en');
      expect(unconsumedMessages(node)).toHaveLength(0);
    });

    it('stays silent for the in-handler if/and-conjunct (parses faithfully)', () => {
      // The and-conjunct drop is top-level-only: inside a handler the
      // conditional fold captures the full condition. Locked so a regression
      // in the fold surfaces as a NEW firing here.
      const node = parse('on click if #a and #b log "ok" end', 'en');
      expect(unconsumedMessages(node)).toHaveLength(0);
      const handler = node as EventHandlerSemanticNode;
      const conditional = handler.body[0] as CommandSemanticNode;
      expect(conditional.kind).toBe('conditional');
      const condition = conditional.roles.get('condition') as { raw?: string } | undefined;
      expect(condition?.raw).toBe('#a and #b');
    });
  });

  describe('SOV fused-body path (qu)', () => {
    it('fires for the loop body dropped after the bare-repeat recovery', () => {
      // qu render of `on click repeat 3 times break end end` (Batch 3 probe).
      const node = parse('ñitiy pi kutipay 3 times p_akiy tukuy tukuy', 'qu');
      const messages = unconsumedMessages(node);
      expect(messages.length).toBeGreaterThanOrEqual(1);
      expect(messages.join(' ')).toContain('3 times');
    });

    it('fires for a dropped continue (qu qatipay)', () => {
      const node = parse('ñitiy pi kutipay 3 times purichiy tukuy tukuy', 'qu');
      const messages = unconsumedMessages(node);
      expect(messages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('no double-count against the Stage-2 emission', () => {
    it('top-level break-in-loop fires exactly once (the Stage-2 path)', () => {
      const node = parse('repeat 3 times break end', 'en');
      const messages = unconsumedMessages(node);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/^pattern repeat-en-times/);
    });

    it('top-level and-conjunct fires exactly once (the Stage-2 path)', () => {
      const node = parse('if #a and #b log "ok"', 'en');
      const messages = unconsumedMessages(node);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/^pattern if-en-basic/);
    });
  });

  describe('residue filter (optional tokens must not fire)', () => {
    it('a bare block terminator after a fused simple handler stays silent', () => {
      const node = parse('on click toggle .active end', 'en');
      expect(unconsumedMessages(node)).toHaveLength(0);
    });

    it('leaked rendered as-markers stay silent once the value is reclaimed (hi)', () => {
      // fetch-json hi render: responseType `json` is reclaimed; the rendered
      // as-postposition `के रूप में` is designed skip-noise, not a drop.
      const node = parse(
        '/api/user को क्लिक पर लाएं json के रूप में फिर #name.innerText को इसका.name में सेट',
        'hi'
      );
      expect(unconsumedMessages(node)).toHaveLength(0);
    });
  });

  describe('speculative parses do not leak firings', () => {
    it('a faithful multi-clause handler body records nothing', () => {
      const node = parse('on click add .a to #x then remove .b from #y', 'en');
      expect(unconsumedMessages(node)).toHaveLength(0);
    });

    it('a faithful top-level command sequence records nothing', () => {
      const node = parse('add .a to #x then add .b to #y', 'en');
      expect(unconsumedMessages(node)).toHaveLength(0);
    });
  });

  describe('event-modifier phrases (Arc F) — the four en corpus rows fire zero', () => {
    // Red side (probe log 2026-07-13): each of these fired its modifier span
    // as unconsumed (`debounced at 300ms`, `once`, `throttled at 100ms`,
    // `debounced at 200ms`) with eventModifiers null — en-symmetric loss the
    // R0/R1 ratchets never saw. Green: the phrase is lifted into
    // eventModifiers, the from-clause lands in eventModifiers.from, and the
    // tree shape (body action list) is unchanged from the red side.
    const expectHandler = (
      input: string,
      mods: Record<string, unknown>,
      actions: string[]
    ): EventHandlerSemanticNode => {
      const node = parse(input, 'en');
      expect(unconsumedMessages(node)).toHaveLength(0);
      const handler = node as EventHandlerSemanticNode;
      expect(handler.kind).toBe('event-handler');
      for (const [key, value] of Object.entries(mods)) {
        expect(
          (handler.eventModifiers as Record<string, unknown> | undefined)?.[key],
          `eventModifiers.${key}`
        ).toEqual(value);
      }
      const flatten = (nodes: readonly SemanticNode[]): string[] =>
        nodes.flatMap(n =>
          n.kind === 'compound'
            ? flatten((n as unknown as { statements: SemanticNode[] }).statements)
            : [(n as CommandSemanticNode).action as string]
        );
      expect(flatten(handler.body)).toEqual(actions);
      return handler;
    };

    it('event-debounce: `debounced at 300ms` lifted, fetch/put body intact', () => {
      expectHandler(
        'on input debounced at 300ms fetch /api/search?q=${my value} as json then put it into #results',
        { debounce: 300 },
        ['fetch', 'put']
      );
    });

    it('event-once: `once` lifted, add/call body intact', () => {
      expectHandler('on click once add .initialized to me call setup()', { once: true }, [
        'add',
        'call',
      ]);
    });

    it('event-throttle: `throttled at 100ms` lifted, call body intact', () => {
      expectHandler('on scroll throttled at 100ms call updateScrollPosition()', { throttle: 100 }, [
        'call',
      ]);
    });

    it('window-resize: modifier lifted AND `from window` captured (was silently dropped)', () => {
      const handler = expectHandler(
        'on resize from window debounced at 200ms call adjustLayout()',
        { debounce: 200 },
        ['call']
      );
      expect(handler.eventModifiers?.from, 'from window must not be swallowed').toBeDefined();
    });
  });
});
