/**
 * `attrs` proxy — read component attributes as values on the component scope.
 *
 * Simplified from upstream's hyperscript-expression-evaluating version: for v1
 * we treat attributes as plain strings with a few type coercions (number, bool)
 * and a kebab-case-to-camelCase accessor.
 *
 * `<my-counter initial-count="5">` exposes `attrs.initialCount` = 5 (number).
 */

/**
 * Coerce attribute string to a typed value.
 * Rules:
 *  - "true"   → true
 *  - "false"  → false
 *  - number-like strings (e.g. "5", "-3.14") → number
 *  - everything else → original string
 */
function coerceAttrValue(raw: string | null): unknown {
  if (raw == null) return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Number check: not empty, fully numeric after Number()
  if (raw !== '' && !Number.isNaN(Number(raw)) && /^-?(\d+\.?\d*|\.\d+)$/.test(raw)) {
    return Number(raw);
  }
  return raw;
}

/**
 * Convert camelCase prop name to kebab-case attribute name. Used so that
 * reading `attrs.initialCount` finds the `initial-count="..."` attribute.
 */
function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

/**
 * Create a proxy over a component element's attributes. Getting a property
 * reads and coerces the matching kebab-case attribute. Setting a property
 * writes it back as a string (simple stringification for v1).
 */
export function createAttrsProxy(componentEl: Element): Record<string, unknown> {
  return new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (typeof prop !== 'string' || prop.startsWith('_')) return undefined;
      // Try exact match first (e.g. "role", "data-x"), then kebab-cased form.
      const exact = componentEl.getAttribute(prop);
      if (exact != null) return coerceAttrValue(exact);
      const kebab = componentEl.getAttribute(camelToKebab(prop));
      if (kebab != null) return coerceAttrValue(kebab);
      return undefined;
    },
    set(_target, prop, value) {
      if (typeof prop !== 'string') return false;
      const attrName = componentEl.hasAttribute(prop) ? prop : camelToKebab(prop);
      componentEl.setAttribute(attrName, value == null ? '' : String(value));
      return true;
    },
    has(_target, prop) {
      if (typeof prop !== 'string') return false;
      return componentEl.hasAttribute(prop) || componentEl.hasAttribute(camelToKebab(prop));
    },
    ownKeys(_target) {
      return Array.from(componentEl.attributes).map(a => a.name);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      const kebab = camelToKebab(prop);
      if (componentEl.hasAttribute(prop) || componentEl.hasAttribute(kebab)) {
        return {
          enumerable: true,
          configurable: true,
          value: coerceAttrValue(componentEl.getAttribute(prop) ?? componentEl.getAttribute(kebab)),
        };
      }
      return undefined;
    },
  });
}
