/**
 * if-body-then-execution.test.ts
 *
 * The behavioural half of the `then`-as-separator fix (parse-shape half:
 * `src/parser/__tests__/then-as-separator.test.ts`).
 *
 * A `then` used as a command separator inside an `if` body used to truncate the
 * block and hoist the remainder out as a SIBLING of the `if`. Nothing about that
 * was visible from `ok`/`success` — both stayed true — so the only symptom was a
 * conditional body running when its condition was FALSE. It shipped that way in
 * examples/dialogs/native-dialog.html.
 *
 * These tests assert on the DOM effect, not on the AST. That is the assertion
 * that would have caught the shipped bug on behaviour; the parse-shape tests
 * would not have, on their own.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { hyperscript } from './hyperscript-api.js';

function setupTarget(): HTMLElement {
  document.body.innerHTML = '<div id="host"></div><div id="target"></div>';
  return document.getElementById('host') as HTMLElement;
}

const target = (): HTMLElement => document.getElementById('target') as HTMLElement;

describe('an if body joined by `then` obeys its condition', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does NOT run a `then`-joined body when the condition is false', () => {
    const host = setupTarget();

    return hyperscript
      .eval('if 1 is 2\n  add .first to #target then add .second to #target\nend', host)
      .then(() => {
        expect(target().classList.contains('first')).toBe(false);
        // The regression: `add .second` was hoisted out of the conditional and
        // ran unconditionally.
        expect(target().classList.contains('second')).toBe(false);
      });
  });

  it('runs every command of a `then`-joined body when the condition is true', () => {
    const host = setupTarget();

    return hyperscript
      .eval('if 1 is 1\n  add .first to #target then add .second to #target\nend', host)
      .then(() => {
        expect(target().classList.contains('first')).toBe(true);
        expect(target().classList.contains('second')).toBe(true);
      });
  });

  it('runs the else branch, not the then branch, when the condition is false', () => {
    const host = setupTarget();

    return hyperscript
      .eval(
        'if 1 is 2\n' +
          '  add .then-first to #target then add .then-second to #target\n' +
          'else\n' +
          '  add .else-first to #target then add .else-second to #target\n' +
          'end',
        host
      )
      .then(() => {
        expect(target().classList.contains('then-first')).toBe(false);
        expect(target().classList.contains('then-second')).toBe(false);
        expect(target().classList.contains('else-first')).toBe(true);
        expect(target().classList.contains('else-second')).toBe(true);
      });
  });

  it('still runs a command that follows the closing `end`', () => {
    // The counterpart guard: a `then`-joined command AFTER the `end` belongs to
    // the enclosing sequence and must run regardless of the condition.
    const host = setupTarget();

    return hyperscript
      .eval('if 1 is 2\n  add .inside to #target\nend then add .after to #target', host)
      .then(() => {
        expect(target().classList.contains('inside')).toBe(false);
        expect(target().classList.contains('after')).toBe(true);
      });
  });
});
