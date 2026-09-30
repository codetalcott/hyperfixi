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
 * rendered one was already written `(fin)`: the verified render, PR 103.) PR
 * 117 reads a loop head's, PR 121 the value after a word a loop's patterns
 * write before a role (fr `repeat x en fin`, for x in fin), and PR 122 the
 * unmarked value after a marker's (it `impostare in x fine`, set x to fine).
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

describe('an end word in a loop head is a value where one stands (PR 117)', () => {
  it.each([
    // With the language's own `repeat` verb, the fused loop head's clause scan
    // ended at the end word, and the loop read `repeat mientras`.
    [
      'es',
      'al clic repetir mientras fin < 3 incrementar x fin entonces poner x en #out',
      'on click repeat while fin < 3 increment x end then put x into #out',
    ],
    [
      'es',
      'al clic repetir mientras fin incrementar x fin entonces poner x en #out',
      'on click repeat while fin increment x end then put x into #out',
    ],
    [
      'pt',
      'ao clique repetir enquanto fim < 3 incrementar x fim então colocar x em #out',
      'on click repeat while fim < 3 increment x end then put x into #out',
    ],
    // tl `tapos` is also tl's `then`, which the loop head's scan took it for.
    [
      'tl',
      'kapag click ulitin habang tapos < 3 dagdagan x wakas pagkatapos ilagay x sa #out',
      'on click repeat while tapos < 3 increment x end then put x into #out',
    ],
    // …and a counted loop lost its whole body at `incrementar fin`.
    [
      'es',
      'al clic repetir 3 times incrementar fin fin entonces poner fin en #out',
      'on click repeat 3 times increment fin end then put fin into #out',
    ],
    // A loop's count before `times`, and a for loop's list after its `in`.
    [
      'tr',
      'tıklama i üzerinde son times i repeat x i artır son ardından x i #out e koy',
      'on click repeat son times increment x end then put x into #out',
    ],
    [
      'qu',
      'maykama click repeat x ukupi tukuy x ta #out man churay tukukuy chaymantataq 1 ta #out man churay',
      'on click repeat for x in tukuy put x into #out end then put 1 into #out',
    ],
  ])('%s: %s', (language, code, expected) => {
    expect(english(code, language)).toBe(expected);
  });
});

describe("an end word after a loop's own word is a value (PR 121)", () => {
  // The words a loop's patterns write right before a role (fr `repeat {patient}
  // en {source}`, `repeat tantque {condition}`) render as plain words no marker
  // test sees: the head's scan ended at the end word and the loop was lost.
  it.each([
    [
      'fr',
      'quand clic repeat x en fin mettre x dans #out fin puis mettre 1 dans #out',
      'on click repeat for x in fin put x into #out end then put 1 into #out',
    ],
    [
      'fr',
      'quand clic repeat tantque fin incrémenter x fin puis mettre x dans #out',
      'on click repeat while fin increment x end then put x into #out',
    ],
    [
      'tl',
      'kapag click repeat x sa_loob wakas ilagay x sa #out wakas pagkatapos ilagay 1 sa #out',
      'on click repeat for x in wakas put x into #out end then put 1 into #out',
    ],
    // tr `içinde` is a particle, but no marker of the profile.
    [
      'tr',
      'tıklama i üzerinde repeat x içinde son x i #out e koy son ardından 1 i #out e koy',
      'on click repeat for x in son put x into #out end then put 1 into #out',
    ],
  ])('%s: %s', (language, code, expected) => {
    expect(english(code, language)).toBe(expected);
  });

  // The stored hi behavior-sortable row, whose loop's last command ends with a
  // marker (`sortable:move को ट्रिगर मैं में`, trigger sortable:move on me): with
  // `में` read as a loop word, its `समाप्त` was a value, and the loop swallowed the
  // two commands after it (PR 121's words are no profile's markers).
  it('a loop ends after a marker its last command ends with (hi)', () => {
    const code = [
      'Sortable(dragClass) को व्यवहार',
      '    प्रारंभ',
      '        अगर dragClass है अपरिभाषित',
      '            dragClass को "sorting" में सेट',
      '        समाप्त',
      '    समाप्त',
      '    pointerdown(clientY) पर मैं से',
      '        item को the target.closest("li") में सेट',
      '        अगर item है खाली',
      '            बाहर',
      '        समाप्त',
      '        the घटना को रोकें',
      '        .{dragClass} को जोड़ें item में',
      '        sortable:start को ट्रिगर मैं में',
      '        तक घटना pointerup को दोहराएं दस्तावेज़ से',
      '            प्रतीक्षा pointermove(clientY) या pointerup(clientY) दस्तावेज़ से',
      '            sortable:move को ट्रिगर मैं में',
      '        समाप्त',
      '        .{dragClass} को हटाएं item से',
      '        sortable:end को ट्रिगर मैं में',
      '    समाप्त',
      'समाप्त',
    ].join('\n');
    expect(english(code, 'hi')).toContain(
      'trigger sortable:move end then remove .{dragClass} from item then trigger sortable:end'
    );
  });
});

describe("an end word after an unmarked role's value is a value (PR 122)", () => {
  // it and pl `set` write a marker after the verb and two roles after it, the
  // second unmarked (it `impostare in {destination} {patient}`): the end word
  // after the destination was taken for the block's end.
  it.each([
    [
      'it',
      'su click impostare in x fine allora mettere x in #out',
      'on click set x to fine then put x into #out',
    ],
    [
      'pl',
      'gdy click ustaw do x koniec wtedy umieść x do #out',
      'on click set x to koniec then put x into #out',
    ],
  ])('%s: %s', (language, code, expected) => {
    expect(english(code, language)).toBe(expected);
  });

  // Only where the pattern writes a second role: zh `把` and he `את` stand
  // after every verb, before its one role, and the end word after it ends.
  it.each([
    [
      'zh',
      '一 点击 就 如果 flag 增加 把 x 结束 然后 增加 把 y',
      'on click if flag increment x end then increment y',
    ],
    [
      'he',
      'ב click אם flag הגדל את x סוף אז הגדל את y',
      'on click if flag increment x end then increment y',
    ],
  ])('still the end: %s: %s', (language, code, expected) => {
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
