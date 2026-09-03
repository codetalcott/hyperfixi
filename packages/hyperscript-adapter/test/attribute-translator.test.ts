import { describe, it, expect, vi } from 'vitest';
import { installAttributeTranslator, type HyperscriptHost } from '../src/attribute-translator';

// Same mock host surface as plugin.test.ts: addBeforeProcessHook is the
// public seam; process() simulates Runtime#processNode running every
// registered hook against the given root.
function createMockHyperscript(config: { attributes?: string } = {}) {
  const hooks: Array<(elt: Element) => void> = [];
  return {
    config,
    addBeforeProcessHook: vi.fn((fn: (elt: Element) => void) => {
      hooks.push(fn);
    }),
    process(root: Element) {
      hooks.forEach(fn => fn(root));
    },
  };
}

function mount(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

describe('installAttributeTranslator', () => {
  it('invokes translate once per element across repeated process passes', () => {
    const hs = createMockHyperscript();
    const translate = vi.fn(() => 'toggle .active');
    installAttributeTranslator(hs, translate);

    const container = mount('<button _="alternar .active"></button>');
    hs.process(container);
    hs.process(container); // e.g. a sibling swap re-scanning a shared ancestor
    expect(translate).toHaveBeenCalledTimes(1);
    expect(container.querySelector('button')!.getAttribute('_')).toBe('toggle .active');
    container.remove();
  });

  it('mutates no DOM beyond the script-attribute rewrite (no marker attributes)', () => {
    const hs = createMockHyperscript();
    installAttributeTranslator(hs, () => 'toggle .active');

    const container = mount('<button _="alternar .active" data-lang="es"></button>');
    const btn = container.querySelector('button')!;
    hs.process(container);

    expect(btn.getAttribute('_')).toBe('toggle .active');
    expect(btn.getAttributeNames().sort()).toEqual(['_', 'data-lang']);
    container.remove();
  });

  it('adds no attributes to untouched English elements either', () => {
    const hs = createMockHyperscript();
    // Identity translation — the element must come out byte-identical.
    installAttributeTranslator(hs, (src: string) => src);

    const container = mount('<button _="toggle .active"></button>');
    const btn = container.querySelector('button')!;
    hs.process(container);

    expect(btn.getAttributeNames()).toEqual(['_']);
    expect(container.innerHTML).toBe('<button _="toggle .active"></button>');
    container.remove();
  });

  it('rewrites <script type="text/hyperscript"> bodies without adding attributes', () => {
    const hs = createMockHyperscript();
    const translate = vi.fn(() => 'on click toggle .active');
    installAttributeTranslator(hs, translate);

    const container = mount('<script type="text/hyperscript">on click alternar .active</script>');
    const script = container.querySelector('script')!;
    hs.process(container);

    expect(script.textContent).toBe('on click toggle .active');
    expect(script.getAttributeNames()).toEqual(['type']);

    // Idempotency holds for script bodies too.
    hs.process(container);
    expect(translate).toHaveBeenCalledTimes(1);
    expect(script.textContent).toBe('on click toggle .active');
    container.remove();
  });

  it('re-processes NEW element instances after a serialize→reparse round-trip', () => {
    const hs = createMockHyperscript();
    const translate = vi.fn((src: string) => (src === 'alternar .active' ? 'toggle .active' : src));
    installAttributeTranslator(hs, translate);

    const container = mount('<button _="alternar .active"></button>');
    hs.process(container);
    expect(translate).toHaveBeenCalledTimes(1);

    // innerHTML round-trip discards the original element, so processed-set
    // membership is lost by design. The NEW element is re-processed — its
    // text is already English, so translation is an identity no-op.
    container.innerHTML = container.innerHTML;
    hs.process(container);
    expect(translate).toHaveBeenCalledTimes(2);
    expect(translate).toHaveBeenLastCalledWith('toggle .active', expect.anything());
    expect(container.querySelector('button')!.getAttribute('_')).toBe('toggle .active');
    container.remove();
  });

  it('honors custom config.attributes names', () => {
    const hs = createMockHyperscript({ attributes: 'data-script' });
    installAttributeTranslator(hs, () => 'toggle .active');

    const container = mount('<button data-script="alternar .active"></button>');
    hs.process(container);
    expect(container.querySelector('button')!.getAttribute('data-script')).toBe('toggle .active');
    container.remove();
  });

  it('warns and installs nothing on hosts without addBeforeProcessHook', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const host: HyperscriptHost = {}; // e.g. _hyperscript ≤ 0.9.14
    expect(() => installAttributeTranslator(host, src => src)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('addBeforeProcessHook'));
    warnSpy.mockRestore();
  });
});
