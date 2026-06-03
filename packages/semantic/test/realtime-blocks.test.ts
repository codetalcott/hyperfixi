/**
 * Realtime / Service-Worker Block Tests
 *
 * `eventsource`, `socket`, `worker`, and `intercept` introduce named,
 * body-bearing constructs. Like `live`, they take no fixed leading role, so
 * they use `bareKeyword` pattern generation: the parsed node carries the
 * action and the body is handled by the block machinery. Previously each
 * returned null from the parser.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import type { CommandSemanticNode } from '../src/types';

describe('realtime / service-worker blocks', () => {
  const cases: Array<[string, string]> = [
    ['eventsource', 'eventsource ChatStream from /events on message put it into #messages end'],
    ['socket', 'socket ChatSocket ws://localhost:8080 on message put it into #chat end'],
    ['worker', 'worker Calculator def add(a, b) return a + b end end'],
    [
      'intercept',
      'intercept / precache /, /style.css, /app.js as "v1" on /api/* use network-first end',
    ],
  ];

  for (const [action, code] of cases) {
    it(`parses a ${action} block`, () => {
      const node = parse(code, 'en') as CommandSemanticNode;
      expect(node.action).toBe(action);
    });
  }

  it('does not hijack ordinary commands', () => {
    expect((parse('toggle .active', 'en') as CommandSemanticNode).action).toBe('toggle');
    expect((parse('fetch /api/data', 'en') as CommandSemanticNode).action).toBe('fetch');
  });
});
