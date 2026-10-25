/**
 * A socket's body is ONE clause, `on message [as JSON] <commands>`, closed by the socket's
 * `end` or by the end of the script: upstream's socket feature, which the engine's
 * `ext/socket` reads, and upstream's own tests (`features/socket.js`), whose scripts are
 * the sources below.
 *
 * Measured on main before the fix (the command-shape gate, with the extension registered):
 * of upstream's 15 socket scripts and its hover example, 11 passed, 4 were refused in all
 * 24 languages (no `end`: no body; `as JSON`: unread), and `socket MyApp.chat …` was
 * SILENT in all 24 (`socket MyApp .chat …`, another socket). A clause closed by `end` came
 * back with a second `end`, which the engine rejects.
 *
 * The engine is the oracle for these in `packages/testing-framework`'s command-shape gate;
 * this file holds the English each one comes back as.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { FeatureSemanticNode } from '../src/types';

const LANGUAGES = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

/** Each source, and the English it comes back as from every language. */
const ROUND_TRIPS: Array<[string, string, string]> = [
  [
    'no `end`',
    'socket TextSocket ws://localhost/ws\n  on message\n    set window.socketFired to true',
    'socket TextSocket ws://localhost/ws\n  on message set window.socketFired to true\nend',
  ],
  [
    '`as JSON`',
    'socket JsonSocket ws://localhost/ws\n  on message as JSON\n    set window.socketFiredJson to true',
    'socket JsonSocket ws://localhost/ws\n  on message as JSON set window.socketFiredJson to true\nend',
  ],
  [
    'a dotted name',
    'socket MyApp.chat ws://localhost/ws end',
    'socket MyApp.chat ws://localhost/ws\nend',
  ],
  [
    'a timeout',
    'socket TimedSocket ws://localhost/ws with timeout 1500 end',
    'socket TimedSocket ws://localhost/ws with timeout 1500\nend',
  ],
  [
    // The body's first word looks like an event (`log message`): read as ja's head
    // `で message`, the block did not read at all.
    'a body that starts like an event',
    'socket Chat ws://localhost:8080/chat\n  on message as json\n    log message\nend',
    'socket Chat ws://localhost:8080/chat\n  on message as json log message\nend',
  ],
];

describe('a socket comes back as the socket upstream reads', () => {
  for (const [what, source, english] of ROUND_TRIPS) {
    describe(what, () => {
      it('en', () => {
        expect(translate(source, 'en', 'en')).toBe(english);
      });
      it.each(LANGUAGES)('%s', language => {
        const rendered = translate(source, 'en', language);
        expect(translate(rendered, language, 'en'), rendered).toBe(english);
      });
    });
  }
});

describe('what a socket reads as', () => {
  it('keeps `as JSON` beside its message clause', () => {
    const node = parse(ROUND_TRIPS[1][1], 'en') as FeatureSemanticNode;
    expect(node.kind).toBe('feature');
    expect(node.roles.get('responseType')).toEqual({ type: 'literal', value: 'JSON' });
    expect(node.body.map(child => child.kind)).toEqual(['event-handler']);
  });

  it('writes `as` in the word a conversion is written with', () => {
    expect(translate(ROUND_TRIPS[1][1], 'en', 'es')).toContain('al message como JSON');
    expect(translate(ROUND_TRIPS[1][1], 'en', 'ja')).toContain('messageで として JSON');
  });

  it('reads the two `end`s this package wrote before as the one socket they were', () => {
    const old = 'socket ChatSocket ws://localhost:8080 on message put it into #chat end end';
    expect(translate(old, 'en', 'en')).toBe(
      'socket ChatSocket ws://localhost:8080\n  on message put it into #chat\nend'
    );
  });

  it('does not read a command after the socket as part of it', () => {
    const node = parse('socket ChatSocket ws://localhost:8080 end put 1 into #x', 'en');
    expect(node?.kind).not.toBe('feature');
  });
});
