/**
 * Three handler forms hyperfixi rejected or mis-parsed while upstream
 * `_hyperscript` (0.9.93) accepts them — found by round-tripping the
 * hyperscript in *Hypermedia Systems* (hxi18n Arc 4, filed as C1/C2/C4):
 *
 * - **C1, `from <source>` took ONE token.** `from the window` made the source
 *   `the` and `from closest <form/>` made it `closest`; the handler body after
 *   either was discarded ("Not a command"). `the` is now an article, and a
 *   positional source is parsed as an expression (`targetExpression`) that the
 *   runtime evaluates against the handler's element.
 * - **C2, an EVENT-named pseudo-command was not a command.** `click() me`,
 *   `submit() me`: the body loop took commands and identifiers only, and
 *   `click` is an event token. (`foo() me` always worked.) `the` is also now a
 *   pseudo-command article — `reset() the closest <form/>` dropped its target.
 * - **C4, `send`/`trigger` read every `on` as its target marker.** The book's
 *   abort button, `on click send htmx:abort to #contacts-btn on
 *   htmx:beforeRequest from #contacts-btn …`, parsed as two handlers with the
 *   second one's head swallowed into `send`'s arguments. After the target is
 *   taken, `on` opens the next handler, as upstream reads it.
 *
 * Shapes are asserted structurally and each form is also RUN, because
 * `success: true` is not evidence the handler does anything.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '../parser';
import { hyperscript } from '../../api/hyperscript-api';

interface Handler {
  type: string;
  event: string;
  target?: string;
  targetExpression?: { type: string };
  commands: Array<{ name: string }>;
}

function handlers(src: string): Handler[] {
  const r = parse(src);
  expect(r.success, `${src}: ${r.error?.message ?? ''}`).toBe(true);
  expect(r.errors ?? [], src).toEqual([]);
  const node = r.node as unknown as { type: string; statements?: Handler[] } & Handler;
  return node.type === 'Program' ? (node.statements ?? []) : [node];
}

const settle = () => new Promise(resolve => setTimeout(resolve, 20));

describe('C1: `from` takes an article and a positional source', () => {
  it.each([
    ['on keydown from the window focus me', 'window'],
    ['on click from the document log me', 'document'],
    ['on click from the #a log me', '#a'],
  ])('%s', (src, source) => {
    const [h] = handlers(src);
    expect(h.target).toBe(source);
    expect(h.targetExpression).toBeUndefined();
    expect(h.commands).toHaveLength(1);
  });

  it('a positional source is an expression, with its text kept in `target`', () => {
    const [h] = handlers('on submit from closest <form/> log me');
    expect(h.target).toBe('closest <form/>');
    expect(h.targetExpression?.type).toBe('callExpression');
    expect(h.commands.map(c => c.name)).toEqual(['log']);
  });

  it("the book's keyboard shortcut keeps its filter and its body", () => {
    const [h] = handlers("on keydown[altKey and code is 'KeyS'] from the window focus me");
    expect(h.target).toBe('window');
    expect(h.commands.map(c => c.name)).toEqual(['focus']);
  });

  describe('runs', () => {
    beforeEach(() => {
      document.body.innerHTML =
        '<form id="f"><button id="btn" type="button">b</button></form><div id="out"></div>';
    });
    const out = () => document.getElementById('out')!.textContent;

    it('`from closest <form/>` listens on the enclosing form', async () => {
      await hyperscript.eval(
        'on submit from closest <form/> put "submitted" into #out',
        document.getElementById('btn')!
      );
      document
        .getElementById('f')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await settle();
      expect(out()).toBe('submitted');
    });

    it('`from the window` listens on the window', async () => {
      await hyperscript.eval(
        'on keydown from the window put "key" into #out',
        document.getElementById('btn')!
      );
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      await settle();
      expect(out()).toBe('key');
    });
  });
});

describe('C2: an event-named method is a pseudo-command', () => {
  it.each(['on load click() me', 'on load submit() me', 'on click click() on me'])('%s', src => {
    const [h] = handlers(src);
    expect(h.commands.map(c => c.name)).toEqual(['pseudo-command']);
  });

  it('`the` introduces a pseudo-command target without being recorded', () => {
    for (const src of ['on click foo() the #x', 'on click reset() the closest <form/>']) {
      const [h] = handlers(src);
      expect(
        h.commands.map(c => c.name),
        src
      ).toEqual(['pseudo-command']);
    }
  });

  it('a spaced paren is not a call', () => {
    const r = parse('on load click () me');
    const node = r.node as unknown as Handler;
    expect(node.commands?.map(c => c.name) ?? []).not.toContain('pseudo-command');
  });

  describe('runs', () => {
    beforeEach(() => {
      document.body.innerHTML =
        '<form id="f"><input id="i" value="x"><button id="btn" type="button">b</button></form><div id="out"></div>';
    });

    it('`click() me` clicks the element', async () => {
      const btn = document.getElementById('btn')!;
      btn.addEventListener('click', () => {
        document.getElementById('out')!.textContent = 'clicked';
      });
      await hyperscript.eval('on ping click() me', btn);
      btn.dispatchEvent(new Event('ping'));
      await settle();
      expect(document.getElementById('out')!.textContent).toBe('clicked');
    });

    it('`reset() the closest <form/>` resets the form', async () => {
      const btn = document.getElementById('btn')!;
      await hyperscript.eval('on click reset() the closest <form/>', btn);
      (document.getElementById('i') as HTMLInputElement).value = 'changed';
      btn.click();
      await settle();
      expect((document.getElementById('i') as HTMLInputElement).value).toBe('x');
    });
  });
});

describe('C4: after its target, `on` ends send/trigger', () => {
  it("the book's abort button is three handlers", () => {
    const hs = handlers(
      'on click send htmx:abort to #contacts-btn ' +
        'on htmx:beforeRequest from #contacts-btn remove @disabled from me ' +
        'on htmx:afterRequest from #contacts-btn add @disabled to me'
    );
    expect(hs.map(h => [h.event, h.target ?? null, h.commands.map(c => c.name)])).toEqual([
      ['click', null, ['send']],
      ['htmx:beforeRequest', '#contacts-btn', ['remove']],
      ['htmx:afterRequest', '#contacts-btn', ['add']],
    ]);
  });

  it('trigger likewise', () => {
    const hs = handlers('on click trigger foo on #a on keyup log me');
    expect(hs.map(h => h.event)).toEqual(['click', 'keyup']);
  });

  it('with no target yet, `on <x>` is still the target (upstream reads it so)', () => {
    const hs = handlers('on click send foo on keyup log me');
    expect(hs).toHaveLength(1);
    expect(hs[0].commands.map(c => c.name)).toEqual(['send', 'log']);
  });

  it('the send reaches #contacts-btn', async () => {
    document.body.innerHTML =
      '<button id="btn">b</button><button id="contacts-btn">c</button><div id="out"></div>';
    document.getElementById('contacts-btn')!.addEventListener('htmx:abort', () => {
      document.getElementById('out')!.textContent = 'aborted';
    });
    const btn = document.getElementById('btn')!;
    await hyperscript.eval(
      'on click send htmx:abort to #contacts-btn on htmx:beforeRequest from #contacts-btn add .busy to me',
      btn
    );
    document.getElementById('contacts-btn')!.dispatchEvent(new Event('htmx:beforeRequest'));
    btn.click();
    await settle();
    expect(document.getElementById('out')!.textContent).toBe('aborted');
    expect(btn.classList.contains('busy')).toBe(true);
  });
});
