/**
 * Slot substitution — replace `<slot/>` and `<slot name="X"/>` placeholders
 * in a template source string with content provided at instantiation.
 *
 * Port of upstream _hyperscript 0.9.91's `substituteSlots` (src/ext/component.js).
 * Regex-based rather than DOM-based so the template source stays a plain string
 * the render engine can consume.
 */

/**
 * Partition raw slot content into named and default parts.
 * Named = elements with a `slot="name"` attribute.
 * Default = all other children (elements or text).
 */
function partitionSlotContent(slotContent: string): {
  named: Record<string, string>;
  defaultContent: string;
} {
  const named: Record<string, string> = {};
  const defaultParts: string[] = [];

  if (typeof document === 'undefined') {
    // Non-browser fallback: treat everything as default content.
    return { named, defaultContent: slotContent };
  }

  const tmp = document.createElement('div');
  tmp.innerHTML = slotContent;

  for (const child of Array.from(tmp.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const slotName = el.getAttribute('slot');
      if (slotName) {
        el.removeAttribute('slot');
        if (!named[slotName]) named[slotName] = '';
        named[slotName] += (el as Element & { outerHTML: string }).outerHTML;
        continue;
      }
      defaultParts.push((el as Element & { outerHTML: string }).outerHTML);
    } else if (child.nodeType === Node.TEXT_NODE) {
      defaultParts.push(child.textContent ?? '');
    }
  }

  return { named, defaultContent: defaultParts.join('') };
}

/**
 * Replace `<slot name="X"/>` / `<slot name="X"></slot>` with named content,
 * and `<slot/>` / `<slot></slot>` with default content.
 *
 * Returns the template source with all `<slot>` placeholders substituted.
 */
export function substituteSlots(templateSource: string, slotContent: string): string {
  if (!slotContent) return templateSource;
  const { named, defaultContent } = partitionSlotContent(slotContent);

  // Named slots first: <slot name="X"/> or <slot name="X"></slot>.
  let source = templateSource.replace(
    /<slot\s+name\s*=\s*["']([^"']+)["']\s*\/?\s*>(\s*<\/slot>)?/g,
    (_match, name) => named[name as string] ?? ''
  );

  // Default slots: <slot/> or <slot></slot> (after named, so named-with-no-name
  // attribute doesn't accidentally swallow default slot content).
  source = source.replace(/<slot\s*\/?\s*>(\s*<\/slot>)?/g, defaultContent);

  return source;
}
