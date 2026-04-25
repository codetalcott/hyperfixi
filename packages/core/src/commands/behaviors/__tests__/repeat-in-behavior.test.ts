/**
 * Tests for repeat-until-event and trigger-on inside behavior event handlers.
 *
 * Regression tests for parser fixes:
 * - trigger command's 'on' keyword was intercepted by parsePrimary() as event handler start
 * - Behavior parser didn't use parseEventNameWithNamespace() for event names
 */
import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

describe('repeat inside behavior event handlers', () => {
  it('repeat until event with simple body', () => {
    const code = `behavior Test()
  on pointerdown
    repeat until event pointerup from document
      set x to 1
    end
  end
end`;
    const result = hyperscript.compileSync(code, { traditional: true });
    expect(result.ok, `Failed: ${JSON.stringify(result.errors)}`).toBe(true);
  });

  it('repeat until event with wait for...or', () => {
    const code = `behavior Test()
  on pointerdown
    repeat until event pointerup from document
      wait for pointermove or pointerup from document
      set x to 1
    end
  end
end`;
    const result = hyperscript.compileSync(code, { traditional: true });
    expect(result.ok, `Failed: ${JSON.stringify(result.errors)}`).toBe(true);
  });

  it('trigger with on-target inside repeat (regression: parsePrimary intercept)', () => {
    const code = `behavior Test()
  on pointerdown from me
    repeat until event pointerup from document
      wait for pointermove from document
      trigger custom:move on me
    end
  end
end`;
    const result = hyperscript.compileSync(code, { traditional: true });
    expect(result.ok, `Failed: ${JSON.stringify(result.errors)}`).toBe(true);
  });

  it('js block followed by trigger and repeat', () => {
    const code = `behavior Test()
  on pointerdown(clientY) from me
    js(me, event)
      event.preventDefault();
    end
    trigger sortable:start on me
    repeat until event pointerup from document
      wait for pointermove(clientY) from document
      trigger sortable:move on me
    end
    trigger sortable:end on me
  end
end`;
    const result = hyperscript.compileSync(code, { traditional: true });
    expect(result.ok, `Failed: ${JSON.stringify(result.errors)}`).toBe(true);
  });

  it('full drag pattern with multiple triggers and repeat', () => {
    const code = `behavior Test(handle, dragClass)
  init
    if dragClass is undefined
      set dragClass to "sorting"
    end
  end
  on pointerdown(target, clientY) from me
    halt the event
    add .{dragClass} to me
    trigger sortable:start on me
    repeat until event pointerup from document
      wait for pointermove(clientY) from document
      trigger sortable:move on me
    end
    remove .{dragClass} from me
    trigger sortable:end on me
  end
end`;
    const result = hyperscript.compileSync(code, { traditional: true });
    expect(result.ok, `Failed: ${JSON.stringify(result.errors)}`).toBe(true);
  });
});
