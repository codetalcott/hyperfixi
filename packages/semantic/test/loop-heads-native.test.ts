/**
 * A loop head in the language's own words (M2, vocabulary sheet A1).
 *
 * The for/while/until/until-event heads wrote the literal `repeat`, which the
 * matcher reads by normalized form, so every translation's loop kept English:
 * es `repeat item en .items` (its `for` dropped too), ja `まで イベント mouseup を
 * repeat`. They now write the verb the counted heads write (es `repetir`, ja
 * `繰り返し`), and a for-loop writes its for-word where that is a plain word (es
 * `repetir para item en .items`). The verb stays in a for-loop: without it the
 * head is the `for` command's own (`para item en $items`), which semantic reads
 * apart from `repeat for` though both engines run them alike.
 *
 * With the native verb a fused handler pattern (it `repeat-event-it-vso`) began
 * to match `su mousedown ripetere fino evento mouseup` and the loop's body was
 * lost; a head-only loop head that reads the same roles and then the body now
 * takes its place.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, parse, translate } from '../src/index';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

const LOOPS = [
  'on click repeat for item in .items add .processed to item end',
  'on click repeat while #c.innerText < 10 increment #c end',
  'on click repeat until x > 3 increment x end',
  'on mousedown repeat until event mouseup increment #c end',
  'on mousedown repeat until event mouseup from document increment #c end',
];

const words = (text: string): string[] => text.split(/\s+/);

describe.each(LOOPS)('%s', source => {
  it.each(FOREIGN)('%s writes no English repeat and reads back', language => {
    const rendered = translate(source, 'en', language);
    // qu's until-event-with-source head is a reading tolerance the renderer
    // still picks (`hayk _ a until event …`), as on main.
    if (!(language === 'qu' && source.includes('from document'))) {
      expect(words(rendered)).not.toContain('repeat');
    }
    expect(translate(rendered, language, 'en')).toBe(source);
  });
});

describe('a for-loop writes its for-word, apart from the for command', () => {
  it('es', () => {
    expect(translate('on click repeat for item in .items log item end', 'en', 'es')).toBe(
      'al clic repetir para item en .items registrar item fin'
    );
    expect(translate('for item in $items log item end', 'en', 'es')).toBe(
      'para item en $items registrar item fin'
    );
  });

  it('a head written without its for-word, or in English, still reads', () => {
    for (const written of [
      'al clic repetir item en .items registrar item fin',
      'al clic repeat item en .items registrar item fin',
    ]) {
      expect(translate(written, 'es', 'en')).toBe(
        'on click repeat for item in .items log item end'
      );
    }
  });
});

describe('a fused handler gives way to the loop head that reads the body', () => {
  it.each(['it', 'pl', 'ms', 'th', 'tl', 'vi'])('%s', language => {
    const rendered = translate('on mousedown repeat until event mouseup increment #c end', 'en', language);
    const handler = parse(rendered, language) as unknown as { body: Array<{ action?: string }> };
    expect(handler.body.map(c => c.action)).toEqual(['repeat', 'increment']);
  });
});
