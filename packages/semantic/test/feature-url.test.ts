/**
 * An `eventsource`/`socket` header keeps its URL.
 *
 * The feature-block parser skipped from the name to the first handler and kept
 * nothing it skipped, so `eventsource ChatStream from /events` rendered
 * `eventsource ChatStream` and `socket ChatSocket ws://localhost:8080` rendered
 * `socket ChatSocket`, in English and so in every translation. The URL now
 * rides in the feature's `source` role and renders verbatim, with
 * eventsource's source marker on the side the language puts it.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, tryGetProfile } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const EVENTSOURCE = 'eventsource ChatStream from /events\n  on message\n    put it into #messages\n  end\nend';
const SOCKET = 'socket ChatSocket ws://localhost:8080\n  on message\n    put it into #chat\n  end';

const header = (rendered: string): string => rendered.split('\n')[0];

describe('English keeps the URL', () => {
  it('eventsource', () => {
    expect(header(render(parse(EVENTSOURCE, 'en')!, 'en'))).toBe('eventsource ChatStream from /events');
  });

  it('socket', () => {
    expect(header(render(parse(SOCKET, 'en')!, 'en'))).toBe('socket ChatSocket ws://localhost:8080');
  });

  it('in the feature’s source role', () => {
    const node = parse(SOCKET, 'en') as { roles: Map<string, unknown> };
    expect(node.roles.get('source')).toMatchObject({ type: 'expression', raw: 'ws://localhost:8080' });
  });
});

describe.each([
  ['eventsource', EVENTSOURCE],
  ['socket', SOCKET],
])('%s, through every language', (_, src) => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(render(parse(src, 'en')!, 'en'));
  });
});

// A language whose source marker follows its noun writes it after the URL
// (ja `/events から`), not before.
it.each(FOREIGN.filter(language => tryGetProfile(language)?.roleMarkers?.source?.position === 'after'))(
  '%s writes its source marker after the URL',
  language => {
    const marker = tryGetProfile(language)!.roleMarkers!.source!.primary;
    expect(header(render(parse(EVENTSOURCE, 'en')!, language))).toMatch(new RegExp(`/events ${marker}$`));
  }
);
