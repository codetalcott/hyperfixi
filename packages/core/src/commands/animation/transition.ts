/**
 * Transition Command Implementation
 * Animates CSS properties with transitions
 */

import type { CommandImplementation, ExecutionContext } from '../../types/core.js';

export class TransitionCommand implements CommandImplementation {
  name = 'transition';
  syntax = 'transition [<target>] <property> to <value> [over <duration>] [with <timing-function>] [delay <delay>] [then <command>]';
  description = 'Animates CSS properties using CSS transitions';
  isBlocking = true;
  hasBody = false;
  
  async execute(context: ExecutionContext, ...args: any[]): Promise<HTMLElement> {
    const parsed = this.parseArguments(args, context);
    
    // Apply transitions to all target elements
    for (const element of parsed.targets) {
      await this.applyTransition(element, parsed);
    }
    
    // Wait for transitions to complete
    if (parsed.properties.length > 0 && parsed.duration > 0) {
      await this.waitForTransitions(parsed.targets, parsed.duration + parsed.delay);
    }
    
    // Execute any follow-up commands
    if (parsed.thenCommands.length > 0) {
      for (const command of parsed.thenCommands) {
        await command(context);
      }
    }
    
    // Return the primary target element
    return parsed.targets[0] || context.me!;
  }

  validate(args: any[]): string | null {
    if (args.length === 0) {
      return 'Transition command requires property and value';
    }
    
    let i = 0;
    
    // Skip optional target
    if (args[i] instanceof HTMLElement || (typeof args[i] === 'string' && this.isTargetSelector(args[i]))) {
      i++;
    }
    
    // Handle remove syntax first
    if (args[i] === 'remove') {
      if (i + 1 >= args.length) {
        return 'Class name required after "remove"';
      }
      return null; // Valid remove syntax
    }
    
    if (i >= args.length) {
      return 'Transition command requires property and value';
    }
    
    // Special case for single argument validation
    if (args.length === 1 && i === 0) {
      return 'Transition command requires property and value';
    }
    
    // Expect property name
    if (typeof args[i] !== 'string' || this.isKeyword(args[i])) {
      return 'Expected CSS property name';
    }
    i++;
    
    // Expect "to" keyword
    if (i >= args.length || args[i] !== 'to') {
      return 'Expected "to" keyword after property name';
    }
    i++;
    
    // Expect value
    if (i >= args.length) {
      return 'Value required after "to"';
    }
    i++;
    
    // Validate optional modifiers
    while (i < args.length) {
      const keyword = args[i];
      
      if (keyword === 'over') {
        if (i + 1 >= args.length) {
          return 'Duration required after "over"';
        }
        i += 2;
      } else if (keyword === 'with') {
        if (i + 1 >= args.length) {
          return 'Timing function required after "with"';
        }
        i += 2;
      } else if (keyword === 'delay') {
        if (i + 1 >= args.length) {
          return 'Delay value required after "delay"';
        }
        i += 2;
      } else if (keyword === 'then') {
        // Rest are commands - basic validation
        if (i + 1 >= args.length) {
          return 'Command required after "then"';
        }
        break;
      } else {
        // Could be another property-value pair
        if (typeof keyword === 'string' && !this.isKeyword(keyword)) {
          // Property name, expect "to" and value
          if (i + 2 >= args.length || args[i + 1] !== 'to') {
            return 'Expected "to" keyword after property name';
          }
          i += 3;
        } else {
          return `Unexpected keyword: ${keyword}`;
        }
      }
    }
    
    return null;
  }

  private parseArguments(args: any[], context: ExecutionContext): TransitionSpec {
    let targets: HTMLElement[] = [];
    const properties: Array<{name: string, value: string}> = [];
    let duration = 0;
    let delay = 0;
    let timingFunction = '';
    let durationString = '';
    let delayString = '';
    const thenCommands: Array<(ctx: ExecutionContext) => Promise<any>> = [];
    
    let i = 0;
    
    // Parse optional target
    if (args[i] instanceof HTMLElement) {
      targets = [args[i]];
      i++;
    } else if (typeof args[i] === 'string' && this.isTargetSelector(args[i])) {
      targets = this.resolveElements(args[i]);
      i++;
    } else {
      // Default to context.me
      if (context.me) {
        targets = [context.me];
      } else {
        throw new Error('No target element available for transition');
      }
    }
    
    // Handle immediate removal commands first
    if (args[i] === 'remove' && i + 1 < args.length) {
      const className = args[i + 1];
      // Execute removal immediately
      targets.forEach(el => {
        if (className.startsWith('.')) {
          el.classList.remove(className.substring(1));
        } else {
          el.classList.remove(className);
        }
      });
      i += 2;
    }
    
    // Parse property-value pairs and commands
    while (i < args.length) {
      const keyword = args[i];
      
      if (keyword === 'over') {
        const durationValue = args[i + 1];
        durationString = typeof durationValue === 'number' ? `${durationValue}ms` : String(durationValue);
        duration = this.parseDuration(durationValue);
        i += 2;
      } else if (keyword === 'with') {
        timingFunction = String(args[i + 1]);
        i += 2;
      } else if (keyword === 'delay') {
        const delayValue = args[i + 1];
        delayString = typeof delayValue === 'number' ? `${delayValue}ms` : String(delayValue);
        delay = this.parseDuration(delayValue);
        i += 2;
      } else if (keyword === 'then') {
        // Parse then commands - break out of property parsing loop
        i++;
        break;
      } else if (typeof keyword === 'string' && !this.isKeyword(keyword)) {
        // Property-value pair
        if (i + 2 < args.length && args[i + 1] === 'to') {
          const property = keyword;
          const value = this.resolveValue(args[i + 2], context);
          properties.push({ name: property, value });
          i += 3;
        } else {
          throw new Error(`Invalid transition syntax at: ${keyword}`);
        }
      } else {
        i++;
      }
    }
    
    // Parse then commands (simplified)
    while (i < args.length) {
      const command = args[i];
      if (command === 'add' && i + 1 < args.length) {
        const className = args[i + 1];
        thenCommands.push(async (ctx) => {
          targets.forEach(el => {
            if (className.startsWith('.')) {
              el.classList.add(className.substring(1));
            } else {
              el.classList.add(className);
            }
          });
        });
        i += 2;
      } else if (command === 'remove' && i + 1 < args.length) {
        const className = args[i + 1];
        thenCommands.push(async (ctx) => {
          targets.forEach(el => {
            if (className.startsWith('.')) {
              el.classList.remove(className.substring(1));
            } else {
              el.classList.remove(className);
            }
          });
        });
        i += 2;
      } else {
        i++;
      }
    }
    
    return {
      targets,
      properties,
      duration,
      delay,
      timingFunction,
      durationString,
      delayString,
      thenCommands
    };
  }

