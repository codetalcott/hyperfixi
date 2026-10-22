import { describe, it, expect } from 'vitest';
import { unknownEventDiagnostics, unknownEventWords } from './unknown-events.js';

describe('unknownEventWords', () => {
  it('names a word the author wrote that nothing fires (7.3.0 live test)', () => {
    expect(unknownEventWords('al pulsar agregar .a', ['pulsar'])).toEqual(['pulsar']);
    expect(unknownEventWords('タップで .a を 追加', ['タップ'])).toEqual(['タップ']);
  });

  it('passes the events the specifications define, and upstream observers', () => {
    const fired = ['click', 'pointerdown', 'mouseenter', 'transitionend', 'focusin', 'mutation'];
    expect(unknownEventWords(`al ${fired.join(' o ')} agregar .a`, fired)).toEqual([]);
  });

  it('passes a name written as code, and a name the language translated', () => {
    expect(unknownEventWords('al miEvento agregar .a', ['miEvento'])).toEqual([]);
    expect(unknownEventWords('al draggable:start agregar .a', ['draggable:start'])).toEqual([]);
    expect(unknownEventWords('al clic agregar .a', ['click'])).toEqual([]);
  });

  it('names a word once', () => {
    expect(unknownEventWords('al pulsar o pulsar agregar .a', ['pulsar', 'pulsar'])).toEqual([
      'pulsar',
    ]);
  });
});

describe('unknownEventDiagnostics', () => {
  it('is a warning per word, never an error', () => {
    const [d, ...rest] = unknownEventDiagnostics('al pulsar agregar .a', ['pulsar'], 'es');
    expect(rest).toEqual([]);
    expect(d).toMatchObject({ severity: 'warning', code: 'UNKNOWN_EVENT_WORD' });
    expect(d!.message).toContain('"pulsar"');
  });
});
