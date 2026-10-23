/**
 * An event word its verb's object particle follows is that verb's object, not a handler's event
 * (event-heads.ts, isEventWordObject). ko anchors a handler's event bare, with or without `할 때`,
 * so at top level `로드 를 대기` (wait for load) came back `on load wait 를`: a handler with the
 * particle for wait's value, and translate() did not refuse it. Inside a handler the same words
 * read `wait for load`. At top level they are now refused, as ja `ロード を 待つ` and tr
 * `yükleme i bekle` are.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { translate } from '../src/index';

describe('an event word with its object particle is not a handler head', () => {
  it.each(['로드 를 대기', '로드를 대기', '로드 을 대기', '로드 를 토글', '변경 를 대기'])(
    'ko top level: %s is refused, not read as a handler',
    source => {
      expect(() => translate(source, 'ko', 'en')).toThrow();
    }
  );

  it('inside a handler the same words still read', () => {
    expect(translate('클릭 할 때 로드 를 대기', 'ko', 'en')).toBe('on click wait for load');
  });

  it.each([
    ['로드 대기', 'wait for load'],
    ['로드 할 때 .a 를 토글', 'on load toggle .a'],
    ['클릭 을 에 .a 를 토글', 'on click toggle .a'],
    ['.a 를 클릭 할 때 토글', 'on click toggle .a'],
  ])('ko heads without the particle read as before: %s', (source, english) => {
    expect(translate(source, 'ko', 'en')).toBe(english);
  });
});
