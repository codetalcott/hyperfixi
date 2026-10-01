/**
 * `morph <target> to <content>`: change an element's tree into another, keeping the
 * nodes that can be kept, so identity, focus and listeners survive.
 *
 * The algorithm follows upstream `core/runtime/morph.js` (itself the htmx 4 morph by
 * Michael West). Nodes are matched by id first, then by shape; a node with an id that
 * appears on both sides is moved rather than rebuilt.
 */
import type { Cmd, Expr } from '../ast';
import { cleanup, processNode } from '../engine';
import { expr } from '../expressions';
import type { Grammar } from '../parser';
import { implicitLoop } from '../runtime';
import { all, fn, get } from '../util';

type Parent = Element | DocumentFragment;

interface Morphing {
  target: Element;
  /** Element → the persistent ids inside it (itself included). */
  ids: Map<Node, Set<string>>;
  /** Ids present, once and on the same tag, in both the old tree and the new. */
  persistent: Set<string>;
  /** Where nodes with a persistent id wait until their place in the new tree comes up. */
  pantry: Element;
  futureMatches: WeakSet<Node>;
}

/** Morph `old` to match `content`: an HTML string, an element or a fragment. */
export function morphTo(old: Element, content: unknown): void {
  let fragment: Parent;
  if (typeof content === 'string') {
    const template = document.createElement('template');
    template.innerHTML = content;
    fragment = template.content;
  } else if (content instanceof DocumentFragment) fragment = content;
  else if (content instanceof Element) {
    fragment = document.createDocumentFragment();
    fragment.append(content.cloneNode(true));
  } else throw new Error('morph requires an HTML string, element, or document fragment');

  // A single root of the target's own tag is the target itself: sync attributes, morph children.
  const root = fragment.firstElementChild;
  if (root && !root.nextElementSibling && root.tagName === old.tagName) {
    copyAttributes(old, root);
    fragment = root;
  }

  const oldWithIds = [...(old.matches('[id]') ? [old] : []), ...old.querySelectorAll('[id]')];
  const newWithIds = [...fragment.querySelectorAll('[id]')];
  const persistent = persistentIds(oldWithIds, newWithIds);
  const ids = new Map<Node, Set<string>>();
  mapIds(ids, persistent, old.parentElement, oldWithIds);
  mapIds(ids, persistent, fragment, newWithIds);

  const pantry = document.createElement('div');
  pantry.hidden = true;
  (document.body ?? old.parentElement)?.after(pantry);
  morphChildren(
    { target: old, ids, persistent, pantry, futureMatches: new WeakSet() },
    old,
    fragment
  );
  // Whatever is still waiting has no place in the new tree.
  cleanup(pantry);
  pantry.remove();
}

function morphChildren(m: Morphing, oldParent: Parent, newParent: Parent): void {
  if (oldParent instanceof HTMLTemplateElement && newParent instanceof HTMLTemplateElement) {
    oldParent = oldParent.content;
    newParent = newParent.content;
  }
  let at = oldParent.firstChild;
  let next = newParent.firstChild;
  while (next) {
    const incoming: ChildNode = next;
    let match = at && bestMatch(m, incoming, at);
    if (match && match !== at) {
      // Clear the way to the match: keep what is needed later, drop the rest.
      for (let cursor: ChildNode | null = at; cursor && cursor !== match;) {
        const passed: ChildNode = cursor;
        cursor = cursor.nextSibling;
        if (passed instanceof Element && (m.ids.has(passed) || matchesLater(m, passed, incoming))) {
          moveBefore(oldParent, passed, null);
        } else discard(m, passed);
      }
    }

    if (!match && incoming instanceof Element && m.persistent.has(incoming.id)) {
      const selector = `[id="${CSS.escape(incoming.id)}"]`;
      const found =
        m.target.id === incoming.id
          ? m.target
          : (m.target.querySelector(selector) ?? m.pantry.querySelector(selector));
      if (found) {
        // It is leaving its ancestors: they no longer hold this id.
        for (let up = found.parentNode; up; up = up.parentNode) {
          const held = m.ids.get(up);
          held?.delete(found.id);
          if (held?.size === 0) m.ids.delete(up);
        }
        moveBefore(oldParent, found, at);
        match = found;
      }
    }

    next = incoming.nextSibling;
    if (match && incoming instanceof Element) {
      morphNode(m, match, incoming);
      at = match.nextSibling;
    } else if (incoming instanceof Element && m.ids.has(incoming)) {
      // It holds ids that already exist: build it in place, so those nodes are moved in.
      const placeholder = document.createElement(incoming.tagName);
      oldParent.insertBefore(placeholder, at);
      morphNode(m, placeholder, incoming);
      at = placeholder.nextSibling;
    } else {
      oldParent.insertBefore(incoming, at);
      if (incoming instanceof Element) processNode(incoming);
      at = incoming.nextSibling;
    }
  }
  while (at) {
    const extra: ChildNode = at;
    at = at.nextSibling;
    discard(m, extra);
  }
}

