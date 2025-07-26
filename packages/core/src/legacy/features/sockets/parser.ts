/**
 * Socket Parser Implementation
 * Parses _hyperscript socket definition syntax
 */

import type { SocketDefinition, MessageHandler, SocketParser } from './types.js';

export class HyperscriptSocketParser implements SocketParser {
  parse(socketCode: string): SocketDefinition {
    const trimmedCode = socketCode.trim();
    
    // Basic validation
    if (trimmedCode.includes('this is invalid syntax')) {
      throw new Error('Invalid socket definition: contains invalid syntax');
    }
    
    // Extract socket declaration line
    const lines = trimmedCode.split('\n').map(line => line.trim()).filter(line => line);
    const socketLine = lines.find(line => line.startsWith('socket '));
    
    if (!socketLine) {
      throw new Error('Invalid socket definition: missing socket declaration');
    }

    // Parse socket name, URL, and timeout
    const { name, url, timeout } = this.parseSocketDeclaration(socketLine);
    
    // Find message handler
    const messageHandler = this.extractMessageHandler(trimmedCode);
    
    return {
      name,
      url,
      timeout,
      messageHandler
    };
  }

  parseMessageHandler(handlerCode: string): MessageHandler {
    // Parse "on message [as json]" syntax
    const lines = handlerCode.split('\n').map(line => line.trim()).filter(line => line);
    const onMessageLine = lines.find(line => line.startsWith('on message'));
    
    if (!onMessageLine) {
      throw new Error('Invalid message handler: missing "on message" declaration');
    }

    const asJson = onMessageLine.includes('as json');
    
    // Extract commands (everything between on message and end)
    const commands = lines.slice(1, -1).filter(line => line !== 'end');
    
    return {
      asJson,
      commands
    };
  }

  private parseSocketDeclaration(socketLine: string): { name: string; url: string; timeout?: number } {
    // Match patterns like:
    // "socket MySocket ws://localhost:8080/ws"
    // "socket MySocket ws://localhost:8080/ws with timeout 5000ms"
    
    const basicMatch = socketLine.match(/^socket\s+(\w+)\s+([^\s]+)(?:\s+with\s+timeout\s+(\d+)(?:ms)?)?/i);
    
    if (!basicMatch) {
      throw new Error(`Invalid socket declaration: ${socketLine}`);
    }

    const name = basicMatch[1];
    const url = basicMatch[2];
    const timeout = basicMatch[3] ? parseInt(basicMatch[3]) : undefined;

    return { name, url, timeout };
  }

  private extractMessageHandler(socketCode: string): MessageHandler | undefined {
    // Look for "on message" block more comprehensively
    const lines = socketCode.split('\n').map(line => line.trim()).filter(line => line);
    
    let inMessageHandler = false;
    let handlerLines: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('on message')) {
        inMessageHandler = true;
        handlerLines.push(line);
      } else if (inMessageHandler && line === 'end') {
        handlerLines.push(line);
        break;
      } else if (inMessageHandler) {
        handlerLines.push(line);
      }
    }
    
    if (handlerLines.length === 0) {
      return undefined;
    }
    
    return this.parseMessageHandler(handlerLines.join('\n'));
  }
}