/**
 * A native event name the handler head reads, wherever an event goes.
 *
 * `normalizeEventName` reads each language's native event names: coinages
 * (de `mausbewegen`, es `ratónmover`), names of several words (ar `ضغط
 * المفتاح`) and unspaced ones (zh `鼠标移动`). Only the handler head consulted
 * it. A head with params lost them when its event had one of those names (the
 * params pre-pass compared one token with the event; zh threw), and a wait
 * took the name for a duration (`wait ratónmover`), in es and pt lending the
 * head its `or 1s`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// Each has a native name in some language that only the head read.
const EVENTS = [
  'dblclick', 'keypress', 'mousemove', 'mouseenter', 'mouseleave',
  'touchstart', 'touchend', 'keydown', 'keyup', 'resize',
];

function roundTrip(src: string, language: string): { foreign: string; back: string } {
  const foreign = render(parse(src, 'en')!, language);
  return { foreign, back: render(parse(foreign, language)!, 'en') };
}

describe.each(EVENTS)('`on %s(x)` keeps its params', event => {
  it.each(FOREIGN)('%s', language => {
    const src = `on ${event}(x) log x`;
    const { foreign, back } = roundTrip(src, language);
    expect(back, foreign).toBe(src);
  });
});

// ar `تغيير حجم` and vi `đổi kích thước` (resize) open with a word that reads
// `change` alone. The tokenizer reads each whole (P48); before, the params
// re-parse joined the words, and their unconsumed-input record reported them
// dropped until it retired it.
it.each(['ar', 'vi'])('%s: a two-word event keeps its params and reports no dropped words', language => {
  const node = parse(render(parse('on resize(x) log x', 'en')!, language), language)!;
  expect(render(node, 'en')).toBe('on resize(x) log x');
  expect((node.diagnostics ?? []).filter(d => d.code === 'unconsumed-input')).toEqual([]);
});

describe.each(EVENTS)('`wait for %s` waits for it, alone and with a timeout', event => {
  it.each(FOREIGN)('%s', language => {
    for (const src of [
      `on click wait for ${event} then log 1`,
      `on click wait for ${event} or 1s then log 1`,
    ]) {
      const { foreign, back } = roundTrip(src, language);
      expect(back, foreign).toBe(src);
    }
  });
});
