/**
 * A variable spelled like one of the language's particles.
 *
 * tr's accusative marker is `i`, the usual loop variable, and its dative is
 * `e` (with `u` among the accusative's vowel-harmony forms). Each tokenizes as
 * a particle, and a role slot took nothing from one, so `i i 2 artır`
 * (`increment i by 2`) matched no pattern and fell to a fallback that lost
 * the amount, and `repeat while i < 3 increment i end` lost the increment and
 * pulled the next command into the loop: every tr loop and increment cell of
 * the value matrix failed. A particle directly before the pattern's next
 * marker is that marker's value, and so is one between another marker and the
 * verb (`k i i artır`, increment k by i). One before an operator (`i < -2`)
 * is the operator run's operand (C10); between a value and the verb it is the
 * value's marker (`1s i bekle`, pinned in wait-alternatives.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

describe.each(['i', 'e', 'u'])('tr `%s`', name => {
  it.each([
    `on click set ${name} to 0 then repeat while ${name} < 3 increment ${name} end then put ${name} into #out`,
    `on click set ${name} to 1 then increment ${name} by 2 then put ${name} into #out`,
    `on click set ${name} to 1 then decrement ${name} by 2 then put ${name} into #out`,
    `on click set ${name} to 2 then put ${name} + 1 into #out`,
    `on click set ${name} to 2 then put [${name}, 1] into #out`,
    `on click set x to ${name} then put x into #out`,
    `on click set k to 1 then increment k by ${name} then put k into #out`,
    `on click set ${name} to 2 then if ${name} is 2 then put "Y" into #out end`,
    // tr renders an `if` body right after its condition (`eğer i dir 1 i i 2
    // artır`), so the variable follows the condition's last operand.
    `on click set ${name} to 1 then if ${name} is 1 increment ${name} by 2 end then put ${name} into #out`,
    // Before an operator: the operator run's operand, unary minus included.
    `on click set ${name} to 0 then repeat while ${name} < -2 increment ${name} end then put ${name} into #out`,
    `on click set ${name} to 2 then put ${name} + -n into #out`,
  ])('%s', source => {
    const english = render(parse(source, 'en')!, 'en');
    const foreign = render(parse(source, 'en')!, 'tr');
    expect(render(parse(foreign, 'tr')!, 'en'), foreign).toBe(english);
  });
});

describe('a particle before its marker is the value, not the marker', () => {
  it('tr `i i 2 artır` reads its amount, and `i` as a variable', () => {
    const node = parse('tıklama i üzerinde i i 2 artır', 'tr')!;
    expect(render(node, 'en')).toBe('on click increment i by 2');
  });
});

describe('a particle before a run operator is its marker, not the value', () => {
  // zh's `把` marks the patient, and `mod` is a run operator: until PR 99 a
  // particle before a run operator was the value (C7(b), PR 67, written before
  // the operator run took a unary minus), and zh `增加 把 mod` read `increment 把`.
  it.each(['zh', 'ja', 'ko', 'tr'])('%s `increment mod`', language => {
    const source = 'on click set mod to 1 then increment mod then put mod into #out';
    const english = render(parse(source, 'en')!, 'en');
    const foreign = render(parse(source, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });

  it('zh `增加 把 mod` reads the variable', () => {
    const node = parse('一 点击 就 增加 把 mod', 'zh')!;
    expect(render(node, 'en')).toBe('on click increment mod');
  });
});
