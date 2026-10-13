/**
 * `checked`, written in bn, th and vi as the property word their lexicon gives
 * (PROPERTY_NAME_LEXICON: bn `চেক করা`, th `เลือกแล้ว`, vi `được chọn`), reads
 * back as the property.
 *
 * Each is more than one word to the tokenizer (th's splits into `เลือก` and
 * `แล้ว`, then), so no reader saw a property: `set checked of :boxes …` and
 * `bind .dark and #dark-toggle's checked` were refused. The tokenizers read
 * each as one keyword now, and a property-first `of` phrase takes a keyword head
 * the language's table vouches for, as the possessive matcher already did.
 *
 * vi's `set checked of :boxes …` still refuses (its set target refuses a keyword
 * head before English `of`); the gate lists it.
 */
import { describe, it, expect } from 'vitest';
import { translate } from '../src/index';

describe.each(['bn', 'th', 'vi'])('%s', language => {
  it.each(['bind .dark and #dark-toggle\'s checked', "set #a's checked to true"])('%s', source => {
    const english = translate(source, 'en', 'en');
    expect(translate(translate(source, 'en', language), language, 'en')).toBe(english);
  });
});

describe.each(['bn', 'th'])('%s', language => {
  it('on change set checked of :checkboxes to my checked', () => {
    const source = 'on change set checked of :checkboxes to my checked';
    expect(translate(translate(source, 'en', language), language, 'en')).toBe(source);
  });
});
