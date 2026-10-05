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

  // Core's view-transition tail reads in every language; the host gets upstream's
  // block (semantic's upstream-spelling). Until 4.0.1 it got the tail back, which
  // the engine rejects, so the script did not run at all.
  it.each(['es', 'ja'])(
    '%s: a swap written with the view-transition tail runs in one',
    async language => {
      const english = "on click swap #a's textContent with #b's textContent using view transition";
      const written = render(parseSemantic(english, 'en').node!, language);
      expect(written).toContain('using view transition');

      let started = 0;
      const transitions = (update: () => Promise<void>) => {
        started++;
        const done = Promise.resolve().then(update);
        return { finished: done, updateCallbackDone: done, ready: done, skipTransition() {} };
      };
      Reflect.set(document, 'startViewTransition', transitions);
      try {
        document.body.innerHTML = `<p id="a">A</p><p id="b">B</p><button lang="${language}"></button>`;
        const button = document.querySelector('button')!;
        button.setAttribute('_', written);
        api.processNode(document.body);
        click(button);
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(started).toBe(1);
        expect(document.getElementById('a')!.textContent).toBe('B');
        expect(document.getElementById('b')!.textContent).toBe('A');
      } finally {
        Reflect.deleteProperty(document, 'startViewTransition');
      }
    }
  );

  // Upstream's own block, read in every language (was OPEN_ITEMS D6): its head is
  // the same English words in all 24. Until the reader knew it, the block parsed
  // as a `transition` of the body's verb and the body was lost.
  it.each(['es', 'ja'])("%s: upstream's view transition block runs in one", async language => {
    const english =
      "on click start view transition put 'B' into #a then add .moved to #a end then add .after to #a";
    const written = render(parseSemantic(english, 'en').node!, language);
    expect(written).toContain('start view transition');

    let started = 0;
    const transitions = (update: () => Promise<void>) => {
      started++;
      const done = Promise.resolve().then(update);
      return { finished: done, updateCallbackDone: done, ready: done, skipTransition() {} };
    };
    Reflect.set(document, 'startViewTransition', transitions);
    try {
      document.body.innerHTML = `<p id="a">A</p><button lang="${language}"></button>`;
      const button = document.querySelector('button')!;
      button.setAttribute('_', written);
      api.processNode(document.body);
      click(button);
      await new Promise(resolve => setTimeout(resolve, 20));
      const a = document.getElementById('a')!;
      expect(started).toBe(1);
      expect(a.textContent).toBe('B');
      expect([...a.classList]).toEqual(['moved', 'after']);
    } finally {
      Reflect.deleteProperty(document, 'startViewTransition');
    }
  });

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
