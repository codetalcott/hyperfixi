/**
 * Put Command Implementation
 * The put command allows you to insert content into a variable, property or the DOM.
 * Generated from LSP data with TDD implementation
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class PutCommand implements CommandImplementation {
  name = 'put';
  syntax = 'put <expression> (into | before | at [the] start of | at [the] end of | after)  <expression>`';
  description = 'The put command allows you to insert content into a variable, property or the DOM.';
  isBlocking = false;

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length < 3) {
      throw new Error('Put command requires at least 3 arguments: content, preposition, target');
    }

    const [content, preposition, target] = args;
    
    // Resolve target element
    const targetElement = this.resolveTarget(target, context);
    
    // Convert content to string, handling null/undefined
    const contentStr = content == null ? '' : String(content);
    
    // Execute based on preposition
    switch (preposition) {
      case 'into':
        targetElement.innerHTML = contentStr;
        break;
        
      case 'before':
        if (targetElement.parentNode) {
          const textNode = document.createTextNode(contentStr);
          targetElement.parentNode.insertBefore(textNode, targetElement);
        }
        break;
        
      case 'after':
        if (targetElement.parentNode) {
          const textNode = document.createTextNode(contentStr);
          targetElement.parentNode.insertBefore(textNode, targetElement.nextSibling);
        }
        break;
        
      case 'at start of':
        targetElement.innerHTML = contentStr + targetElement.innerHTML;
        break;
        
      case 'at end of':
        targetElement.innerHTML = targetElement.innerHTML + contentStr;
        break;
        
      default:
        throw new Error(`Invalid preposition: ${preposition}. Must be one of: into, before, after, at start of, at end of`);
    }
    
    return content;
  }

  validate(args: any[]): string | null {
    if (args.length < 3) {
      return 'Put command requires at least 3 arguments: content, preposition, target';
    }
    
    const [, preposition] = args;
    const validPrepositions = ['into', 'before', 'after', 'at start of', 'at end of'];
    
    if (!validPrepositions.includes(preposition)) {
      return `Invalid preposition: ${preposition}. Must be one of: ${validPrepositions.join(', ')}`;
    }
    
    return null;
  }

  private resolveTarget(target: any, context: ExecutionContext): HTMLElement {
    // If target is already an HTMLElement, use it directly
    if (target instanceof HTMLElement) {
      return target;
    }
    
    // If target is a string, treat as CSS selector
    if (typeof target === 'string') {
      const element = document.querySelector(target);
      if (!element) {
        throw new Error(`Target element not found: ${target}`);
      }
      return element as HTMLElement;
    }
    
    // If target is 'me', use the context element
    if (target === 'me' && context.me) {
      return context.me as HTMLElement;
    }
    
    throw new Error(`Invalid target: ${target}. Must be an HTMLElement, CSS selector, or 'me'`);
  }
}

export default PutCommand;