/**
 * C3's end word: an end word where a value stands is a variable spelled like it
 * (es and fr `fin`, tr `son`, sw `mwisho`, tl `tapos`, …). A block's end
 * stands after a command's last word, and before a command, `then`, another end
 * or nothing. PR 112 read an end word an operator, `and`, `or` or the copula
 * follows: hand-written, tr `eğer son ve flag` (if son and flag) lost its whole
 * `if` — the block scan took `son` for the block's end — and es `set x to fin <
 * 3` read `set x to <`. PR 114 reads the rest of the places a value stands:
 * after a verb that requires a role, a marker, `if`, `not` or an operator, and
 * before a case marker or `'s`; hand-written, every one of them read the block's
 * end, and es `poner fin en #out` (put fin into #out) was a bare `on click`. (A
 * rendered one was already written `(fin)`: the verified render, PR 103.)
 */
import { describe, it, expect } from 'vitest';
import { parse, render, semanticRenderer } from '../src/index';

const english = (code: string, language: string): string => render(parse(code, language)!, 'en');

describe('an end word before an operator is a value', () => {
  it.each([
    [
      'tr',
      'tıklama i üzerinde eğer son ve flag "Y" i #out e koy son',
      'on click if son and flag put "Y" into #out end',
    ],
    [
      'tr',
      'tıklama i üzerinde eğer son veya flag "Y" i #out e koy son',
      'on click if son or flag put "Y" into #out end',
    ],
    [
      'es',
      'al clic establecer x a fin < 3 entonces poner x en #out',
      'on click set x to fin < 3 then put x into #out',
    ],
    [
      'es',
      'al clic si fin y flag poner 1 en #out fin',
      'on click if fin and flag put 1 into #out end',
    ],
    ['es', 'al clic si fin es 3 poner 1 en #out fin', 'on click if fin is 3 put 1 into #out end'],
    ['fr', 'quand clic mettre fin + 1 dans #out', 'on click put fin + 1 into #out'],
    // tr's `son` reads `last`, and tr lexes `<` as a selector: the join took
    // `son <` for a positional query (`last <`).
    [
      'tr',
      'tıklama i üzerinde x i son < 3 e ayarla ardından x i #out e koy',
      'on click set x to son < 3 then put x into #out',
    ],
  ])('%s: %s', (language, code, expected) => {
    expect(english(code, language)).toBe(expected);
  });
});

