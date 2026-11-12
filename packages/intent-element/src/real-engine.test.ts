/**
 * `<lse-intent>` on the real engine with the real renderer (jsdom).
 *
 * index.test.ts stubs both, so it shows what the element decides and not what a
 * page gets. Every case here once went wrong with those tests green: a handler
 * that ran on connect, a body that lost `it`, a schema error that ran anyway.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { evaluate, everything, parse as engineParse, register } from '@hyperfixi/engine';
import { parse, render } from '@lokascript/semantic';
import { toProtocolJSON } from '@lokascript/intent';
import { LSEIntentElement } from './lse-intent.js';
import { intentRegistry } from './schema-registry.js';

const g = globalThis as Record<string, unknown>;
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
const sel = (value: string) => ({ type: 'selector', value });
const text = (value: string) => ({ type: 'literal', value, dataType: 'string' });

interface Mounted {
  el: LSEIntentElement;
  events: string[];
  scripts: string[];
  codes: () => string[];
}

async function mount(json: unknown, attrs: Record<string, string> = {}): Promise<Mounted> {
  document.body.innerHTML = '<div id="out"></div><div id="sidebar"></div>';
  const el = document.createElement('lse-intent') as LSEIntentElement;
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  const script = document.createElement('script');
  script.type = 'application/lse+json';
  script.textContent = JSON.stringify(json);
  el.appendChild(script);
  const events: string[] = [];
  const scripts: string[] = [];
  for (const type of ['lse:validated', 'lse:executed', 'lse:error']) {
    el.addEventListener(type, event => {
      events.push(type);
      const script = (event as CustomEvent<{ script?: string }>).detail.script;
      if (script) scripts.push(script);
    });
  }
  document.body.appendChild(el);
  await tick();
  return { el, events, scripts, codes: () => el.diagnostics.map(d => d.code) };
}

const out = () => document.getElementById('out')!;
const sidebar = () => document.getElementById('sidebar')!;
const toggle = {
  action: 'toggle',
  roles: { patient: sel('.active'), destination: sel('#sidebar') },
};
const onClick = (body: unknown[], extra: object = {}) => ({
  kind: 'event-handler',
  action: 'on',
  roles: { event: { type: 'literal', value: 'click' } },
  body,
  ...extra,
});

beforeAll(() => {
  if (!customElements.get('lse-intent')) customElements.define('lse-intent', LSEIntentElement);
  register(...everything);
  g['hyperfixi'] = { evaluate };
  LSEIntentElement.render = render as typeof LSEIntentElement.render;
});

afterEach(() => {
  intentRegistry.clear();
  delete g['pwned'];
});

describe('a handler runs on its event', () => {
  it('the verbose form waits for the event (it ran on connect)', async () => {
    const m = await mount(onClick([toggle]));
    expect(m.events).toEqual(['lse:validated']);
    expect(sidebar().className).toBe('');
    m.el.click();
    await tick();
    expect(sidebar().className).toBe('active');
    expect(m.scripts).toEqual(['toggle .active on #sidebar']);
  });

  it('what toProtocolJSON writes for a parsed handler runs the same way', async () => {
    const m = await mount(toProtocolJSON(parse('on click toggle .active on #sidebar', 'en')));
    expect(sidebar().className).toBe('');
    m.el.click();
    await tick();
    expect(sidebar().className).toBe('active');
  });

  it('once is honored (the compact form carries it)', async () => {
    const m = await mount({ ...toggle, trigger: { event: 'click', modifiers: { once: true } } });
    m.el.click();
    await tick();
    m.el.click();
    await tick();
    expect(sidebar().className).toBe('active');
    expect(m.events.filter(e => e === 'lse:executed')).toHaveLength(1);
  });

  it('a field the reader would skip is refused (the verbose form has no eventModifiers)', async () => {
    const m = await mount(onClick([toggle], { eventModifiers: { once: true } }));
    expect(m.events).toEqual(['lse:error']);
    expect(m.codes()).toEqual(['UNKNOWN_FIELD']);
  });

  it.each([
    ['debounce', { debounce: 200 }],
    ['throttle', { throttle: 200 }],
  ])('a %s modifier is refused, not dropped', async (_name, modifiers) => {
    const m = await mount({ ...toggle, trigger: { event: 'click', modifiers } });
    expect(m.events).toEqual(['lse:error']);
    expect(m.codes()).toEqual(['UNSUPPORTED_MODIFIER']);
    m.el.click();
    await tick();
    expect(sidebar().className).toBe('');
  });

  it('an event the element cannot listen for is refused', async () => {
    const m = await mount(
      onClick([toggle], { roles: { event: { type: 'literal', value: 'keyup[key is "Enter"]' } } })
    );
    expect(m.codes()).toEqual(['UNSUPPORTED_EVENT']);
  });

  it('the script sees the event', async () => {
    const m = await mount(
      onClick([
        {
          action: 'put',
          roles: { patient: { type: 'expression', raw: "event's type" }, destination: sel('#out') },
        },
      ])
    );
    m.el.click();
    await tick();
    expect(out().textContent).toBe('click');
  });

  it('an event name keeps its case', async () => {
    const m = await mount(toggle, { trigger: 'myEvent' });
    m.el.dispatchEvent(new CustomEvent('myEvent'));
    await tick();
    expect(sidebar().className).toBe('active');
  });
});

describe('a body is one script', () => {
  const getThenPut = [
    { action: 'get', roles: { source: { type: 'expression', raw: '1 + 2' } } },
    {
      action: 'put',
      roles: { patient: { type: 'reference', value: 'it' }, destination: sel('#out') },
    },
  ];

  it('`it` carries from one command of a handler body to the next (it wrote null)', async () => {
    const m = await mount(onClick(getThenPut));
    m.el.click();
    await tick();
    expect(out().textContent).toBe('3');
    expect(m.scripts).toEqual(['get 1 + 2 then put it into #out']);
  });

  it('a string in a branch stays a string', async () => {
    await mount({
      action: 'if',
      roles: { condition: { type: 'expression', raw: 'true' } },
      thenBranch: [{ action: 'put', roles: { patient: text('Hello'), destination: sel('#out') } }],
    });
    expect(out().textContent).toBe('Hello');
  });

  it('a handler inside another node is refused', async () => {
    const m = await mount({
      kind: 'compound',
      action: 'compound',
      chainType: 'then',
      statements: [toggle, onClick([toggle])],
    });
    expect(m.codes()).toEqual(['NESTED_HANDLER']);
    expect(sidebar().className).toBe('');
  });
});

describe('a refusal runs nothing', () => {
  it('a schema error', async () => {
    intentRegistry.register({
      action: 'toggle',
      description: '',
      roles: [
        { role: 'destination', required: true, description: '', expectedTypes: ['selector'] },
      ],
    } as Parameters<typeof intentRegistry.register>[0]);
    const m = await mount({ action: 'toggle', roles: { patient: sel('.active') } });
    expect(m.events).toEqual(['lse:error']);
    expect(m.codes()).toEqual(['MISSING_REQUIRED_ROLE']);
  });

  it("a script the engine rejects is an lse:error with the engine's message", async () => {
    const m = await mount({
      action: 'put',
      roles: { patient: { type: 'expression', raw: '1 +' } },
    });
    expect(m.events).toEqual(['lse:validated', 'lse:error']);
    expect(m.codes()).toEqual(['EXECUTION_ERROR']);
  });

  it('disabled: not on connect, and not by refresh()', async () => {
    const m = await mount(toggle, { disabled: '' });
    await m.el.refresh();
    expect(m.events).toEqual([]);
    expect(sidebar().className).toBe('');
  });

  it('the error marker is hidden again once a run succeeds', async () => {
    const m = await mount({ action: 'nope' }, { trigger: 'manual' });
    const marker = document.createElement('span');
    marker.setAttribute('slot', 'error');
    marker.style.display = 'none';
    m.el.appendChild(marker);
    await m.el.refresh();
    expect(marker.style.display).toBe('');
    m.el.querySelector('script')!.textContent = JSON.stringify(toggle);
    await m.el.refresh();
    expect(marker.style.display).toBe('none');
  });
});

describe('what would be lost is refused', () => {
  it('a role the renderer has no place for', async () => {
    const m = await mount({
      action: 'add',
      roles: { patient: sel('.a'), destination: sel('#sidebar'), colour: sel('.b') },
    });
    expect(m.events).toEqual(['lse:validated', 'lse:error']);
    expect(m.codes()).toEqual(['RENDER_DROPPED_VALUE']);
    expect(sidebar().className).toBe('');
  });

  it.each([
    ['a selector with no value', { type: 'selector' }],
    ['a literal that is an object', { type: 'literal', value: { a: 1 } }],
  ])('%s', async (_name, patient) => {
    const m = await mount({ action: 'add', roles: { patient } });
    expect(m.events).toEqual(['lse:error']);
    expect(m.codes()).toEqual(['INVALID_VALUE']);
  });

  it('an element with nothing to read says so', async () => {
    document.body.innerHTML = '';
    const el = document.createElement('lse-intent') as LSEIntentElement;
    const errors: string[] = [];
    el.addEventListener('lse:error', () => errors.push(...el.diagnostics.map(d => d.code)));
    document.body.appendChild(el);
    await tick();
    expect(errors).toEqual(['NO_INTENT']);
  });
});

describe('only the latest read counts', () => {
  const pending: Array<{ url: string; resolve: (json: unknown) => void }> = [];
  const fetchStub = (url: string, init: { signal: AbortSignal }) =>
    new Promise((resolve, reject) => {
      pending.push({ url, resolve: json => resolve({ ok: true, json: async () => json }) });
      init.signal.addEventListener('abort', () =>
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      );
    });

  it('src changed while a fetch is pending: the first answer is dropped', async () => {
    const realFetch = g['fetch'];
    g['fetch'] = fetchStub;
    try {
      document.body.innerHTML = '<div id="out"></div><div id="sidebar"></div>';
      const el = document.createElement('lse-intent') as LSEIntentElement;
      const events: string[] = [];
      for (const type of ['lse:validated', 'lse:executed', 'lse:error']) {
        el.addEventListener(type, () => events.push(type));
      }
      el.setAttribute('src', '/a.json');
      document.body.appendChild(el);
      await tick(5);
      el.setAttribute('src', '/b.json');
      await tick(5);
      expect(pending.map(p => p.url)).toEqual(['/a.json', '/b.json']);
      pending[0].resolve(toggle); // too late: aborted
      await tick();
      expect(events).toEqual([]);
      expect(sidebar().className).toBe('');
      pending[1].resolve({
        action: 'add',
        roles: { patient: sel('.b'), destination: sel('#sidebar') },
      });
      await tick();
      expect(events).toEqual(['lse:validated', 'lse:executed']);
      expect(sidebar().className).toBe('b');
    } finally {
      g['fetch'] = realFetch;
    }
  });

  it('two refresh() calls at once run the intent once', async () => {
    const m = await mount(toggle, { trigger: 'manual' });
    await Promise.all([m.el.refresh(), m.el.refresh()]);
    expect(m.events.filter(e => e === 'lse:executed')).toHaveLength(1);
    expect(sidebar().className).toBe('active');
  });
});

describe('the timeout is a bound on waiting, not a sandbox', () => {
  it('reports EXECUTION_TIMEOUT, and the script still finishes', async () => {
    const m = await mount(
      {
        kind: 'compound',
        action: 'compound',
        chainType: 'then',
        statements: [
          {
            action: 'wait',
            roles: { duration: { type: 'literal', value: '80ms', dataType: 'duration' } },
          },
          { action: 'add', roles: { patient: sel('.late'), destination: sel('#sidebar') } },
        ],
      },
      { timeout: '20' }
    );
    await tick(40);
    expect(m.codes()).toEqual(['EXECUTION_TIMEOUT']);
    await tick(120);
    expect(sidebar().className).toBe('late');
  });
});

describe('an allow list', () => {
  const allow = { allow: 'toggle add remove put' };

  it('runs a listed action with plain values', async () => {
    const m = await mount(toggle, allow);
    expect(m.events).toEqual(['lse:validated', 'lse:executed']);
    expect(sidebar().className).toBe('active');
  });

  it('an action is a name, even when the list holds something else', async () => {
    const action = 'toggle .a then call alert(1)';
    const m = await mount({ action, roles: {} }, { allow: `add,${action}` });
    expect(m.codes()).toContain('ACTION_NOT_ALLOWED');
  });

  it('refuses an action that is not listed, anywhere in the intent', async () => {
    const call = { action: 'call', roles: { patient: { type: 'reference', value: 'me' } } };
    for (const json of [call, onClick([toggle, call])]) {
      const m = await mount(json, allow);
      expect(m.codes()).toEqual(['ACTION_NOT_ALLOWED']);
    }
  });

  // Each of these ran a second command, or JavaScript, on the unrestricted path.
  it.each([
    [
      'a selector that carries more commands',
      {
        patient: sel('.a to #out then set window.pwned to 1 then add .b'),
        destination: sel('#sidebar'),
      },
    ],
    [
      'an expression',
      {
        patient: { type: 'expression', raw: '.a' },
        destination: { type: 'expression', raw: '(window.pwned = 1, #sidebar)' },
      },
    ],
    [
      'a reference that is not a name',
      {
        patient: sel('.a'),
        destination: { type: 'reference', value: 'me then set window.pwned to 1' },
      },
    ],
    [
      'a bare literal of several words',
      { patient: { type: 'literal', value: '.a to me then set window.pwned to 1' } },
    ],
    [
      'a bare literal typed as a duration',
      {
        patient: {
          type: 'literal',
          value: '.a to me then set window.pwned to 1',
          dataType: 'duration',
        },
      },
    ],
    [
      'an interpolated literal',
      {
        patient: {
          type: 'literal',
          value: '${window.pwned = 1}',
          dataType: 'string',
          interpolates: true,
        },
      },
    ],
    [
      'a property that is not a name',
      {
        patient: {
          type: 'property-path',
          object: { type: 'reference', value: 'me' },
          property: 'x then set window.pwned to 1',
        },
      },
    ],
    [
      'a string with a backslash',
      {
        patient: {
          type: 'literal',
          value: '\\\\" to me then set window.pwned to 1 --',
          dataType: 'string',
        },
      },
    ],
  ])('refuses %s', async (_name, roles) => {
    const m = await mount({ action: 'add', roles }, allow);
    expect(m.events).toEqual(['lse:error']);
    expect(m.codes()).toContain('VALUE_NOT_ALLOWED');
    expect(g['pwned']).toBeUndefined();
  });

  // A string is the one value of free text an allow list lets through: whatever
  // is in it, the engine must read the rendered script as ONE command holding it.
  it.each([
    'plain',
    'say "hi"',
    "it's",
    `both ' and "`,
    'x" then set window.pwned to 1 then log "',
    "x' then set window.pwned to 1 then log '",
    `x'" then set window.pwned to 1 --`,
    'line\nbreak',
    '`${window.pwned = 1}`',
    '$x ${window.pwned = 1}',
    '<img src=x onerror="window.pwned = 1">',
    'end then set window.pwned to 1',
  ])('a string stays one value: %j', async value => {
    const m = await mount(
      { action: 'put', roles: { patient: text(value), destination: sel('#out') } },
      { allow: 'put', trigger: 'manual' }
    );
    expect(m.events).toEqual(['lse:validated']);
    const script = render(m.el.node as Parameters<typeof render>[0], 'en');
    const parsed = engineParse(script);
    expect(parsed.kind).toBe('commands');
    const commands = (
      parsed as { commands: Array<{ type: string; value?: { type: string; value: unknown } }> }
    ).commands;
    expect(commands).toHaveLength(1);
    expect(commands[0].value).toMatchObject({ type: 'string', value });
  });
});
