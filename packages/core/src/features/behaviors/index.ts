/**
 * Behavior System Integration
 * Main entry point for behavior definitions functionality
 */

import { HyperscriptBehaviorParser } from './parser.js';
import { globalBehaviorRegistry } from './registry.js';
import type { BehaviorDefinition } from './types.js';

// Initialize parser
const behaviorParser = new HyperscriptBehaviorParser();

/**
 * Parse and define a behavior from hyperscript code
 */
export async function parseAndDefineBehavior(behaviorCode: string): Promise<BehaviorDefinition> {
  const behavior = behaviorParser.parse(behaviorCode);
  globalBehaviorRegistry.define(behavior);
  return behavior;
}

/**
 * Execute hyperscript code, including behavior installation
 */
export async function executeHyperscript(code: string, element: HTMLElement, context: any): Promise<any> {
  const trimmedCode = code.trim();
  
  // Handle install command
  if (trimmedCode.startsWith('install ')) {
    return await executeInstallCommand(trimmedCode, element, context);
  }
  
  // Other hyperscript commands would be handled here
  throw new Error(`executeHyperscript not fully implemented for: ${code}`);
}

/**
 * Execute install command
 */
async function executeInstallCommand(installCode: string, element: HTMLElement, context: any): Promise<void> {
  // Parse install command: "install BehaviorName" or "install BehaviorName(param: value)"
  const match = installCode.match(/install\s+(\w+)(?:\(([^)]*)\))?/);
  
  if (!match) {
    throw new Error(`Invalid install command: ${installCode}`);
  }
  
  const behaviorName = match[1];
  const paramString = match[2];
  
  // Parse parameters
  const parameters: Record<string, any> = {};
  if (paramString) {
    const paramPairs = paramString.split(',').map(p => p.trim());
    for (const pair of paramPairs) {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        parameters[key] = parseParameterValue(value, context);
      }
    }
  }
  
  // Install behavior
  await globalBehaviorRegistry.install(behaviorName, element, parameters);
}

/**
 * Parse parameter value from string
 */
function parseParameterValue(value: string, context: any): any {
  value = value.trim();
  
  // Remove quotes for string literals
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // CSS selector (starts with # or .)
  if (value.startsWith('#') || value.startsWith('.')) {
    const element = document.querySelector(value);
    return element || value;
  }
  
  // Object literal (improved parsing)
  if (value.startsWith('{') && value.endsWith('}')) {
    try {
      // Handle nested object parsing with better split logic
      const objectStr = value.slice(1, -1).trim(); // Remove braces
      if (!objectStr) return {};
      
      // Split by comma but respect quoted strings
      const pairs: string[] = [];
      let current = '';
      let inQuotes = false;
      let quoteChar = '';
      
      for (let i = 0; i < objectStr.length; i++) {
        const char = objectStr[i];
        
        if (!inQuotes && (char === '"' || char === "'")) {
          inQuotes = true;
          quoteChar = char;
          current += char;
        } else if (inQuotes && char === quoteChar) {
          inQuotes = false;
          current += char;
        } else if (!inQuotes && char === ',') {
          pairs.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      if (current.trim()) {
        pairs.push(current.trim());
      }
      
      const obj: any = {};
      for (const pair of pairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = pair.slice(0, colonIndex).trim().replace(/['"]/g, '');
        const val = pair.slice(colonIndex + 1).trim();
        
        // Parse value
        if (val.startsWith('"') && val.endsWith('"')) {
          obj[key] = val.slice(1, -1);
        } else if (/^\d+$/.test(val)) {
          obj[key] = parseInt(val);
        } else {
          obj[key] = val;
        }
      }
      
      return obj;
    } catch {
      return value;
    }
  }
  
  // Context variable
  if (context && context.hasOwnProperty(value)) {
    return context[value];
  }
  
  // Default to string
  return value;
}

// Export for testing and integration
export { behaviorParser, globalBehaviorRegistry };
export * from './types.js';