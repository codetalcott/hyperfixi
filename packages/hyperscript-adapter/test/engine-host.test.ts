/**
 * The plugin on `@hyperfixi/engine`: a host that offers `addSourceTransform`
 * (see attribute-translator.ts). The real engine and the real plugin, no mocks.
 * On this host a translated script runs AND the element keeps the text its
 * author wrote; on _hyperscript.org the attribute has to be rewritten instead
 * (test/browser/adapter.spec.ts covers that host).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
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

  // Upstream's own block, read in every language (was OPEN_ITEMS D6): its head
  // keeps `view transition` in English, with the language's own `start` (M2 sheet
  // B6). Until the reader knew it, the block parsed as a `transition` of the
  // body's verb and the body was lost.
  it.each(['es', 'ja'])("%s: upstream's view transition block runs in one", async language => {
    const english =
      "on click start view transition put 'B' into #a then add .moved to #a end then add .after to #a";
    const written = render(parseSemantic(english, 'en').node!, language);
    expect(written).toContain(language === 'ja' ? 'view transition 開始' : 'comenzar view transition');

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

  // A behavior's handlers need no `end` of their own: upstream ends a handler's
  // commands at the next feature. Until the behavior parser split them there, the
  // handlers merged and English wrote `behavior F then add .a then …`, which the
  // engine rejects, so the behavior was never defined.
  it.each([
    ['es', 'comportamiento F al clic agregar .a al tecla arriba agregar .b fin'],
    ['ja', '振る舞い F クリック を で .a を 追加 キーアップ を で .b を 追加 終わり'],
  ])('%s: a behavior whose handlers have no end runs both', (language, written) => {
    document.body.innerHTML = `<div lang="${language}"></div><button _="install F"></button>`;
    document.body.firstElementChild!.setAttribute('_', written);
    api.processNode(document.body);
    const button = document.querySelector('button')!;
    click(button);
    button.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    expect([...button.classList]).toEqual(['a', 'b']);
  });

  // The same at top level, in each language's own head (was OPEN_ITEMS P47):
  // the `when` word (de, fr, qu), a circumfix (zh), words after the event (ko, tr).
  it.each([
    ['de', 'wenn klick hinzufügen .a wenn keyup hinzufügen .b'],
    ['fr', 'quand clic ajouter .a quand touche haut ajouter .b'],
    ['zh', '一 点击 就 添加 把 .a 一 keyup 就 添加 把 .b'],
    ['ko', '클릭 할 때 .a 을 추가 키업 할 때 .b 을 추가'],
    ['qu', 'maykama click .a ta yapay maykama llave hawa .b ta yapay'],
    ['tr', 'tıklama i üzerinde .a i ekle keyup i üzerinde .b i ekle'],
  ])('%s: two handlers written without their ends both run', (language, written) => {
    document.body.innerHTML = `<button lang="${language}"></button>`;
    const button = document.querySelector('button')!;
    button.setAttribute('_', written);
    api.processNode(document.body);
    click(button);
    expect([...button.classList]).toEqual(['a']);
    button.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    expect([...button.classList]).toEqual(['a', 'b']);
  });

  // hi `पर` also marks a destination, so the second head may be one: the adapter
  // does not run that reading (it ran `add .a to keyup` before P47), and the
  // engine reports the script as written.
  it('hi: two handlers written without their ends are reported, not run', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      document.body.innerHTML = '<button lang="hi"></button>';
      const button = document.querySelector('button')!;
      button.setAttribute('_', 'click पर .a को जोड़ें keyup पर .b को जोड़ें');
      api.processNode(document.body);
      click(button);
      button.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      expect([...button.classList]).toEqual([]);
      // The engine's verdict on the Hindi text, not a runtime error in a translation.
      expect(errors.mock.calls.flat().map(String).join(' ')).toMatch(/Unknown token/);
    } finally {
      errors.mockRestore();
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
