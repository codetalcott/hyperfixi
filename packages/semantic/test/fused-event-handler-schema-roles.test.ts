/**
 * The fused `<cmd>-event-{L}` patterns read `commandSchema.roles`.
 *
 * A fused pattern wraps a whole single-command handler (`on click toggle
 * .active`) in ONE pattern and outranks the standalone command pattern
 * (basePriority + 50) whenever its verb matches. The two PRIMARY generators —
 * `generateVSOEventHandlerPattern` and `generateSOVEventHandlerPattern` — were
 * hardcoded to `event + verb + patient + [destination] + [source]` and never
 * looked at the wrapped command's schema, which left three holes:
 *
 * 1. **No optional role could appear in any fused pattern.** `fetch … with
 *    {style}` and `toggle … for {duration}` were dropped in silence, at
 *    confidence 1.0, in every SOV/VSO language.
 * 2. **Fourteen of the seventy schemas declare no `patient` role at all** — the
 *    fused pattern bound their argument to `patient` regardless, so `fetch`'s
 *    required `source` was left unbound and the profile's `from`-marked group
 *    was free to swallow the next phrase instead.
 * 3. **The destination group was gated on the PROFILE, not the schema**, so a
 *    command with no destination role still got a `to {destination}` slot, and
 *    in a language whose destination marker collides with another role's the
 *    slot ate that role's phrase.
 *
 * Every `it` below is red on the pre-change tree, with the pre-change value
 * quoted in each block; together they are worth 38 (pattern, language) pairs on
 * the en→foreign render-fidelity gate, which is where the statistical version
 * of this lives. These pin the constructs, so a regression names the language
 * and the role rather than moving a percentage.
 */

import { describe, it, expect } from 'vitest';
import { parse, parseSemantic, translate } from '../src/index';
import type { CommandSemanticNode, SemanticNode } from '../src/types';

function walk(node: SemanticNode, visit: (n: SemanticNode) => void): void {
  visit(node);
  const rec = node as unknown as Record<string, unknown>;
  for (const key of ['body', 'thenBranch', 'elseBranch', 'commands', 'statements']) {
    const kids = rec[key];
    if (Array.isArray(kids)) kids.forEach(k => walk(k as SemanticNode, visit));
  }
}

/** The first command node with this action anywhere in the tree. */
function find(node: SemanticNode | null, action: string): CommandSemanticNode | null {
  if (!node) return null;
  let found: CommandSemanticNode | null = null;
  walk(node, n => {
    if (!found && (n as CommandSemanticNode).action === action) found = n as CommandSemanticNode;
  });
  return found;
}

function roundTrip(english: string, language: string, action: string): CommandSemanticNode | null {
  const rendered = translate(english, 'en', language);
  return find(parse(rendered, language), action);
}

function role(
  node: CommandSemanticNode | null,
  name: string
): { type?: string; value?: unknown; raw?: string } | undefined {
  return node?.roles.get(name as never) as
    | { type?: string; value?: unknown; raw?: string }
    | undefined;
}

const FETCH_WITH_OPTIONS = 'on submit fetch /api/form with method:"POST" body:form';
const TELL_SEQUENCE = 'on click tell #panel add .open then wait 200ms then add .visible';

describe('an optional role survives the fused pattern', () => {
  // `with {style}` is marker-guarded and shape-anchored (`valueShape: 'object'`),
  // so it is the cleanest of the appended slots. pl/ru/uk are the interesting
  // half: their `source` marker and their `style` marker are the SAME word
  // (pl `z`), so before the bound-role fix the spurious source group matched
  // `z { … }` first and the style vanished even once the slot existed.
  const FETCH_STYLE = ['he', 'id', 'pl', 'ru', 'uk'] as const;

  it.each(FETCH_STYLE)('%s keeps fetch.style through `on submit fetch … with …`', language => {
    const fetch = roundTrip(FETCH_WITH_OPTIONS, language, 'fetch');
    expect(fetch, `${language}: the rendered fetch handler did not re-parse`).not.toBeNull();
    expect(role(fetch, 'style'), `${language} dropped fetch.style`).toBeDefined();
  });

  it('vi keeps get.source as a property path, not the literal word "source"', () => {
    // Pre-change: `literal:"source"` — the placeholder name of the slot, because
    // the fused pattern bound the value to `patient` and the extraction rule for
    // `source` fell through to its own key.
    const get = roundTrip('on click get #input.value then log it', 'vi', 'get');
    expect(get, 'vi: the rendered get handler did not re-parse').not.toBeNull();
    expect(role(get, 'source')?.type).toBe('property-path');
    expect(role(get, 'source')?.value).not.toBe('source');
  });
});

