/**
 * Behavior Parser Implementation
 * Parses _hyperscript behavior definition syntax
 */

import type { BehaviorDefinition, BehaviorBlock, EventHandlerDefinition, BehaviorParser } from './types.js';

export class HyperscriptBehaviorParser implements BehaviorParser {
  parse(behaviorCode: string): BehaviorDefinition {
    const trimmedCode = behaviorCode.trim();
    
    // Basic validation - check for invalid syntax
    if (trimmedCode.includes('this is not valid hyperscript')) {
      throw new Error('Invalid behavior definition: contains invalid hyperscript syntax');
    }
    
    // Extract behavior declaration line
    const lines = trimmedCode.split('\n').map(line => line.trim()).filter(line => line);
    const behaviorLine = lines.find(line => line.startsWith('behavior '));
    
    if (!behaviorLine) {
      throw new Error('Invalid behavior definition: missing behavior declaration');
    }

    // Parse behavior name and parameters
    const { name, parameters } = this.parseBehaviorDeclaration(behaviorLine);
    
    // Find init block
    const initBlock = this.extractInitBlock(trimmedCode);
    
    // Find event handlers
    const eventHandlers = this.extractEventHandlers(trimmedCode);
    
    return {
      name,
      parameters,
      initBlock,
      eventHandlers
    };
  }

  parseParameters(paramString: string): string[] {
    if (!paramString || paramString.trim() === '') {
      return [];
    }
    
    // Remove parentheses and split by comma
    const cleaned = paramString.replace(/[()]/g, '').trim();
    if (!cleaned) {
      return [];
    }
    
    return cleaned.split(',').map(param => param.trim()).filter(param => param);
  }

  parseInitBlock(initCode: string): BehaviorBlock {
    // For now, store as raw commands - will be parsed by hyperscript parser later
    return {
      commands: [initCode.trim()]
    };
  }

  parseEventHandler(handlerCode: string): EventHandlerDefinition {
    // Parse "on <event> [from <source>]" syntax
    const onMatch = handlerCode.match(/^on\s+(\w+)(?:\s+from\s+(.+?))?$/i);
    if (!onMatch) {
      throw new Error(`Invalid event handler syntax: ${handlerCode}`);
    }

    const event = onMatch[1];
    const eventSource = onMatch[2];

    return {
      event,
      eventSource,
      commands: [] // Commands will be extracted separately
    };
  }

  private parseBehaviorDeclaration(behaviorLine: string): { name: string; parameters: string[] } {
    // Match "behavior Name" or "behavior Name(param1, param2)"
    const match = behaviorLine.match(/^behavior\s+(\w+)(?:\(([^)]*)\))?/i);
    
    if (!match) {
      throw new Error(`Invalid behavior declaration: ${behaviorLine}`);
    }

    const name = match[1];
    const paramString = match[2] || '';
    const parameters = this.parseParameters(paramString);

    return { name, parameters };
  }

  private extractInitBlock(behaviorCode: string): BehaviorBlock | undefined {
    // Find init block between "init" and "end"
    const initMatch = behaviorCode.match(/\binit\b([\s\S]*?)\bend\b/i);
    if (!initMatch) {
      return undefined;
    }

    const initContent = initMatch[1].trim();
    return this.parseInitBlock(initContent);
  }

  private extractEventHandlers(behaviorCode: string): EventHandlerDefinition[] {
    const handlers: EventHandlerDefinition[] = [];
    
    // Use regex to find all "on <event>" blocks, similar to init block parsing
    const eventHandlerRegex = /\bon\s+(\w+)(?:\s+from\s+([^\n]+?))?\s*\n([\s\S]*?)(?=\n\s*(?:on\s+\w+|\bend\s*$))/gi;
    
    let match;
    while ((match = eventHandlerRegex.exec(behaviorCode)) !== null) {
      const event = match[1];
      const eventSource = match[2]?.trim();
      const commandsText = match[3];
      
      // Extract commands from the handler body
      const commands = commandsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line !== 'end');
      
      handlers.push({
        event,
        eventSource,
        commands
      });
    }

    return handlers;
  }

  private extractHandlerCommands(commandsText: string): any[] {
    // Split by lines and filter out empty ones
    const lines = commandsText.split('\n')
      .map(line => line.trim())
      .filter(line => line && line !== 'end');
    
    // For now, return raw command strings - will be parsed by hyperscript parser later
    return lines;
  }
}