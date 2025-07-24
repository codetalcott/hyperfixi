/**
 * Pick Command Implementation
 * Supports array/string slicing and regex matching operations
 * Syntax: pick items/item start to end from source
 *         pick match/matches of pattern from source
 */

import { CommandImplementation, ExecutionContext } from '../../types/core';

export class PickCommand implements CommandImplementation {
  name = 'pick';
  syntax = 'pick items/item <start> [to <end>] from <source>\npick match/matches of <pattern> [| <flags>] from <source>';
  description = 'Pick items from arrays, characters from strings, or regex matches';
  isBlocking = false;

  async execute(context: ExecutionContext, ...args: any[]): Promise<any> {
    if (args.length < 3) {
      throw new Error('Pick command requires at least 3 arguments');
    }

    const [firstArg] = args;

    // Determine if this is regex matching or array/string slicing
    if (firstArg === 'match' || firstArg === 'matches') {
      return this.executeRegexPick(args);
    } else if (firstArg === 'item' || firstArg === 'items') {
      return this.executeSlicePick(args);
    } else {
      throw new Error('Invalid pick command syntax. Must start with "item", "items", "match", or "matches"');
    }
  }

  validate(args: any[]): string | null {
    if (args.length < 3) {
      return 'Pick command requires at least 3 arguments';
    }

    const [firstArg] = args;
    
    if (firstArg === 'match' || firstArg === 'matches') {
      return this.validateRegexSyntax(args);
    } else if (firstArg === 'item' || firstArg === 'items') {
      return this.validateSliceSyntax(args);
    } else {
      return 'Invalid pick command syntax. Must start with "item", "items", "match", or "matches"';
    }
  }

  private executeSlicePick(args: any[]): any {
    // Parse slice syntax: [item|items] <start> [to <end>] from <source>
    let startIndex: number | string;
    let endIndex: number | string | undefined;
    let source: any;
    
    const fromIndex = args.indexOf('from');
    if (fromIndex === -1) {
      throw new Error('Pick command requires "from" keyword');
    }
    
    source = args[fromIndex + 1];
    
    // Determine if we have a range (with "to") or single index
    const toIndex = args.indexOf('to');
    
    if (toIndex !== -1 && toIndex < fromIndex) {
      // Range syntax: items start to end from source
      startIndex = args[1];
      endIndex = args[toIndex + 1];
    } else {
      // Single index syntax: item index from source
      startIndex = args[1];
      endIndex = undefined;
    }
    
    return this.performSlice(source, startIndex, endIndex);
  }

  private executeRegexPick(args: any[]): any {
    // Parse regex syntax: [match|matches] of <pattern> [| <flags>] from <source>
    const isMultiple = args[0] === 'matches';
    
    if (args[1] !== 'of') {
      throw new Error('Regex pick requires "of" keyword after match/matches');
    }
    
    const fromIndex = args.indexOf('from');
    if (fromIndex === -1) {
      throw new Error('Pick command requires "from" keyword');
    }
    
    const pattern = args[2];
    let flags = '';
    const source = args[fromIndex + 1];
    
    // Check for flags: pattern | flags from source
    const pipeIndex = args.indexOf('|');
    if (pipeIndex !== -1 && pipeIndex < fromIndex) {
      flags = args[pipeIndex + 1];
    }
    
    return this.performRegexMatch(source, pattern, flags, isMultiple);
  }

  private performSlice(source: any, startIndex: number | string, endIndex?: number | string): any {
    // Validate source type
    if (!Array.isArray(source) && typeof source !== 'string') {
      throw new Error('Pick source must be array, string, or iterable');
    }
    
    // Resolve start and end indices
    const resolvedStart = this.resolveIndex(startIndex, source.length);
    const resolvedEnd = endIndex !== undefined ? this.resolveIndex(endIndex, source.length) : resolvedStart + 1;
    
    // Perform the slice
    if (Array.isArray(source)) {
      return source.slice(resolvedStart, resolvedEnd);
    } else {
      // String slicing
      const result = source.slice(resolvedStart, resolvedEnd);
      return result;
    }
  }

  private performRegexMatch(source: any, pattern: string, flags: string, isMultiple: boolean): any {
    if (typeof source !== 'string') {
      throw new Error('Regex pick source must be a string');
    }
    
    try {
      const regex = new RegExp(pattern, flags);
      
      if (isMultiple) {
        // Return all matches as an iterable of match arrays
        const matches = Array.from(source.matchAll(new RegExp(pattern, flags + 'g')));
        return matches;
      } else {
        // Return first match as an iterable
        const match = source.match(regex);
        return match;
      }
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${pattern}`);
    }
  }

  private resolveIndex(index: number | string, length: number): number {
    if (typeof index === 'number') {
      // Handle negative indices
      return index < 0 ? Math.max(0, length + index) : index;
    }
    
    if (index === 'start') {
      return 0;
    }
    
    if (index === 'end') {
      return length;
    }
    
    // Try to parse as number
    const parsed = Number(index);
    if (isNaN(parsed)) {
      throw new Error('Pick indices must be numbers, "start", or "end"');
    }
    
    return parsed < 0 ? Math.max(0, length + parsed) : parsed;
  }

  private validateSliceSyntax(args: any[]): string | null {
    // Minimum: item/items index from source (4 args)
    // Full: item/items start to end from source (6 args)
    
    if (args.length < 4) {
      return 'Slice pick requires at least 4 arguments: item/items index from source';
    }
    
    const fromIndex = args.indexOf('from');
    if (fromIndex === -1) {
      return 'Pick command requires "from" keyword';
    }
    
    const toIndex = args.indexOf('to');
    if (toIndex !== -1) {
      // Range syntax validation
      if (args.length < 6) {
        return 'Range pick requires 6 arguments: items start to end from source';
      }
      
      if (toIndex !== 2) {
        return 'Expected "to" keyword at position 3 in range syntax';
      }
      
      if (fromIndex !== 4) {
        return 'Expected "from" keyword at position 5 in range syntax';
      }
    } else {
      // Single index syntax validation
      if (fromIndex !== 2) {
        return 'Expected "from" keyword at position 3 in single index syntax';
      }
    }
    
    return null;
  }

  private validateRegexSyntax(args: any[]): string | null {
    // Minimum: match/matches of pattern from source (5 args)
    // With flags: match/matches of pattern | flags from source (7 args)
    
    if (args.length < 5) {
      return 'Regex pick requires at least 5 arguments: match/matches of pattern from source';
    }
    
    if (args[1] !== 'of') {
      return 'Expected "of" keyword after match/matches';
    }
    
    const fromIndex = args.indexOf('from');
    if (fromIndex === -1) {
      return 'Pick command requires "from" keyword';
    }
    
    const pipeIndex = args.indexOf('|');
    if (pipeIndex !== -1) {
      // With flags validation
      if (args.length < 7) {
        return 'Regex pick with flags requires 7 arguments';
      }
      
      if (pipeIndex !== 3) {
        return 'Expected "|" (pipe) at position 4 for regex flags';
      }
      
      if (fromIndex !== 5) {
        return 'Expected "from" keyword at position 6 when using regex flags';
      }
    } else {
      // Without flags validation
      if (fromIndex !== 3) {
        return 'Expected "from" keyword at position 4 in regex syntax';
      }
    }
    
    return null;
  }
}

export default PickCommand;