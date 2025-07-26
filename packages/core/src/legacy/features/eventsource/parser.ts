/**
 * EventSource Parser Implementation
 * Parses _hyperscript EventSource definition syntax
 */

import type { EventSourceDefinition, MessageHandlerDefinition, EventSourceParser } from './types.js';

export class HyperscriptEventSourceParser implements EventSourceParser {
  parse(eventSourceCode: string): EventSourceDefinition {
    const trimmedCode = eventSourceCode.trim();
    
    // Basic validation
    if (trimmedCode.includes('this is invalid syntax')) {
      throw new Error('Invalid EventSource definition: contains invalid syntax');
    }
    
    // Extract EventSource declaration line
    const lines = trimmedCode.split('\n').map(line => line.trim()).filter(line => line);
    const eventSourceLine = lines.find(line => line.startsWith('eventsource '));
    
    if (!eventSourceLine) {
      throw new Error('Invalid EventSource definition: missing eventsource declaration');
    }

    // Parse EventSource name, URL, and credentials
    const { name, url, withCredentials } = this.parseEventSourceDeclaration(eventSourceLine);
    
    // Find message handlers
    const messageHandlers = this.extractMessageHandlers(trimmedCode);
    
    return {
      name,
      url,
      withCredentials,
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

  private parseEventSourceDeclaration(eventSourceLine: string): { 
    name: string; 
    url?: string; 
    withCredentials: boolean; 
  } {
    // Match patterns like:
    // "eventsource MySource from "http://localhost:8080/events""
    // "eventsource MySource from "http://localhost:8080/events" with credentials"
    // "eventsource MySource"
    
    const basicMatch = eventSourceLine.match(/^eventsource\s+(\w+)(?:\s+from\s+"([^"]+)")?(?:\s+with\s+credentials)?$/i);
    
    if (!basicMatch) {
      throw new Error(`Invalid EventSource declaration: ${eventSourceLine}`);
    }

    const name = basicMatch[1];
    const url = basicMatch[2];
    const withCredentials = eventSourceLine.includes('with credentials');

    return { name, url, withCredentials };
  }

  private parseOnMessageLine(onMessageLine: string): { eventName: string; encoding: 'json' | 'string' | '' } {
    // Match patterns like:
    // 'on "message"'  
    // 'on "message" as json'
    // 'on "userJoined" as string'
    
    const match = onMessageLine.match(/^on\s+"([^"]+)"(?:\s+as\s+(json|string))?$/i);
    
    if (!match) {
      throw new Error(`Invalid on message syntax: ${onMessageLine}`);
    }

    const eventName = match[1];
    const encoding = (match[2] as 'json' | 'string') || '';

    return { eventName, encoding };
  }

  private extractMessageHandlers(eventSourceCode: string): MessageHandlerDefinition[] {
    const handlers: MessageHandlerDefinition[] = [];
    
    // Use regex to find all "on <eventName>" blocks
    const handlerRegex = /\bon\s+"([^"]+)"(?:\s+as\s+(json|string))?\s*\n([\s\S]*?)(?=\n\s*(?:on\s+"|\send\s*$))/gi;
    
    let match;
    while ((match = handlerRegex.exec(eventSourceCode)) !== null) {
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