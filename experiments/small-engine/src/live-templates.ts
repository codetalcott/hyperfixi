/**
 * Live templates: `<script type="text/hyperscript-template" live>` renders after itself and
 * re-renders when anything it read changes. The first render is inserted as it is; later
 * ones are morphed in, so the elements that stay keep their state and listeners.
 * Follows `initLiveTemplates` in upstream `parsetree/commands/template.js`.
 */
import { morphTo } from './commands/morph';
import { api } from './engine';
import type { Grammar } from './parser';
import { createEffect } from './reactivity';
import { dataOf, host, makeContext } from './runtime';
import { parseTemplate, runTemplate } from './templates';
import { isP, then1 } from './util';

/** Needs `render`, `reactivity` and the loop commands a template uses to be registered too. */
export function liveTemplates(g: Grammar): void {
  const seen = new WeakSet<Element>();

  api.addBeforeProcessHook(root => {
    for (const template of root.querySelectorAll(
      'script[type="text/hyperscript-template"][live]'
    )) {
      if (seen.has(template)) continue;
      seen.add(template);

      // The template's own script runs on the wrapper its output lives in.
      const source = template.textContent ?? '';
      const script = template.getAttribute('_') || template.getAttribute('data-script');
      template.removeAttribute('_');
      template.removeAttribute('data-script');
      const wrapper = document.createElement('div');
      wrapper.style.display = 'contents';
      wrapper.setAttribute('data-live-template', '');
      template.after(wrapper);
      if (script) {
        wrapper.setAttribute('_', script);
        host.process(wrapper);
      }

      const render = (): unknown => {
        let commands;
        try {
          commands = parseTemplate(g, source).commands;
        } catch (e) {
          console.error('live-template parse error:', e instanceof Error ? e.message : e);
          return '';
        }
        const ctx = makeContext(wrapper, undefined, wrapper, null);
        return runTemplate(commands, ctx, (html, loops) => {
          dataOf(wrapper).loops = loops;
          return html;
        });
      };

      let stamped = false;
      const stamp = (html: unknown): void => {
        if (isP(html)) return void html.then(stamp);
        if (stamped) return morphTo(wrapper, html);
        wrapper.innerHTML = String(html);
        host.process(wrapper);
        stamped = true;
      };

      queueMicrotask(() =>
        then1(render(), html => {
          stamp(html);
          createEffect(render, stamp, wrapper);
        })
      );
    }
  });
}