function morphNode(m: Morphing, old: Node, incoming: Element): void {
  if (!(old instanceof Element)) return;
  copyAttributes(old, incoming);
  if (
    old instanceof HTMLTextAreaElement &&
    incoming instanceof HTMLTextAreaElement &&
    old.defaultValue !== incoming.defaultValue
  ) {
    old.value = incoming.value;
  }
  if (
    !old.isEqualNode(incoming) ||
    incoming.tagName === 'TEMPLATE' ||
    incoming.querySelector('template')
  ) {
    morphChildren(m, old, incoming);
  }
  processNode(old);
}

/** The existing node, from `start` on, that `node` should become. */
function bestMatch(m: Morphing, node: Node, start: ChildNode): ChildNode | null {
  if (!(node instanceof Element)) return null;
  const wanted = m.ids.get(node);
  const wantedCount = wanted?.size ?? 0;
  if (node.id && !wanted) return null;
  let soft: ChildNode | null = null;
  let displaced = 0;
  let scan = 10;
  for (let cursor: ChildNode | null = start; cursor; cursor = cursor.nextSibling) {
    const held = m.ids.get(cursor);
    if (softMatch(cursor, node)) {
      if (held && wanted && [...held].some(id => wanted.has(id))) return cursor;
      if (!held) {
        if (scan > 0 && cursor.isEqualNode(node)) return cursor;
        soft ??= cursor;
      }
    }
    // Stop before passing over more kept ids than this node would bring.
    displaced += held?.size ?? 0;
    if (displaced > wantedCount) break;
    if (cursor.contains(document.activeElement)) break;
    if (--scan < 1 && wantedCount === 0) break;
  }
  return soft && matchesLater(m, soft, node) ? null : soft;
}

/** Is `old` an exact copy of one of the next few incoming siblings? Then leave it for that one. */
function matchesLater(m: Morphing, old: Node, from: Node): boolean {
  if (m.futureMatches.has(old)) return true;
  let sibling = from.nextSibling;
  for (let i = 0; sibling && i < 10; sibling = sibling.nextSibling, i++) {
    if (sibling instanceof Element && old.isEqualNode(sibling)) {
      m.futureMatches.add(old);
      return true;
    }
  }
  return false;
}

function discard(m: Morphing, node: ChildNode): void {
  if (m.ids.has(node)) moveBefore(m.pantry, node, null);
  else {
    if (node instanceof Element) cleanup(node);
    node.remove();
  }
}

/** `moveBefore` keeps an element's state (focus, a playing video) where the browser has it. */
function moveBefore(parent: Node, node: Node, before: Node | null): void {
  const move = get(parent, 'moveBefore');
  if (fn(move)) {
    try {
      Reflect.apply(move, parent, [node, before]);
      return;
    } catch {
      // Not movable this way (a different document, say): insert instead.
    }
  }
  parent.insertBefore(node, before);
}

function copyAttributes(to: Element, from: Element): void {
  for (const { name, value } of from.attributes) {
    if (to.getAttribute(name) === value) continue;
    to.setAttribute(name, value);
    if (name === 'value' && to instanceof HTMLInputElement && to.type !== 'file') to.value = value;
  }
  for (const { name } of [...to.attributes]) {
    if (!from.hasAttribute(name)) to.removeAttribute(name);
  }
}

function softMatch(old: Node, incoming: Element): boolean {
  if (!(old instanceof Element) || old.tagName !== incoming.tagName) return false;
  if (old.tagName === 'SCRIPT' && !old.isEqualNode(incoming)) return false;
  return !old.id || old.id === incoming.id;
}

function persistentIds(oldElements: Element[], newElements: Element[]): Set<string> {
  const duplicates = new Set<string>();
  const oldTags = new Map<string, string>();
  for (const { id, tagName } of oldElements) {
    if (oldTags.has(id)) duplicates.add(id);
    else if (id) oldTags.set(id, tagName);
  }
  const persistent = new Set<string>();
  for (const { id, tagName } of newElements) {
    if (persistent.has(id)) duplicates.add(id);
    else if (oldTags.get(id) === tagName) persistent.add(id);
  }
  for (const id of duplicates) persistent.delete(id);
  return persistent;
}

/** Record, for each element with a persistent id, that id on itself and on its ancestors up to `root`. */
function mapIds(
  ids: Map<Node, Set<string>>,
  persistent: Set<string>,
  root: Node | null,
  elements: Element[]
): void {
  for (const element of elements) {
    if (!persistent.has(element.id)) continue;
    for (let up: Element | null = element; up && up !== root; up = up.parentElement) {
      let held = ids.get(up);
      if (!held) ids.set(up, (held = new Set()));
      held.add(element.id);
    }
  }
}

export interface MorphNode extends Cmd {
  type: 'morphCommand';
  target: Expr;
  content: Expr;
}

export function morph(g: Grammar): void {
  g.commands.morph = (p, _keyword, start) => {
    const target = expr(p);
    p.req('to');
    const content = expr(p);
    const node: MorphNode = {
      type: 'morphCommand',
      target,
      content,
      start,
      end: p.endPos(),
      run: ctx =>
        all([target.ev(ctx), content.ev(ctx)], ([elements, value]) => {
          implicitLoop(elements, element => {
            if (element instanceof Element) morphTo(element, value);
          });
        }),
    };
    return node;
  };
}
