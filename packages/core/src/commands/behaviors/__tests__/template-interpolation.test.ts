/**
 * Tests for dynamic class selector syntax: toggle .{variable}
 *
 * The tokenizer recognizes .{varName} as a dynamic class selector.
 * At runtime, the toggle/add/remove commands resolve {varName} from context.
 */
import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../../api/hyperscript-api';

describe('dynamic class selector .{var}', () => {
  it('should tokenize .{cls} as a selector', () => {
    const result = hyperscript.compileSync('toggle .{cls} on me', { traditional: true });
    expect(result.ok).toBe(true);
    const arg = (result.ast as any)?.args?.[0];
    expect(arg?.type).toBe('selector');
    expect(arg?.value).toBe('.{cls}');
  });

  it('should execute toggle .{cls} in a behavior with parameter resolution', async () => {
    const behaviorCode = `behavior DynToggle(cls)
  init
    if cls is undefined set cls to "active"
  end
  on click
    toggle .{cls} on me
  end
end`;

    const compiled = hyperscript.compileSync(behaviorCode, { traditional: true });
    expect(compiled.ok).toBe(true);

    const ctx = hyperscript.createContext();
    await hyperscript.execute(compiled.ast!, ctx);

    // Install with custom class
    const el = document.createElement('button');
    document.body.appendChild(el);

    const installResult = hyperscript.compileSync('install DynToggle(cls: "highlight")', {
      traditional: true,
    });
    expect(installResult.ok).toBe(true);

    const installCtx = hyperscript.createContext(el);
    await hyperscript.execute(installResult.ast!, installCtx);

    // Click → toggle on
    expect(el.classList.contains('highlight')).toBe(false);
    el.click();
    await new Promise(r => setTimeout(r, 50));
    expect(el.classList.contains('highlight')).toBe(true);

    // Click → toggle off
    el.click();
    await new Promise(r => setTimeout(r, 50));
    expect(el.classList.contains('highlight')).toBe(false);

    document.body.removeChild(el);
  });

  it('should work with add .{cls} and remove .{cls} too', async () => {
    const code = `behavior AddRemoveTest(cls)
  init
    if cls is undefined set cls to "active"
  end
  on mouseenter
    add .{cls} to me
  end
  on mouseleave
    remove .{cls} from me
  end
end`;

    const compiled = hyperscript.compileSync(code, { traditional: true });
    expect(compiled.ok).toBe(true);

    const ctx = hyperscript.createContext();
    await hyperscript.execute(compiled.ast!, ctx);

    const el = document.createElement('div');
    document.body.appendChild(el);

    const installResult = hyperscript.compileSync('install AddRemoveTest(cls: "hovered")', {
      traditional: true,
    });
    expect(installResult.ok).toBe(true);
    await hyperscript.execute(installResult.ast!, hyperscript.createContext(el));

    // Simulate mouseenter
    el.dispatchEvent(new Event('mouseenter'));
    await new Promise(r => setTimeout(r, 50));
    expect(el.classList.contains('hovered')).toBe(true);

    // Simulate mouseleave
    el.dispatchEvent(new Event('mouseleave'));
    await new Promise(r => setTimeout(r, 50));
    expect(el.classList.contains('hovered')).toBe(false);

    document.body.removeChild(el);
  });

  it('should use default class when no parameter provided', async () => {
    // Uses the DynToggle behavior registered in the previous test
    const el = document.createElement('div');
    document.body.appendChild(el);

    const installResult = hyperscript.compileSync('install DynToggle', { traditional: true });
    expect(installResult.ok).toBe(true);

    const installCtx = hyperscript.createContext(el);
    await hyperscript.execute(installResult.ast!, installCtx);

    el.click();
    await new Promise(r => setTimeout(r, 50));
    expect(el.classList.contains('active')).toBe(true);

    document.body.removeChild(el);
  });
});