describe('a schema with no `patient` role binds its own primary role', () => {
  // `tellSchema` declares `destination` as its ONE required role and no patient.
  // Pre-change every one of these bound the literal string `"destination"`
  // (bn: an implicit `me`) instead of the element the handler names.
  const TELL = ['bn', 'ms', 'th', 'tl', 'vi'] as const;

  it.each(TELL)('%s binds tell.destination to the named element', language => {
    const tell = roundTrip(TELL_SEQUENCE, language, 'tell');
    expect(tell, `${language}: the rendered tell handler did not re-parse`).not.toBeNull();
    expect(role(tell, 'destination'), `${language} lost tell.destination`).toMatchObject({
      type: 'selector',
      value: '#panel',
    });
  });

  // `fetchSchema` has no patient either; its URL is a REQUIRED `source`. Binding
  // it to `patient` left the profile's `from`-group free, and in pl/ru/uk that
  // marker (`z`/`с`) is also the `with` marker — so the OPTIONS OBJECT bound as
  // the source and the URL was carried under a role fetch does not declare.
  it.each(['pl', 'ru', 'uk'] as const)('%s binds the URL, not the options, to fetch.source', l => {
    const fetch = roundTrip(FETCH_WITH_OPTIONS, l, 'fetch');
    expect(fetch, `${l}: the rendered fetch handler did not re-parse`).not.toBeNull();
    expect(role(fetch, 'source'), `${l} bound the wrong value to fetch.source`).toMatchObject({
      value: '/api/form',
    });
    expect(fetch!.roles.has('patient' as never), `${l} fabricated fetch.patient`).toBe(false);
  });

  it('bn parses a native fetch handler rather than reading the URL as the verb', () => {
    // The native-surface half of the same defect: with the URL slot named
    // `patient` and marked with bn's patient particle, `"/api/data"` matched no
    // slot at all and the handler-body walk took the quoted string as the
    // command's own action. Pre-change the fetch node carried NO roles.
    const node = parseSemantic('ক্লিক তে "/api/data" আনুন', 'bn')?.node ?? null;
    expect(node).not.toBeNull();
    const fetch = find(node, 'fetch');
    expect(fetch, 'bn did not recover a fetch command').not.toBeNull();
    expect(role(fetch, 'source')).toMatchObject({ value: '/api/data' });
  });
});

describe('the destination slot is gated on the schema, not the profile', () => {
  // `incrementSchema` declares `patient` and `quantity` and NO destination.
  // ru/uk mark the destination with `в`/`на`/`к`, and `на` is exactly the
  // quantity marker the renderer emits — so the fabricated destination slot
  // matched `на 10`, the quantity was lost, and the parse reported a
  // `destination` role increment does not have.
  it.each(['ru', 'uk'] as const)('%s keeps increment.quantity', language => {
    const inc = roundTrip('on click increment #score by 10', language, 'increment');
    expect(inc, `${language}: the rendered increment handler did not re-parse`).not.toBeNull();
    expect(role(inc, 'quantity'), `${language} dropped increment.quantity`).toMatchObject({
      value: 10,
    });
    expect(inc!.roles.has('destination' as never), `${language} fabricated a destination`).toBe(
      false
    );
  });
});

describe('the appended slots do not cost the plain forms', () => {
  // The lever that makes an appended optional slot free is `valueShape`: an
  // UNCAPTURED shape-anchored slot stays out of `scoreRoleCoverage`'s
  // denominator. Without it, giving fetch a `[with {style}]` group drops a
  // plain fetch under the confidence bar at which core keeps the semantic
  // parse. This is the case that measured 1.0 → 0.692 when the same slot was
  // added to the handcrafted fetch patterns.
  it("es `buscar '/x' como json` still parses at confidence 1.0", () => {
    const result = parseSemantic("buscar '/x' como json", 'es');
    expect(result?.node?.metadata?.confidence).toBe(1);
  });

  it.each(['ar', 'bn', 'de', 'es', 'ja', 'ko', 'ru', 'tr', 'zh'] as const)(
    '%s still round-trips a plain `on click toggle .active`',
    language => {
      const toggle = roundTrip('on click toggle .active', language, 'toggle');
      expect(toggle, `${language}: plain toggle handler did not re-parse`).not.toBeNull();
      expect(role(toggle, 'patient'), `${language} dropped toggle.patient`).toMatchObject({
        value: '.active',
      });
    }
  );
});
