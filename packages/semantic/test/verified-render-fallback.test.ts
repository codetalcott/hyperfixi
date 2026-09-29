/**
 * The verified render's last choice (`explicit/verified-render.ts`): where
 * neither the plain render nor the parenthesized one reads as the source, the
 * plain one. No render in the corpus or the value matrix takes this branch
 * (PR 110 fixed the de chain that did), so the reading check is replaced here:
 * with nothing reading, a colliding variable keeps its plain spelling. The
 * modules load fresh, after the mock: the setup file has loaded the real ones.
 */
import { describe, it, expect, vi } from 'vitest';

vi.resetModules();
vi.doMock('../src/name-collisions', async importOriginal => ({
  ...(await importOriginal<typeof import('../src/name-collisions')>()),
  readsAs: () => false,
}));
await import('../src/languages/_all');
const { parse, render, semanticRenderer } = await import('../src/index');

describe('where neither render reads, the plain one', () => {
  it.each([
    ['on click set x to si + 1 then put x into #out', 'es'],
    ['on click set ist to 2 then put ist + 1 into #out', 'de'],
  ])('%s (%s)', (source, language) => {
    const node = parse(source, 'en')!;
    const plain = semanticRenderer.render(node, language);
    expect(render(node, language)).toBe(plain);
  });

  it('and the parenthesized render differs there', async () => {
    const { parenthesizeCollidingNames } = await import('../src/name-collisions');
    expect(parenthesizeCollidingNames('si + 1', 'es')).toBe('(si) + 1');
  });
});
