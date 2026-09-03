/**
 * Agent-loop benchmark — the task corpus.
 *
 * Twenty natural-language UI requests, phrased the way a user would put them to
 * an agent (no hyperscript syntax leaks into a prompt — that would hand the
 * generator the answer). Each carries a reference implementation whose jsdom
 * effect signature defines "behaviorally correct" for that task.
 *
 * Eligibility bar, same as R2's execution subset: a task is only usable if its
 * reference PARSES and produces a NON-EMPTY effect signature in the current
 * runtime. `cli.ts verify-references` enforces both, so a task whose reference
 * rots (or whose fixture stops matching) fails loudly rather than scoring every
 * candidate against an empty signature — which would make wrong answers look
 * right.
 *
 * Seeded from the concepts in the gallery examples and the patterns corpus, but
 * deliberately NOT copied from them verbatim: the corpus text is what the
 * pattern database (and therefore `search_patterns`) already contains, so
 * reusing it would measure recall of the corpus rather than generation.
 */

/** Trigger to dispatch after the handler is installed. */
export interface BenchTrigger {
  event: string;
  /** Element to dispatch on (default `#btn`). */
  selector?: string;
  /** CustomEvent detail; when set, a CustomEvent is dispatched instead of Event. */
  detail?: unknown;
}

export interface BenchTask {
  id: string;
  /** The request as a user would phrase it. No hyperscript in here. */
  prompt: string;
  /** Known-good hyperscript satisfying the prompt; defines the target behavior. */
  reference: string;
  /** Markup appended inside <body>, after the shared button. */
  fixture: string;
  /** Fixture preconditions applied before the handler is installed. */
  setup?: (doc: Document) => void;
  /** Defaults to a bubbling `click` on `#btn`. */
  trigger?: BenchTrigger;
  /** What the task probes — used to group the report. */
  tags: readonly string[];
}

/** Present in every fixture; the default trigger target. */
export const SHARED_FIXTURE = '<div class="card"><button id="btn">Click</button></div>';