describe('an end word where a value stands is a value (PR 114)', () => {
  it.each([
    // After a verb whose command requires a role.
    ['es', 'al clic poner fin en #out', 'on click put fin into #out'],
    ['es', 'al clic incrementar fin', 'on click increment fin'],
    [
      'es',
      'al clic establecer fin a 1 entonces poner fin en #out',
      'on click set fin to 1 then put fin into #out',
    ],
    ['de', 'wenn klick erhöhe fertig um 2', 'on click increment fertig by 2'],
    // de's `setze` is a word the tokenizer normalizes to a verb.
    [
      'de',
      'wenn klick setze fertig auf 1 dann setzen fertig in #out',
      'on click set fertig to 1 then put fertig into #out',
    ],
    // A marker the verb's own patterns write right after it (it and pl `set`).
    [
      'it',
      'su click impostare in fine 1 allora mettere fine in #out',
      'on click set fine to 1 then put fine into #out',
    ],
    [
      'pl',
      'gdy click ustaw do koniec 1 wtedy umieść koniec do #out',
      'on click set koniec to 1 then put koniec into #out',
    ],
    // After a marker, where markers come first (es `a` is a particle, fr `à` a keyword).
    [
      'es',
      'al clic establecer x a fin entonces poner x en #out',
      'on click set x to fin then put x into #out',
    ],
    [
      'fr',
      'quand clic définir x à fin puis mettre x dans #out',
      'on click set x to fin then put x into #out',
    ],
    // After `if`, `not` (a keyword, a connective, qu's sense word) and an operator.
    ['es', 'al clic si fin poner 1 en #out fin', 'on click if fin put 1 into #out end'],
    ['es', 'al clic si no fin poner 1 en #out fin', 'on click if not fin put 1 into #out end'],
    ['es', 'al clic si x es fin poner 1 en #out fin', 'on click if x is fin put 1 into #out end'],
    // `if` owes its condition where the verb comes last too.
    ['tr', 'tıklama i üzerinde eğer son 1 i #out e koy son', 'on click if son put 1 into #out end'],
    ['pt', 'ao clique se não fim colocar 1 em #out fim', 'on click if not fim put 1 into #out end'],
    [
      'qu',
      'maykama click sichus mana tukuy 1 ta #out man churay tukukuy',
      'on click if not tukuy put 1 into #out end',
    ],
    ['es', 'al clic poner 1 + fin en #out', 'on click put 1 + fin into #out'],
    // Before `'s`, and before its own case marker where markers follow values.
    ['es', "al clic poner fin's length en #out", "on click put fin's length into #out"],
    ['tr', 'tıklama i üzerinde son i #out e koy', 'on click put son into #out'],
    ['qu', 'maykama click tukuy ta #out man churay', 'on click put tukuy into #out'],
    // A whole value right before the block's own end.
    [
      'es',
      'al clic repeat mientras fin < 3 incrementar fin fin entonces poner fin en #out',
      'on click repeat while fin < 3 increment fin end then put fin into #out',
    ],
    [
      'tr',
      'tıklama i üzerinde süresince son < 3 tekrarla son i artır son ardından son i #out e koy',
      'on click repeat while son < 3 increment son end then put son into #out',
    ],
    // In a branch, before the `else` (the branch split reads it too).
    [
      'es',
      'al clic si flag poner fin en #out sino poner 2 en #out fin',
      'on click if flag put fin into #out else put 2 into #out end',
    ],
    // sw `na` is `and` only between operands, and the end word is one.
    [
      'sw',
      'unapo click kama mwisho na flag weka "Y" kwa #out mwisho',
      'on click if mwisho and flag put "Y" into #out end',
    ],
    // tl `tapos` is also tl's `then`, which a value is not.
    [
      'tl',
      'kapag click kung tapos at flag ilagay "Y" sa #out wakas',
      'on click if tapos and flag put "Y" into #out end',
    ],
    [
      'tl',
      'kapag click kung flag ilagay tapos + 1 sa #out wakas pagkatapos ilagay 2 sa #out',
      'on click if flag put tapos + 1 into #out end then put 2 into #out',
    ],
  ])('%s: %s', (language, code, expected) => {
    expect(english(code, language)).toBe(expected);
  });
});

describe('an end word is still the end', () => {
  it.each([
    [
      'tr',
      'tıklama i üzerinde eğer flag "Y" i #out e koy son',
      'on click if flag put "Y" into #out end',
    ],
    [
      'es',
      'al clic si flag poner 1 en #out fin entonces poner 2 en #out',
      'on click if flag put 1 into #out end then put 2 into #out',
    ],
    ['es', 'al clic si flag poner 1 en #out fin fin', 'on click if flag put 1 into #out end'],
    // After a verb whose role is optional (hide's patient is `me`).
    ['es', 'al clic si x ocultar fin', 'on click if x hide end'],
    // After a variable spelled like a conjunction (es `o`, or), which a marker takes.
    [
      'es',
      'al clic si x poner 1 en o fin entonces poner 2 en #out',
      'on click if x put 1 into o end then put 2 into #out',
    ],
    // After a variable spelled like a marker, which the verb takes (es `a`, to).
    [
      'es',
      'al clic si x incrementar a fin entonces poner a en #out',
      'on click if x increment a end then put a into #out',
    ],
    // Before a particle another particle follows: that one is the value's
    // marker, and the first the value (tr `i i artır`, increment i).
    [
      'tr',
      'tıklama i üzerinde eğer x i i artır son i i artır',
      'on click if x increment i end then increment i',
    ],
    // tl `tapos` between two commands is `then`.
    [
      'tl',
      'kapag click ilagay 1 sa #out tapos ilagay 2 sa #out',
      'on click put 1 into #out then put 2 into #out',
    ],
  ])('%s: %s', (language, code, expected) => {
    expect(english(code, language)).toBe(expected);
  });
});

describe('the render keeps its plain spelling where that reads now', () => {
  // The verified render wrote `(fin)` because the plain render lost it.
  it.each([
    ['es', 'on click set x to fin < 3 then put x into #out'],
    ['tr', 'on click if son and flag then put "Y" into #out end'],
    ['es', 'on click put fin into #out'],
    ['tr', 'on click increment son then put son into #out'],
    ['sw', 'on click if mwisho and flag then put "Y" into #out end'],
  ])('%s: %s', (language, source) => {
    const node = parse(source, 'en')!;
    const code = render(node, language);
    expect(code).toBe(semanticRenderer.render(node, language));
    expect(english(code, language)).toBe(render(node, 'en'));
  });
});
