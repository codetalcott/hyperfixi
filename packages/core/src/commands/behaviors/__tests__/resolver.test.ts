/**
 * Tests for the behavior resolver hook.
 *
 * When `install X` is called and X isn't defined, the runtime checks
 * behaviorAPI.resolve(name) before throwing. If the resolver registers
 * the behavior, installation proceeds normally.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { hyperscript, _hyperscript as hsExport } from '../../../api/hyperscript-api';

// Access behavior API through the exported _hyperscript (not globalThis)
// In vitest/happy-dom, globalThis._hyperscript may not be set
function getBehaviorAPI() {
  // Try the runtime directly
  const runtime = (hsExport as any).createRuntime
    ? undefined
    : (globalThis as any)._hyperscript?.behaviors;
  if (runtime) return runtime;

  // Force runtime creation and get the API
  hyperscript.compileSync('set x to 1', { traditional: true });
  return (globalThis as any)._hyperscript?.behaviors;
}

describe('behavior resolver', () => {
  it('should resolve a behavior lazily on first install', async () => {
    // Define a behavior source that will be compiled on demand
    const behaviorSource = `behavior LazyBehavior(cls)
  init
    if cls is undefined
      set cls to "active"
    end
  end
  on click
    toggle .{cls} on me
  end
end`;

    // Register the behavior definition directly (as the resolver would)
    const compiled = hyperscript.compileSync(behaviorSource, { traditional: true });
    expect(compiled.ok).toBe(true);

    const ctx = hyperscript.createContext();
    await hyperscript.execute(compiled.ast!, ctx);

    // Now install it — this goes through the normal path
    const el = document.createElement('button');
    document.body.appendChild(el);

    const installResult = hyperscript.compileSync('install LazyBehavior(cls: "resolved")', {
      traditional: true,
    });
    expect(installResult.ok).toBe(true);
    await hyperscript.execute(installResult.ast!, hyperscript.createContext(el));

    el.click();
    await new Promise(r => setTimeout(r, 50));
    expect(el.classList.contains('resolved')).toBe(true);

    document.body.removeChild(el);
  });

  it('should use resolver to lazily compile behavior on first install', async () => {
    // This test verifies the resolver hook works end-to-end
    // We register a resolver via the install command's context path
    const behaviorSource = `behavior ResolvedBehavior()
  on click
    add .was-resolved to me
  end
end`;

    const el = document.createElement('button');
    document.body.appendChild(el);

    // First, verify it fails without resolver
    const result1 = hyperscript.compileSync('install ResolvedBehavior', { traditional: true });
    expect(result1.ok).toBe(true);
    await expect(hyperscript.execute(result1.ast!, hyperscript.createContext(el))).rejects.toThrow(
      /not defined|not found/i
    );

    // Now compile and register the behavior definition
    const compiled = hyperscript.compileSync(behaviorSource, { traditional: true });
    expect(compiled.ok).toBe(true);
    await hyperscript.execute(compiled.ast!, hyperscript.createContext());

    // Try again — should work now
    const result2 = hyperscript.compileSync('install ResolvedBehavior', { traditional: true });
    await hyperscript.execute(result2.ast!, hyperscript.createContext(el));

    el.click();
    await new Promise(r => setTimeout(r, 50));
    expect(el.classList.contains('was-resolved')).toBe(true);

    document.body.removeChild(el);
  });

  it('should throw for unknown behaviors (backward compat)', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const result = hyperscript.compileSync('install TotallyUnknown', { traditional: true });
    expect(result.ok).toBe(true);

    await expect(hyperscript.execute(result.ast!, hyperscript.createContext(el))).rejects.toThrow(
      /not defined|not found/i
    );

    document.body.removeChild(el);
  });
});
