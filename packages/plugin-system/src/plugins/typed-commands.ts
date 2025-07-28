/**
 * Type-safe Command Plugins
 * Using the enhanced type system
 */

import { defineCommand } from '../typed';

/**
 * On Command - Type-safe event handling
 */
export const OnCommand = defineCommand('on', {
  execute: async (ctx) => {
    const { element, args, modifiers } = ctx;
    const [eventName, ...handlers] = args; // TypeScript knows args is [string, ...string[]]

    // Type-safe modifier checking
    const options: AddEventListenerOptions = {
      once: modifiers.has('once' as any),
      capture: modifiers.has('capture' as any),
      passive: modifiers.has('passive' as any)
    };

    const handler = (event: Event) => {
      if (modifiers.has('prevent' as any)) {
        event.preventDefault();
      }
      if (modifiers.has('stop' as any)) {
        event.stopPropagation();
      }

      // Execute handler logic
      console.log(`Event '${eventName}' triggered on`, element);
      // In real implementation, this would execute the handlers
    };

    // Handle special targets
    let target: EventTarget = element;
    if (modifiers.has('window' as any)) {
      target = window;
    } else if (modifiers.has('document' as any)) {
      target = document;
    }

    target.addEventListener(eventName, handler, options);

    // Return cleanup
    ctx.cleanup = () => {
      target.removeEventListener(eventName, handler);
    };
  }
});

/**
 * Toggle Command - Type-safe toggling
 */
export const ToggleCommand = defineCommand('toggle', {
  execute: async (ctx) => {
    const { element, args } = ctx;
    const [what, ...params] = args; // TypeScript knows what is 'class' | 'attribute' | 'visible'

    switch (what) {
      case 'class': {
        const className = params[0];
        if (className) {
          element.classList.toggle(className);
        }
        break;
      }
      
      case 'attribute': {
        const [attrName, attrValue] = params;
        if (attrName) {
          if (element.hasAttribute(attrName)) {
            element.removeAttribute(attrName);
          } else {
            element.setAttribute(attrName, attrValue || '');
          }
        }
        break;
      }

      case 'visible': {
        const isHidden = element.style.display === 'none';
        element.style.display = isHidden ? '' : 'none';
        break;
      }
    }
  }
});

/**
 * Send Command - Type-safe event dispatching
 */
export const SendCommand = defineCommand('send', {
  execute: async (ctx) => {
    const { element, args, modifiers } = ctx;
    const [eventName, detail] = args;

    const event = new CustomEvent(eventName, {
      detail,
      bubbles: modifiers.has('bubbles' as any) || true,
      cancelable: modifiers.has('cancelable' as any) || true
    });

    element.dispatchEvent(event);
  }
});

/**
 * Add Command - Add classes, attributes, etc.
 */
export const AddCommand = defineCommand('add', {
  execute: async (ctx) => {
    const { element, args, modifiers } = ctx;
    const [what, to = 'me'] = args;

    const target = to === 'me' ? element : element.querySelector(to);
    if (!target) return;

    // Handle different types of additions
    if (what.startsWith('.')) {
      // Class
      const className = what.slice(1);
      if (modifiers.has('all' as any)) {
        document.querySelectorAll(`.${className}`).forEach(el => {
          el.classList.add(className);
        });
      } else {
        target.classList.add(className);
      }
    } else if (what.includes('=')) {
      // Attribute
      const [name, value] = what.split('=');
      target.setAttribute(name, value);
    }
  }
});

/**
 * Remove Command - Remove classes, attributes, etc.
 */
export const RemoveCommand = defineCommand('remove', {
  execute: async (ctx) => {
    const { element, args, modifiers } = ctx;
    const [what, from = 'me'] = args;

    const target = from === 'me' ? element : element.querySelector(from);
    if (!target) return;

    // Handle different types of removals
    if (what.startsWith('.')) {
      // Class
      const className = what.slice(1);
      if (modifiers.has('all' as any)) {
        document.querySelectorAll(`.${className}`).forEach(el => {
          el.classList.remove(className);
        });
      } else {
        target.classList.remove(className);
      }
    } else {
      // Attribute
      target.removeAttribute(what);
    }
  }
});

/**
 * Set Command - Set properties and attributes
 */
export const SetCommand = defineCommand('set', {
  execute: async (ctx) => {
    const { element, args } = ctx;
    const [what, to] = args;

    if (what.startsWith('@')) {
      // Attribute
      const attrName = what.slice(1);
      element.setAttribute(attrName, to);
    } else if (what.includes('.')) {
      // Property path
      const path = what.split('.');
      let target: any = element;
      
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]];
        if (!target) return;
      }
      
      target[path[path.length - 1]] = to;
    } else {
      // Direct property
      (element as any)[what] = to;
    }
  }
});

/**
 * Call Command - Call methods
 */
export const CallCommand = defineCommand('call', {
  execute: async (ctx) => {
    const { element, args, modifiers } = ctx;
    const [method, ...methodArgs] = args;

    const target = element as any;
    if (typeof target[method] === 'function') {
      if (modifiers.has('async' as any)) {
        await target[method](...methodArgs);
      } else {
        target[method](...methodArgs);
      }
    }
  }
});
