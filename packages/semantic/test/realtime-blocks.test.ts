/**
 * Realtime / Service-Worker Block Tests
 *
 * `eventsource`, `socket`, and `intercept` introduce named, body-bearing
 * constructs. Their command schemas declare `roles: []` + `bareKeyword: true`,
 * so the generated pattern is a lone keyword literal — which used to match at
 * Stage 2 and swallow the entire body at a *vacuous* confidence 1.0
 * (`scoreRoleCoverage` returns 1 when a pattern declares no roles). The
 * structural layer (`tryParseFeatureBlock`) now folds them instead.
 *
 * These tests deliberately do NOT assert "does it parse". It always parsed — at
 * 1.0. They assert on the captured BODY, on the derived confidence, and on the
 * body surviving into the built AST.
 */
import { describe, it, expect } from 'vitest';
import { parse, buildAST } from '../src';
import type {
  CommandSemanticNode,
  EventHandlerSemanticNode,
  FeatureSemanticNode,
} from '../src/types';

/** Flatten every `action` reachable through a node's structural child fields. */
function actionsOf(node: unknown): string[] {
  const out: string[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    const rec = n as Record<string, unknown>;
    if (typeof rec.action === 'string' && rec.action !== 'compound') out.push(rec.action);
    for (const field of ['body', 'statements', 'eventHandlers', 'initBlock']) {
      for (const child of (rec[field] as unknown[]) ?? []) walk(child);
    }
  };
  walk(node);
  return out;
}

const EVENTSOURCE = 'eventsource ChatStream from /events on message put it into #messages end end';
const SOCKET = 'socket ChatSocket ws://localhost:8080 on message put it into #chat end';
const INTERCEPT =
  'intercept / precache /, /style.css, /app.js as "v1" on /api/* use network-first end';

describe('realtime / service-worker blocks', () => {
  describe('eventsource', () => {
    it('captures the handler body rather than dropping it', () => {
      const node = parse(EVENTSOURCE, 'en') as FeatureSemanticNode;

      expect(node.kind).toBe('feature');
      expect(node.action).toBe('eventsource');
      expect(node.name).toBe('ChatStream');
      expect(node.body).toHaveLength(1);

      const handler = node.body[0] as EventHandlerSemanticNode;
      expect(handler.kind).toBe('event-handler');
      expect(handler.body.map(c => c.action)).toEqual(['put']);
      expect(actionsOf(node)).toEqual(['eventsource', 'on', 'put']);
    });

    it('carries the body into the built AST', () => {
      const { ast } = buildAST(parse(EVENTSOURCE, 'en')) as unknown as {
        ast: { type: string; name: string; args: Array<{ type: string; commands?: unknown[] }> };
      };
      expect(ast.name).toBe('eventsource');
      const block = ast.args.find(a => a.type === 'block');
      expect(block?.commands).toHaveLength(1);
    });

    it('parses the Japanese (SOV, verb-final) rendering identically', () => {
      const ja = [
        'ChatStream を eventsource /events から',
        '  message で',
        '    それ を #messages に 置く',
        '  終わり',
        '終わり',
      ].join('\n');
      const node = parse(ja, 'ja') as FeatureSemanticNode;
      expect(node.kind).toBe('feature');
      expect(node.name).toBe('ChatStream');
      expect(actionsOf(node)).toEqual(['eventsource', 'on', 'put']);
    });
  });

  describe('socket', () => {
    it('captures the handler body across a multi-token url', () => {
      // `ws://localhost:8080` lexes as three tokens (`ws` `:` `//localhost:8080`),
      // so the head cannot be skipped by token arithmetic.
      const node = parse(SOCKET, 'en') as FeatureSemanticNode;

      expect(node.kind).toBe('feature');
      expect(node.name).toBe('ChatSocket');
      expect(actionsOf(node)).toEqual(['socket', 'on', 'put']);
    });

    it('accepts a handler-less socket (its single `end` closes the feature)', () => {
      const node = parse('socket ChatSocket ws://localhost:8080 end', 'en') as FeatureSemanticNode;
      expect(node.kind).toBe('feature');
      expect(node.body).toHaveLength(0);
    });

    it('parses the Japanese (SOV, verb-final) rendering identically', () => {
      const ja = [
        'ChatSocket ws://localhost:8080 を ソケット',
        '  message で',
        '    それ を #chat に 置く',
        '  終わり',
      ].join('\n');
      expect(actionsOf(parse(ja, 'ja'))).toEqual(['socket', 'on', 'put']);
    });
  });

  describe('intercept', () => {
    it('consumes its body opaquely — the config DSL is not hyperscript commands', () => {
      const node = parse(INTERCEPT, 'en') as FeatureSemanticNode;

      expect(node.kind).toBe('feature');
      expect(node.action).toBe('intercept');
      // `on /api/* use network-first` is a route rule, not an event handler.
      // Parsing it would mint a phantom `on` handler and a junk `use` action.
      expect(node.body).toHaveLength(0);
      expect(actionsOf(node)).toEqual(['intercept']);
    });

    it('leaves no unconsumed input behind', () => {
      const node = parse(INTERCEPT, 'en');
      const unconsumed = (node.diagnostics ?? []).filter(d => d.code === 'unconsumed-input');
      expect(unconsumed).toHaveLength(0);
    });

    it('declines a block with content after its closing `end`', () => {
      // A mangled single-line translation strands the terminator mid-stream. Fold
      // nothing rather than consume the block and silently drop the remainder.
      const node = parse('intercept / precache / as "v1" end on * use cache-first', 'en');
      expect(node.kind).not.toBe('feature');
    });
  });

  describe('confidence is derived from the body, not from the role-less shortcut', () => {
    it('scores a healthy, terminated block at 1', () => {
      expect(parse(EVENTSOURCE, 'en').metadata?.confidence).toBe(1);
    });

    it('penalises an unterminated block', () => {
      const node = parse('live put it into me', 'en');
      expect(node.metadata?.confidence).toBeCloseTo(0.8);
    });

    it('penalises a handler whose body silently dropped', () => {
      const node = parse('eventsource S from /e on message end end', 'en');
      expect(node.metadata?.confidence).toBeLessThan(0.5);
    });
  });

  it('does not fire the unconsumed-input diagnostic any more', () => {
    for (const src of [EVENTSOURCE, SOCKET, INTERCEPT]) {
      const diagnostics = parse(src, 'en').diagnostics ?? [];
      expect(diagnostics.filter(d => d.code === 'unconsumed-input')).toHaveLength(0);
    }
  });

  it('does not hijack ordinary commands', () => {
    expect((parse('toggle .active', 'en') as CommandSemanticNode).action).toBe('toggle');
    expect((parse('fetch /api/data', 'en') as CommandSemanticNode).action).toBe('fetch');
  });

  it('leaves behavior/def blocks to the behavior layer', () => {
    expect(parse('behavior Removable(t)\n  on click remove me\n  end\nend', 'en').kind).toBe(
      'behavior'
    );
    expect(parse('def helper(a)\n  return a\nend', 'en').kind).toBe('def');
  });

  it('leaves `worker` on the old bare-keyword path (folded with SOV `def` support)', () => {
    // Folding worker in English alone would enrich the English reference action
    // set while the other 23 languages still dropped their bodies — a fidelity
    // regression. It lands with verb-final `def` support.
    const node = parse('worker Calculator def add(a, b) return a + b end end', 'en');
    expect(node.kind).toBe('command');
    expect(node.action).toBe('worker');
  });
});
