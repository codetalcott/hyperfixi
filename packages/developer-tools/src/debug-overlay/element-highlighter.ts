/**
 * Element Highlighter — outlines the target DOM element during debugging.
 *
 * Creates an absolute-positioned overlay that tracks the element via
 * getBoundingClientRect(). Shows a tooltip with tag, id, and classes.
 */

export class ElementHighlighter {
  private overlay: HTMLDivElement | null = null;
  private label: HTMLDivElement | null = null;
  private currentElement: Element | null = null;
  private resizeObserver: ResizeObserver | null = null;

  /** Highlight an element with an overlay outline */
  highlight(element: Element | null): void {
    this.clear();
    if (!element || !element.getBoundingClientRect) return;

    this.currentElement = element;

    // Create overlay
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483646',
      border: '2px solid #89b4fa',
      borderRadius: '2px',
      background: 'rgba(137, 180, 250, 0.08)',
      transition: 'all 0.15s ease',
    });

    // Create label
    this.label = document.createElement('div');
    this.label.textContent = describeElement(element);
    Object.assign(this.label.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483646',
      background: '#1e1e2e',
      color: '#89b4fa',
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '11px',
      fontFamily: "'SF Mono', 'Fira Code', monospace",
      whiteSpace: 'nowrap',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    });

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.label);

    this.updatePosition();

    // Track element size changes
    this.resizeObserver = new ResizeObserver(() => this.updatePosition());
    this.resizeObserver.observe(element);

    // Track scroll
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleScroll, { passive: true });
  }

  /** Remove the highlight */
  clear(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.label) {
      this.label.remove();
      this.label = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleScroll);
    this.currentElement = null;
  }

  private handleScroll = (): void => {
    this.updatePosition();
  };

  private updatePosition(): void {
    if (!this.currentElement || !this.overlay || !this.label) return;

    const rect = this.currentElement.getBoundingClientRect();

    // Position overlay
    Object.assign(this.overlay.style, {
      top: `${rect.top - 2}px`,
      left: `${rect.left - 2}px`,
      width: `${rect.width + 4}px`,
      height: `${rect.height + 4}px`,
    });

    // Position label above the element
    const labelY = rect.top - 24;
    Object.assign(this.label.style, {
      top: `${labelY < 4 ? rect.bottom + 4 : labelY}px`,
      left: `${rect.left}px`,
    });
  }
}

function describeElement(el: Element): string {
  let desc = el.tagName.toLowerCase();
  if (el.id) desc += `#${el.id}`;
  if (el.classList.length > 0) {
    desc += `.${Array.from(el.classList).join('.')}`;
  }
  return desc;
}
