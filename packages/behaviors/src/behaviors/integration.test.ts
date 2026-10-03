import { describe, it, expect, vi } from 'vitest';
import type { HyperscriptHost } from '../schemas/types';
import { registerDraggable, draggableSource } from './draggable';
import { registerToggleable, toggleableSource } from './toggleable';
import { registerRemovable, removableSource } from './removable';
import { registerSortable, sortableSource } from './sortable';
import { registerResizable, resizableSource } from './resizable';
import { registerClipboard, clipboardSource } from './clipboard';
import { registerAutoDismiss, autoDismissSource } from './autodismiss';
import { registerClickOutside, clickOutsideSource } from './clickoutside';
import { registerFocusTrap, focusTrapSource } from './focustrap';
import { registerScrollReveal, scrollRevealSource } from './scrollreveal';
import { registerTabs, tabsSource } from './tabs';

function createMockHost(overrides: Partial<HyperscriptHost> = {}): HyperscriptHost {
  return { evaluate: vi.fn(), ...overrides };
}

// EVERY behavior is defined from its hyperscript `source` with the host's `evaluate` — one
// path, identical browser/npm, no imperative JS installer (the "no imperative JS" rule). The
// optional three (FocusTrap/ScrollReveal/Tabs) carry their web-API logic in an `init`-block
// `js()` body, and the experimental three (Draggable/Sortable/Resizable) run their
// pointer-drag loops via `repeat until event` — all through the single path.
const compiledBehaviors = [
  { name: 'Removable', register: registerRemovable, source: removableSource },
  { name: 'Toggleable', register: registerToggleable, source: toggleableSource },
  { name: 'Clipboard', register: registerClipboard, source: clipboardSource },
  { name: 'AutoDismiss', register: registerAutoDismiss, source: autoDismissSource },
  { name: 'ClickOutside', register: registerClickOutside, source: clickOutsideSource },
  { name: 'FocusTrap', register: registerFocusTrap, source: focusTrapSource },
  { name: 'ScrollReveal', register: registerScrollReveal, source: scrollRevealSource },
  { name: 'Tabs', register: registerTabs, source: tabsSource },
  { name: 'Draggable', register: registerDraggable, source: draggableSource },
  { name: 'Sortable', register: registerSortable, source: sortableSource },
  { name: 'Resizable', register: registerResizable, source: resizableSource },
] as const;

describe('behavior registration integration', () => {
  describe('source-defined behaviors', () => {
    for (const { name, register, source } of compiledBehaviors) {
      describe(name, () => {
        it('should define the source on the host', async () => {
          const host = createMockHost();
          await register(host);

          expect(host.evaluate).toHaveBeenCalledWith(source);
        });

        it('should throw when the host rejects the source', async () => {
          const host = createMockHost({
            evaluate: vi.fn(() => {
              throw new Error('syntax error');
            }),
          });

          await expect(register(host)).rejects.toThrowError(new RegExp(`Failed to define ${name}`));
        });

        it('should throw when no host is available', async () => {
          await expect(register(undefined)).rejects.toThrowError(/No hyperscript host/);
        });
      });
    }
  });
});
