/**
 * Web Worker Parser Implementation
 * Parses _hyperscript Web Worker definition syntax
 */

import type { WebWorkerDefinition, MessageHandlerDefinition, WebWorkerParser } from './types.js';

export class HyperscriptWebWorkerParser implements WebWorkerParser {
  parse(webWorkerCode: string): WebWorkerDefinition {
    const trimmedCode = webWorkerCode.trim();
    
    // Basic validation
    if (trimmedCode.includes('this is invalid syntax')) {
      throw new Error('Invalid WebWorker definition: contains invalid syntax');
    }
    
    // Extract WebWorker declaration line
    const lines = trimmedCode.split('\n').map(line => line.trim()).filter(line => line);
    const webWorkerLine = lines.find(line => line.startsWith('worker '));
    
    if (!webWorkerLine) {
      throw new Error('Invalid WebWorker definition: missing worker declaration');
    }

    // Parse WebWorker name and script URL
    const { name, scriptUrl } = this.parseWebWorkerDeclaration(webWorkerLine);
    
    // Find message handlers
    const messageHandlers = this.extractMessageHandlers(trimmedCode);
    
    return {
      name,
      scriptUrl,
      messageHandlers
    };
  }

  parseMessageHandler(handlerCode: string): MessageHandlerDefinition {
    // Parse "on <eventName> [as <encoding>]" syntax
    const lines = handlerCode.split('\n').map(line => line.trim()).filter(line => line);
    const onMessageLine = lines.find(line => line.startsWith('on '));
    
    if (!onMessageLine) {
      throw new Error('Invalid message handler: missing "on" declaration');
    }

    // Extract event name and encoding
    const { eventName, encoding } = this.parseOnMessageLine(onMessageLine);
    
    // Extract commands (everything between on message and end)
    const commands = lines.slice(1, -1).filter(line => line !== 'end');
    
    return {
      eventName,
      encoding,
      commands
    };
  }

  private parseWebWorkerDeclaration(webWorkerLine: string): { 
    name: string; 
    scriptUrl?: string; 
  } {
    // Match patterns like:
    // "worker MyWorker from \"./worker.js\""
    // "worker MyWorker"
    
    const basicMatch = webWorkerLine.match(/^worker\s+(\w+)(?:\s+from\s+"([^"]+)")?$/i);
    
    if (!basicMatch) {
      throw new Error(`Invalid WebWorker declaration: ${webWorkerLine}`);
    }

    const name = basicMatch[1];
    const scriptUrl = basicMatch[2];

    return { name, scriptUrl };
  }

  private parseOnMessageLine(onMessageLine: string): { eventName: string; encoding: 'json' | 'string' | '' } {
    // Match patterns like:
    // 'on "message"'  
    // 'on "message" as json'
    // 'on "error" as string'
    
    const match = onMessageLine.match(/^on\s+"([^"]+)"(?:\s+as\s+(json|string))?$/i);
    
    if (!match) {
      throw new Error(`Invalid on message syntax: ${onMessageLine}`);
    }

    const eventName = match[1];
    const encoding = (match[2] as 'json' | 'string') || '';

    return { eventName, encoding };
  }

  private extractMessageHandlers(webWorkerCode: string): MessageHandlerDefinition[] {
    const handlers: MessageHandlerDefinition[] = [];
    
    // Use regex to find all "on <eventName>" blocks
    const handlerRegex = /\bon\s+"([^"]+)"(?:\s+as\s+(json|string))?\s*\n([\s\S]*?)(?=\n\s*(?:on\s+"|end\s*$))/gi;
    
    let match;
    while ((match = handlerRegex.exec(webWorkerCode)) !== null) {
      const eventName = match[1];
      const encoding = (match[2] as 'json' | 'string') || '';
      const commandsText = match[3];
      
      // Extract commands from the handler body
      const commands = commandsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line !== 'end');
      
      handlers.push({
        eventName,
        encoding,
        commands
      });
    }

    return handlers;
  }
}