/**
 * append / prepend — role-shape coverage
 *
 * The schemas were narrower than the core commands they feed: `destination` was
 * required and typed [selector, reference], and `patient` omitted `reference`.
 * That made three documented core forms unparseable in ALL 24 languages:
 *
 *   append "x"                 → no destination (targets the implicit result)
 *   append it to #out          → reference patient
 *   append "x" to myArray      → bare-identifier destination
 *
 * The first is covered by `omitRoleVariants: ['destination']` rather than
 * `required: false`, which would have re-bound bare values by particle metadata
 * in marker languages and rewritten the fused SOV/VSO event patterns.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';

type Roles = Record<string, { type: string; value?: unknown; raw?: unknown }>;

function rolesOf(src: string, lang = 'en'): { action: string; roles: Roles } {
  const node = parse(src, lang) as unknown as {
    action: string;
    roles?: Map<string, { type: string; value?: unknown; raw?: unknown }>;
  };
  return {
    action: node.action,
    roles: node.roles ? (Object.fromEntries(node.roles) as Roles) : {},
  };
}

for (const cmd of ['append', 'prepend'] as const) {
  describe(`${cmd} — role shapes (en)`, () => {
    it('parses the full form', () => {
      const { action, roles } = rolesOf(`${cmd} "x" to #output`);
      expect(action).toBe(cmd);
      expect(roles.patient).toMatchObject({ type: 'literal', value: 'x' });
      expect(roles.destination).toMatchObject({ type: 'selector', value: '#output' });
    });

    it('parses with NO destination (implicit result target)', () => {
      const { action, roles } = rolesOf(`${cmd} "x"`);
      expect(action).toBe(cmd);
      expect(roles.patient).toMatchObject({ type: 'literal', value: 'x' });
      expect(roles.destination).toBeUndefined();
    });

    it('accepts a context reference as patient', () => {
      const { action, roles } = rolesOf(`${cmd} it to #output`);
      expect(action).toBe(cmd);
      expect(roles.patient).toMatchObject({ type: 'reference' });
      expect(roles.destination).toMatchObject({ type: 'selector', value: '#output' });
    });

    it('accepts a bare identifier as destination', () => {
      const { action, roles } = rolesOf(`${cmd} "x" to myArray`);
      expect(action).toBe(cmd);
      expect(roles.patient).toMatchObject({ type: 'literal', value: 'x' });
      expect(roles.destination).toBeDefined();
      expect(roles.destination.type).not.toBe('selector');
    });

    it('accepts an identifier patient with a selector destination', () => {
      const { action, roles } = rolesOf(`${cmd} newItem to #output`);
      expect(action).toBe(cmd);
      expect(roles.patient).toBeDefined();
      expect(roles.destination).toMatchObject({ type: 'selector', value: '#output' });
    });

    it('still resolves `me` as a reference destination', () => {
      const { action, roles } = rolesOf(`${cmd} "x" to me`);
      expect(action).toBe(cmd);
      expect(roles.destination).toMatchObject({ type: 'reference', value: 'me' });
    });
  });
}

describe('append/prepend — priority languages keep the full form', () => {
  // SOV languages front the roles; SVO/VSO put the verb first.
  const CASES: Array<[string, string, string]> = [
    ['es', 'anexar "x" en #output', 'append'],
    ['ja', '#output に "x" を 末尾追加', 'append'],
    ['ar', 'ألحق "x" على #output', 'append'],
    ['ko', '#output 에 "x" 을 덧붙이다', 'append'],
    ['es', 'anteponer "x" en #output', 'prepend'],
    ['ja', '#output に "x" を 先頭追加', 'prepend'],
    ['ko', '#output 에 "x" 을 앞에추가', 'prepend'],
  ];

  for (const [lang, src, expected] of CASES) {
    it(`${lang}: ${src} → ${expected}`, () => {
      const { action, roles } = rolesOf(src, lang);
      expect(action).toBe(expected);
      expect(roles.patient).toMatchObject({ type: 'literal', value: 'x' });
      expect(roles.destination).toMatchObject({ type: 'selector', value: '#output' });
    });
  }
});