  private async applyTransition(element: HTMLElement, spec: TransitionSpec): Promise<void> {
    // Set individual transition properties for better control
    if (spec.properties.length > 0) {
      const propertyNames = spec.properties.map(p => p.name);
      element.style.transitionProperty = propertyNames.join(', ');
      
      if (spec.duration > 0) {
        element.style.transitionDuration = spec.durationString || `${spec.duration}ms`;
      }
      
      if (spec.timingFunction) {
        element.style.transitionTimingFunction = spec.timingFunction;
      }
      
      if (spec.delay > 0) {
        element.style.transitionDelay = spec.delayString || `${spec.delay}ms`;
      }
    }
    
    // Apply property values
    for (const prop of spec.properties) {
      this.setStyleProperty(element, prop.name, prop.value);
    }
  }

  private async waitForTransitions(elements: HTMLElement[], totalDuration: number): Promise<void> {
    if (elements.length === 0 || totalDuration <= 0) return;
    
    return new Promise<void>((resolve) => {
      let settled = false;
      let completedTransitions = 0;
      const expectedTransitions = elements.length;
      
      const settle = () => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve();
        }
      };
      
      const cleanup = () => {
        elements.forEach(el => {
          el.removeEventListener('transitionend', onTransitionEnd);
          el.removeEventListener('transitioncancel', onTransitionCancel);
        });
        clearTimeout(timeoutId);
      };
      
      const onTransitionEnd = (event: Event) => {
        if (elements.includes(event.target as HTMLElement)) {
          completedTransitions++;
          if (completedTransitions >= expectedTransitions) {
            settle();
          }
        }
      };
      
      const onTransitionCancel = (event: Event) => {
        if (elements.includes(event.target as HTMLElement)) {
          settle();
        }
      };
      
      // Listen for transition events
      elements.forEach(el => {
        el.addEventListener('transitionend', onTransitionEnd);
        el.addEventListener('transitioncancel', onTransitionCancel);
      });
      
      // Fallback timeout with shorter buffer for tests
      const timeoutId = setTimeout(settle, Math.max(totalDuration + 50, 100));
    });
  }

  private setStyleProperty(element: HTMLElement, property: string, value: string): void {
    try {
      // Always use setProperty for better compatibility with Happy-DOM and complex CSS values
      element.style.setProperty(property, value);
    } catch (error) {
      // Fallback to camelCase property assignment
      const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      if (camelProperty in element.style) {
        (element.style as any)[camelProperty] = value;
      }
    }
  }

  private resolveElements(selector: string): HTMLElement[] {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
      throw new Error(`Transition target not found: ${selector}`);
    }
    return Array.from(elements) as HTMLElement[];
  }

  private resolveValue(value: any, context: ExecutionContext): string {
    // If it's a variable name, resolve it
    if (typeof value === 'string' && context.locals?.has(value)) {
      return String(context.locals.get(value));
    }
    
    // Convert to string
    return String(value);
  }

  private parseDuration(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    
    const str = String(value);
    if (str.endsWith('ms')) {
      return parseFloat(str);
    } else if (str.endsWith('s')) {
      return parseFloat(str) * 1000;
    } else {
      return parseFloat(str) || 0;
    }
  }

  private isTargetSelector(value: string): boolean {
    // Only consider it a target selector if it's clearly a CSS selector
    // Not just any string starting with a letter (which could be a CSS property)
    return value.startsWith('#') || value.startsWith('.') || value.includes('[') || 
           (value.includes(' ') && /^[a-zA-Z]/.test(value)) || // Compound selectors
           /^[a-zA-Z]+\s*>/.test(value) || // Child selector
           /^[a-zA-Z]+\s*\+/.test(value) || // Adjacent sibling
           /^[a-zA-Z]+\s*~/.test(value) || // General sibling
           value.includes(':'); // Pseudo selectors
  }

  private isKeyword(value: string): boolean {
    return ['to', 'over', 'with', 'delay', 'then', 'add', 'remove'].includes(value);
  }
}

interface TransitionSpec {
  targets: HTMLElement[];
  properties: Array<{name: string, value: string}>;
  duration: number;
  delay: number;
  timingFunction: string;
  durationString?: string;
  delayString?: string;
  thenCommands: Array<(ctx: ExecutionContext) => Promise<any>>;
}