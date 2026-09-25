/**
 * `morph <target> to <content>` — upstream's spelling and upstream's result.
 *
 * Core's `morph` knew only its own `with`. `morph #list to it` discarded
 * `to it`, and `morph (#list) to it` only compiled because it was misread as a
 * method call that threw when it ran. Two more differences sat behind the
 * parse:
 *
 * - upstream's `closest` takes `to <el>` for itself (`closest <form/> to #b`),
 *   which is why it REJECTS `morph closest <form/> to it`, and core had no
 *   `closest … to` at all;
 * - upstream's morph MERGES a lone root element that has the target's tag
 *   (attributes and children), where core morphed children only. Fetching a
 *   `<ul id="list">` into `#list` nested a duplicate `#list` inside it.
 *
 * Every row was checked on hyperscript.org 0.9.93, and the morphs are run.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parse } from '../../../parser/parser';
import { hyperscript } from '../../../api/hyperscript-api';

type Cmd = { name: string; args: unknown[]; modifiers?: Record<string, unknown> };

function firstCommand(src: string): Cmd {
  const r = parse(src);
  expect(r.errors ?? [], src).toEqual([]);
  return (r.node as unknown as { commands: Cmd[] }).commands[0]!;
}

describe('parse', () => {
  it.each(['on click morph #list to it', 'on click morph (closest <form/>) to it'])(
    '`%s` fills the content slot',
    src => {
      const cmd = firstCommand(src);
      expect(cmd.name).toBe('morph');
      expect(cmd.args).toHaveLength(1);
      expect(cmd.modifiers?.with).toBeDefined();
    }
  );

  it('`to` and `with` build the same node', () => {
    const strip = (src: string) =>
      JSON.stringify(firstCommand(src), (k, v) =>
        ['start', 'end', 'line', 'column'].includes(k) ? undefined : v
      );
    expect(strip('on click morph #list to it')).toBe(strip('on click morph #list with it'));
  });

  it.each(['on click morph closest <form/> to it', 'on click morph #list'])(
    '`%s` is rejected — no content to morph into (upstream agrees)',
    src => {
      const r = parse(src);
      expect((r.errors ?? []).map(e => e.message)).toContain(
        "Expected 'to' and the content to morph into"
      );
    }
  );

  it('`closest <sel> to <el>` keeps its start element', () => {
    const cmd = firstCommand('on click log closest <form/> to #b');
    const call = cmd.args[0] as { callee: { name: string }; closestTo?: { value?: string } };
    expect(call.callee.name).toBe('closest');
    expect(call.closestTo?.value).toBe('#b');
  });
});

describe('runs', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<button id="btn"></button>' +
      '<form id="f" class="old"><input name="a" value="1"><span id="s">old</span></form>' +
      '<ul id="list"><li>a</li></ul>' +
      '<ul class="m"><li>1</li></ul><ul class="m"><li>2</li></ul>' +
      '<div class="box"><p><b id="deep"></b></p></div><div id="out"></div>';
  });
  const click = async (src: string) => {
    const btn = document.getElementById('btn')!;
    await hyperscript.eval(src, btn);
    btn.click();
    await new Promise(resolve => setTimeout(resolve, 20));
  };

  it('a lone same-tag root is MERGED — attributes too, and no nested duplicate', async () => {
    await click(`on click morph #list to '<ul id="list" class="x"><li>z</li></ul>'`);
    const list = document.getElementById('list')!;
    expect(list.className).toBe('x');
    expect(list.innerHTML).toBe('<li>z</li>');
    expect(document.querySelectorAll('#list')).toHaveLength(1);
  });

  it("a fetched form's attributes arrive (the corpus shape)", async () => {
    await click(
      `on click morph #f to '<form id="f" class="new"><input name="a" value="2"><span id="s">new</span></form>'`
    );
    const form = document.getElementById('f')!;
    expect(form.className).toBe('new');
    expect(document.getElementById('s')!.textContent).toBe('new');
  });

  it('children-only content morphs the children', async () => {
    await click(`on click morph #list to '<li>b</li><li>c</li>'`);
    expect(document.getElementById('list')!.innerHTML).toBe('<li>b</li><li>c</li>');
  });

  it('a root with another tag is morphed INTO the target', async () => {
    await click(`on click morph #list to '<div>d</div>'`);
    expect(document.getElementById('list')!.innerHTML).toBe('<div>d</div>');
  });

  it('every target merges its own copy', async () => {
    await click(`on click morph <ul.m/> to '<ul class="m n"><li>same</li></ul>'`);
    const lists = [...document.querySelectorAll('ul.m')];
    expect(lists).toHaveLength(2);
    for (const ul of lists) {
      expect(ul.className).toBe('m n');
      expect(ul.innerHTML).toBe('<li>same</li>');
    }
  });

  it('an ELEMENT as content is copied for each target, and the source survives', async () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="keep"><ul class="src"><li><b id="kept">s</b></li></ul></div>'
    );
    await click('on click morph <ul.m/> to the first <ul.src/>');
    const merged = [...document.querySelectorAll('ul.src')];
    expect(merged).toHaveLength(3);
    for (const ul of merged) expect(ul.textContent).toBe('s');
    // The source keeps its content — an id'd node is exactly what a morph
    // engine MOVES out of the new tree rather than copying.
    expect(document.getElementById('keep')!.textContent).toBe('s');
  });

  it('`closest <sel> to <el>` searches up from <el>', async () => {
    await click('on click put "found" into closest <div/> to #deep');
    expect(document.querySelector('.box')!.textContent).toBe('found');
  });
});
