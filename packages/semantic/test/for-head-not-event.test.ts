/**
 * A top-level `for` loop is a loop, not a handler on its variable.
 *
 * bn's `repeat for item in items` (`পুনরাবৃত্তি item এ items …`) had the same
 * reading, through the SOV event extraction a leading `repeat` hands over to.
 *
 * bn (`item এ items জন্য …`), hi (`item में items हेतु …`) and sw (`kwa item
 * ndani items …`) put the loop's variable beside a word that is also their `on`,
 * so the event stage read `for item in items log item end` as `on item`; ko's
 * marker-less custom event (a name right before a command word) took the
 * collection before its `for` word (`items 각각`). Inside a handler the loop
 * read, because the head was already taken.
 */
import { describe, it, expect } from 'vitest';
import { translate } from '../src/index';

const squeeze = (s: string) => s.replace(/\s+/g, ' ').trim();

describe.each(['bn', 'hi', 'ko', 'sw'])('%s', language => {
  it.each([
    'for item in items log item end',
    'for item in <li/> add .done to item end',
    'on click for item in items log item end',
    'repeat for item in items log item end',
    'repeat 3 times log 1 end',
    // A handler on a custom event whose body is a loop keeps its event.
    'on foo for item in items log item end',
    'on foo log 1',
  ])('%s', source => {
    const foreign = translate(source, 'en', language);
    expect(squeeze(translate(foreign, language, 'en')), foreign).toBe(source);
  });
});
