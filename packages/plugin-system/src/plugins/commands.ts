/**
 * Enhanced On Command Plugin
 * Demonstrates command plugin pattern
 */

import type { CommandPlugin, RuntimeContext } from '../types';

export const OnCommandPlugin: CommandPlugin = {
  type: 'command',
  name: 'on',
  pattern: /^on\s+(\w+)/,
  keyReq: 'required',
  valueReq: 'required',

  execute: async (ctx: RuntimeContext) => {
    const { element, args, modifiers } = ctx;
    const [eventName, ...handlers] = args;

    // Extract modifiers (e.g., on click.once.prevent)
    const options: AddEventListenerOptions = {
      once: modifiers.has('once'),
      capture: modifiers.has('capture'),
      passive: modifiers.has('passive')
    };

    const handler = (event: Event) => {
      if (modifiers.has('prevent')) {
        event.preventDefault();
      }
      if (modifiers.has('stop')) {
        event.stopPropagation();
      }

      // Execute handler logic
      // This would integrate with the hyperscript runtime
      console.log(`Event '${eventName}' triggered on`, element);
    };

    // Handle special targets
    let target: EventTarget = element;
    if (modifiers.has('window')) {
      target = window;
    } else if (modifiers.has('document')) {
      target = document;
    }

    target.addEventListener(eventName, handler, options);

    // Return cleanup function
    ctx.cleanup = () => {
      target.removeEventListener(eventName, handler);
    };
  }
};

/**
 * Toggle Command Plugin
 */
export const ToggleCommandPlugin: CommandPlugin = {
  type: 'command',
  name: 'toggle',
  pattern: /^toggle\s+/,

  execute: async (ctx: RuntimeContext) => {
    const { element, args } = ctx;
    const [what, ...params] = args;

    switch (what) {
      case 'class':
        const className = params[0];
        element.classList.toggle(className);
        break;
      
      case 'attribute':
        const [attrName, attrValue] = params;
        if (element.hasAttribute(attrName)) {
          element.removeAttribute(attrName);
        } else {
          element.setAttribute(attrName, attrValue || '');
        }
        break;

      case 'visible':
        const isHidden = element.style.display === 'none';
        element.style.display = isHidden ? '' : 'none';
        break;
    }
  }
};

/**
 * Send Command Plugin
 */
export const SendCommandPlugin: CommandPlugin = {
  type: 'command',
  name: 'send',
  pattern: /^send\s+/,

  execute: async (ctx: RuntimeContext) => {
    const { element, args } = ctx;
    const [eventName, detail] = args;

    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });

    element.dispatchEvent(event);
  }
};
