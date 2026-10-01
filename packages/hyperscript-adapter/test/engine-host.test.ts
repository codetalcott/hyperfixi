/**
 * The plugin on `@hyperfixi/engine`: a host that offers `addSourceTransform`
 * (see attribute-translator.ts). The real engine and the real plugin, no mocks.
 * On this host a translated script runs AND the element keeps the text its
 * author wrote; on _hyperscript.org the attribute has to be rewritten instead
 * (test/browser/adapter.spec.ts covers that host).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { api, everything, register } from '@hyperfixi/engine';
import { parseSemantic, render } from '@lokascript/semantic';
import { hyperscriptI18n } from '../src/plugin';

const ENGLISH = 'on click toggle .active';
const click = (elt: Element) => elt.dispatchEvent(new MouseEvent('click', { bubbles: true }));

describe('the plugin on @hyperfixi/engine', () => {
  beforeAll(() => {
    register(...everything);
    api.use(hyperscriptI18n());
  });

  it('is installed through the source transform, not the process hook', () => {
    expect(typeof api.addSourceTransform).toBe('function');
  });

  it.each(['es', 'ja', 'ar', 'ko', 'tr', 'de'])(
    '%s: the script runs and the attribute stays as written',
    language => {
      const node = parseSemantic(ENGLISH, 'en').node;
      expect(node).toBeTruthy();
      const written = render(node!, language);
      expect(written).not.toBe(ENGLISH);

      document.body.innerHTML = `<button lang="${language}"></button>`;
      const button = document.body.firstElementChild!;
      button.setAttribute('_', written);
      api.processNode(document.body);

      click(button);
      expect(button.classList.contains('active')).toBe(true);
      // A second pass must not install a second handler.
      api.processNode(document.body);
      click(button);
      expect(button.classList.contains('active')).toBe(false);
      expect(button.getAttribute('_')).toBe(written);
    }
  );

  it('a parse error in a rewritten script names what was written', () => {
    api.addSourceTransform(source => (source === 'pulsar' ? 'on click toggle' : null));
    let written: unknown;
    document.body.addEventListener('hyperscript:parse-error', event => {
      const errors: unknown = Reflect.get(Object(Reflect.get(event, 'detail')), 'errors');
      written = Array.isArray(errors) ? Reflect.get(Object(errors[0]), 'written') : undefined;
    });
    document.body.innerHTML = '<button _="pulsar"></button>';
    api.processNode(document.body);
    expect(written).toBe('pulsar');
  });
});
