/**
 * A behavior renders its `init` block before its handlers.
 *
 * The renderer wrote the handlers first. Core runs `init` before attaching any
 * handler, but upstream installs features in source order, so a render's `on
 * click from triggerEl` evaluated `triggerEl` before `init` had set it
 * (behavior-removable, in English and so in every translation).
 */
import { describe, it, expect } from 'vitest';
import { parse, render, tryGetProfile } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const SRC = 'behavior Demo(h)\n  init\n    set h to me\n  end\n  on click from h\n    log 1\n  end\nend';

/** The line after the header: the `init` keyword when init comes first. */
const secondLine = (rendered: string): string => rendered.split('\n')[1]?.trim() ?? '';
const initWord = (language: string): string =>
  tryGetProfile(language)?.keywords?.init?.primary ?? 'init';

describe('`init` renders before the handlers', () => {
  it('en', () => {
    expect(secondLine(render(parse(SRC, 'en')!, 'en'))).toBe('init');
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(SRC, 'en')!, language);
    expect(secondLine(foreign), foreign).toBe(initWord(language));
    expect(render(parse(foreign, language)!, 'en')).toBe(render(parse(SRC, 'en')!, 'en'));
  });
});