export const TASKS: readonly BenchTask[] = [
  {
    id: 'toggle-self-class',
    prompt: 'When the button is clicked, toggle the CSS class "active" on the button itself.',
    reference: 'on click toggle .active on me',
    fixture: '',
    tags: ['toggle', 'self-reference'],
  },
  {
    id: 'toggle-other-class',
    prompt:
      'When the button is clicked, toggle the CSS class "open" on the element whose id is "panel".',
    reference: 'on click toggle .open on #panel',
    fixture: '<div id="panel">panel</div>',
    tags: ['toggle', 'destination'],
  },
  {
    id: 'add-class-other',
    prompt:
      'When the button is clicked, add the CSS class "highlight" to the element whose id is "item".',
    reference: 'on click add .highlight to #item',
    fixture: '<div id="item">item</div>',
    tags: ['add', 'destination'],
  },
  {
    id: 'remove-class-all',
    prompt:
      'When the button is clicked, remove the CSS class "active" from every element that has the class "row".',
    reference: 'on click remove .active from .row',
    fixture: '<div class="row active">a</div><div class="row active">b</div>',
    tags: ['remove', 'multi-target'],
  },
  {
    id: 'put-text',
    prompt:
      'When the button is clicked, replace the contents of the element with id "output" with the text Saved.',
    reference: 'on click put "Saved" into #output',
    fixture: '<div id="output">old</div>',
    tags: ['put', 'literal'],
  },
  {
    id: 'hide-element',
    prompt: 'When the button is clicked, hide the element whose id is "menu".',
    reference: 'on click hide #menu',
    fixture: '<div id="menu">menu</div>',
    tags: ['hide'],
  },
  {
    id: 'show-element',
    prompt: 'When the button is clicked, make the hidden element with id "modal" visible again.',
    reference: 'on click show #modal',
    fixture: '<div id="modal" style="display: none">modal</div>',
    tags: ['show'],
  },
  {
    id: 'two-commands',
    prompt:
      'When the button is clicked, add the class "busy" to the button and also put the text Loading into the element with id "output".',
    reference: 'on click add .busy to me then put "Loading" into #output',
    fixture: '<div id="output">idle</div>',
    tags: ['sequence', 'multi-command'],
  },
  {
    id: 'closest-ancestor',
    prompt:
      'When the button is clicked, add the class "selected" to the nearest enclosing element that has the class "card".',
    reference: 'on click add .selected to closest .card',
    fixture: '',
    tags: ['add', 'positional', 'closest'],
  },
  {
    id: 'remove-element',
    prompt: 'When the button is clicked, delete the element with id "item" from the page.',
    reference: 'on click remove #item',
    fixture: '<div id="item">doomed</div>',
    tags: ['remove', 'element-removal'],
  },
  {
    id: 'toggle-attribute',
    prompt:
      'When the button is clicked, toggle the "hidden" attribute on the element with id "message".',
    reference: 'on click toggle @hidden on #message',
    fixture: '<div id="message">msg</div>',
    tags: ['toggle', 'attribute'],
  },
  {
    id: 'set-attribute',
    prompt:
      'When the button is clicked, set the aria-expanded attribute of the element with id "panel" to true.',
    // NB: `set @aria-expanded of #panel to "true"` — the phrasing an LLM reaches
    // for first — parses clean and does NOTHING. The possessive form is the one
    // that works. See runs/README findings.
    reference: 'on click set #panel\'s @aria-expanded to "true"',
    fixture: '<div id="panel" aria-expanded="false">panel</div>',
    tags: ['set', 'attribute'],
  },
  {
    id: 'set-style',
    prompt:
      'When the button is clicked, change the inline background colour of the element with id "swatch" to red.',
    reference: 'on click set *background-color of #swatch to "red"',
    fixture: '<div id="swatch">swatch</div>',
    tags: ['set', 'style'],
  },
  {
    id: 'set-inner-html',
    prompt:
      'When the button is clicked, set the innerHTML of the element with id "output" to the text Done.',
    reference: 'on click set #output\'s innerHTML to "Done"',
    fixture: '<div id="output">old</div>',
    tags: ['set', 'possessive', 'property'],
  },
  {
    id: 'add-class-multiple',
    prompt:
      'When the button is clicked, add the class "done" to every element that has the class "todo".',
    reference: 'on click add .done to .todo',
    fixture: '<li class="todo">a</li><li class="todo">b</li>',
    tags: ['add', 'multi-target'],
  },
  {
    id: 'mouseenter-hover',
    prompt: 'When the mouse pointer enters the button, add the class "hover" to it.',
    reference: 'on mouseenter add .hover to me',
    fixture: '',
    trigger: { event: 'mouseenter' },
    tags: ['event', 'non-click-trigger'],
  },
  {
    id: 'tabs-switch',
    prompt:
      'When the button is clicked, remove the class "active" from all elements with class "tab", then add that class to the element with id "tab2".',
    reference: 'on click remove .active from .tab then add .active to #tab2',
    fixture: '<div class="tab active" id="tab1">1</div><div class="tab" id="tab2">2</div>',
    tags: ['sequence', 'multi-target', 'multi-command'],
  },
  {
    id: 'conditional-class',
    prompt:
      'When the button is clicked, add the class "warned" to the element with id "box" only if that element already has the class "danger".',
    reference: 'on click if #box matches .danger add .warned to #box end',
    fixture: '<div id="box" class="danger">box</div>',
    tags: ['conditional', 'if'],
  },
  {
    id: 'custom-event',
    prompt:
      'When the button receives a custom event named "refresh", put the text Refreshed into the element with id "output".',
    reference: 'on refresh put "Refreshed" into #output',
    fixture: '<div id="output">stale</div>',
    trigger: { event: 'refresh' },
    tags: ['event', 'custom-event'],
  },
  {
    id: 'add-to-body',
    prompt: 'When the button is clicked, add the class "modal-open" to the page body.',
    reference: 'on click add .modal-open to body',
    fixture: '',
    tags: ['add', 'body-target'],
  },
] as const;

export function taskById(id: string): BenchTask | undefined {
  return TASKS.find(t => t.id === id);
}
