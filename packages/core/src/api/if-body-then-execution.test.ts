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

/**
 * The behavioural half of the mirror-image defect (parse-shape half: the
 * `a single-line if does not swallow the following line` block in
 * `src/parser/__tests__/then-as-separator.test.ts`).
 *
 * `parseIfCommand`'s implicit-multi-line lookahead decided the form from the
 * first command's line and then kept scanning, so the NEXT line's command was
 * pulled INTO the if-block. With a false condition that command silently stopped
 * running — while `ok`/`success` stayed true and the only trace was a recovered
 * "Expected 'end' after if block".
 *
 * These assert the DOM, because that is the only place the damage was visible.
 * See docs-internal/HANDOFF-implicit-multiline-if.md.
 */
describe('a command after a single-line if runs regardless of the condition', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('runs the following line when the condition is FALSE', () => {
    // THE case. `.b` was swallowed into the false branch and never applied.
    const host = setupTarget();

    return hyperscript.eval('if 1 is 2 add .a to #target\nadd .b to #target', host).then(() => {
      expect(target().classList.contains('a')).toBe(false);
      expect(target().classList.contains('b')).toBe(true);
    });
  });

  it('runs both when the condition is TRUE', () => {
    // The bug was invisible here — a swallowed command still runs on a true
    // condition — so this pins that the fix did not overcorrect.
    const host = setupTarget();

    return hyperscript.eval('if 1 is 1 add .a to #target\nadd .b to #target', host).then(() => {
      expect(target().classList.contains('a')).toBe(true);
      expect(target().classList.contains('b')).toBe(true);
    });
  });

  it('runs every following line, not just the first', () => {
    const host = setupTarget();

    return hyperscript
      .eval('if 1 is 2 add .a to #target\nadd .b to #target\nadd .c to #target', host)
      .then(() => {
        expect(target().classList.contains('a')).toBe(false);
        expect(target().classList.contains('b')).toBe(true);
        expect(target().classList.contains('c')).toBe(true);
      });
  });

  it('keeps consecutive single-line ifs independently conditional', () => {
    // Each `if` governs only its own line: `.a` suppressed, `.b` applied,
    // `.c` unconditional.
    const host = setupTarget();

    return hyperscript
      .eval('if 1 is 2 add .a to #target\nif 1 is 1 add .b to #target\nadd .c to #target', host)
      .then(() => {
        expect(target().classList.contains('a')).toBe(false);
        expect(target().classList.contains('b')).toBe(true);
        expect(target().classList.contains('c')).toBe(true);
      });
  });

  it('still runs the same-line `else` branch, and the line after it', () => {
    // The guard, behaviourally: a same-line `else`/`end` keeps the multi-line
    // reading (so the else branch exists at all) while the following line stays
    // unconditional. Collapsing that shape to single-line would drop `.else-ran`.
    const host = setupTarget();

    return hyperscript
      .eval(
        'if 1 is 2 add .then-ran to #target else add .else-ran to #target end\nadd .after to #target',
        host
      )
      .then(() => {
        expect(target().classList.contains('then-ran')).toBe(false);
        expect(target().classList.contains('else-ran')).toBe(true);
        expect(target().classList.contains('after')).toBe(true);
      });
  });
});

/**
 * The behavioural half of the command-word-condition fix and the chain rule
 * (parse-shape halves in `src/parser/__tests__/then-as-separator.test.ts`).
 *
 * A condition STARTING with a command-name word (`if log is 3 …`) used to kill
 * the parse — silently inside a handler, where recovery dropped the `if` and its
 * body ran unconditionally. And a SAME-LINE then-joined body (`if c add .a then
 * add .b`) briefly had its second command evicted as an unconditional sibling by
 * the first-command bound. Both are the same failure the rest of this file
 * exists for: a command running, or not running, against its condition.
 * See docs-internal/HANDOFF-command-word-in-if-condition.md.
 */
describe('a command-word condition and a same-line then-joined body obey the condition', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('does NOT run the body of a command-word condition that is false', () => {
    // `log` resolves to no value, so `log is 3` is false. The silent case:
    // recovery used to run `add .a` unconditionally. The sibling line must still
    // run — both fixes composed.
    const host = setupTarget();

    return hyperscript.eval('if log is 3 add .a to #target\nadd .b to #target', host).then(() => {
      expect(target().classList.contains('a')).toBe(false);
      expect(target().classList.contains('b')).toBe(true);
    });
  });

  it('does NOT run a same-line then-joined body when the condition is false', () => {
    // BOTH adds are conditional (upstream keeps then-joined commands in the
    // body). The first-command bound briefly made `.b` unconditional.
    const host = setupTarget();

    return hyperscript.eval('if 1 is 2 add .a to #target then add .b to #target', host).then(() => {
      expect(target().classList.contains('a')).toBe(false);
      expect(target().classList.contains('b')).toBe(false);
    });
  });

  it('runs the whole same-line then-joined body when the condition is true', () => {
    const host = setupTarget();

    return hyperscript.eval('if 1 is 1 add .a to #target then add .b to #target', host).then(() => {
      expect(target().classList.contains('a')).toBe(true);
      expect(target().classList.contains('b')).toBe(true);
    });
  });
});

/**
 * The behavioural half of the residual where the two defects above meet
 * (parse-shape half: the `a body `then` on a later line does not make a
 * single-line if multi-line` block in
 * `src/parser/__tests__/then-as-separator.test.ts`).
 *
 * The `hasThen` lookahead crosses newlines, so a `then` used as a command
 * separator on a LATER line classified the `if` as multi-line and pulled that
 * whole line into the block — reaching the same silent failure as the defects
 * above by a third route. Bounding that scan at the first command fixed it.
 */
describe('a `then`-joined line after a single-line if runs regardless of the condition', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('runs BOTH commands of the following `then`-joined line when the condition is FALSE', () => {
    const host = setupTarget();

    return hyperscript
      .eval('if 1 is 2 add .a to #target\nadd .b to #target then add .c to #target', host)
      .then(() => {
        expect(target().classList.contains('a')).toBe(false);
        expect(target().classList.contains('b')).toBe(true);
        expect(target().classList.contains('c')).toBe(true);
      });
  });

  it('runs all three when the condition is TRUE', () => {
    const host = setupTarget();

    return hyperscript
      .eval('if 1 is 1 add .a to #target\nadd .b to #target then add .c to #target', host)
      .then(() => {
        expect(target().classList.contains('a')).toBe(true);
        expect(target().classList.contains('b')).toBe(true);
        expect(target().classList.contains('c')).toBe(true);
      });
  });
});
