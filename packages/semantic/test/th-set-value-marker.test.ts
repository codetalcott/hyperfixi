/**
 * th marks `set`'s VALUE, not its target.
 *
 * `setSchema` is the one command whose operands are inverted — the destination
 * (the thing being written) is positional and the patient (the value) takes the
 * `to` modifier — so every language declares the arrangement explicitly in
 * `markerOverride`. th was absent from BOTH maps and fell to its profile
 * defaults (`destination: 'ใน'`, `patient: ''`), which put the preposition on
 * the wrong operand and left the value bare:
 *
 *   en   set @disabled to true
 *   th   ตั้ง ใน @disabled จริง        ← marker on the target, value unmarked
 *   i18n ตั้ง @disabled ใน จริง        ← the transformer's own form
 *
 * Every th `set` row in the corpus carried that inversion. Most survived it,
 * because the parse is symmetric enough to recover a bare target and a bare
 * value; the one it actually broke is `set-color-variable`, whose destination is
 * a property path — inside an event handler the fused parse took `ของ` (the
 * genitive linker) as the value and dropped the path, which is what kept that
 * row on the i18n renderer.
 *
 * The override reuses th's own `ใน` — the destination preposition its profile
 * already declares, moved onto the value, exactly as ja/ko/bn/qu/tl do
 * ("value gets destination marker"). Nothing was authored.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parseSemantic, render } from '../src/index';

function renderTh(english: string): string {
  const reference = parseSemantic(english, 'en')?.node;
  expect(reference, `en did not parse: ${english}`).toBeTruthy();
  return render(reference!, 'th');
}

function roundTrip(english: string): string {
  const reference = parseSemantic(english, 'en')?.node;
  const surface = render(reference!, 'th');
  const reparsed = parseSemantic(surface, 'th')?.node;
  expect(reparsed, `th did not re-parse: ${surface}`).toBeTruthy();
  return render(reparsed!, 'en');
}

describe('the marker sits before the value', () => {
  it.each([
    ['on click set @disabled to true', '@disabled', 'จริง'],
    ['on click set my *opacity to 0.5', '*opacity', '0.5'],
    ['on click set #output.innerText to "Hello World"', '#output.innerText', '"Hello World"'],
    ['set triggerEl to me', 'triggerEl', 'ฉัน'],
  ])('%s', (english, target, value) => {
    const rendered = renderTh(english);
    const targetAt = rendered.indexOf(target);
    const markerAt = rendered.indexOf('ใน');
    const valueAt = rendered.indexOf(value);
    expect(targetAt, `no ${target} in ${rendered}`).toBeGreaterThan(-1);
    expect(markerAt, `no ใน in ${rendered}`).toBeGreaterThan(-1);
    expect(valueAt, `no ${value} in ${rendered}`).toBeGreaterThan(-1);
    // The whole fix: target, then marker, then value — not marker, target, value.
    expect(targetAt, `th marked the target instead of the value: ${rendered}`).toBeLessThan(
      markerAt
    );
    expect(markerAt, `th left the value unmarked: ${rendered}`).toBeLessThan(valueAt);
  });
});

describe('every corpus shape of th `set` round-trips', () => {
  it.each([
    'on click set @disabled to true',
    'on click set my *opacity to 0.5',
    'on click set my *background to "red"',
    'on click set #output.innerText to "Hello World"',
    'on click set @aria-selected to "false" on .tab',
    'on click breakpoint then set $x to 42',
    'set triggerEl to me',
    // The kept row. The BARE form round-tripped before this change and the
    // wrapped one did not, so assert the wrapped one.
    'on click set the *background-color of #theme to "#ff6600"',
  ])('%s', english => {
    const reference = parseSemantic(english, 'en')?.node;
    expect(roundTrip(english)).toBe(render(reference!, 'en'));
  });
});

describe('the property path survives inside a handler', () => {
  // The specific loss: the fused handler parse took the genitive linker `ของ`
  // as the value and dropped the path entirely — `set *background-color to ของ`.
  it('keeps #theme as the owner and "#ff6600" as the value', () => {
    const surface = renderTh('on click set the *background-color of #theme to "#ff6600"');
    const node = parseSemantic(surface, 'th')?.node as
      { body?: Array<{ roles?: Map<string, unknown> }> } | undefined;
    const command = node?.body?.[0];
    const destination = command?.roles?.get('destination') as
      { type?: string; object?: { value?: string }; property?: string } | undefined;
    expect(destination, `destination lost in ${surface}`).toBeDefined();
    expect(destination!.type).toBe('property-path');
    expect(destination!.object).toMatchObject({ value: '#theme' });
    expect(destination!.property).toBe('*background-color');
    expect(command?.roles?.get('patient')).toMatchObject({ value: '#ff6600' });
  });
});
