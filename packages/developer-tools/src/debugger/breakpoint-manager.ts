/**
 * Breakpoint Manager - Manages debug breakpoints
 */

import type { DebugBreakpoint } from '../types';

/**
 * Extended breakpoint with hit count tracking
 */
export interface Breakpoint extends DebugBreakpoint {
  hitCount: number;
  hitCountCondition?: number;
  logMessage?: string;
}

/**
 * Breakpoint change event
 */
export interface BreakpointChangeEvent {
  type: 'added' | 'removed' | 'updated' | 'enabled' | 'disabled';
  breakpoint: Breakpoint;
}

/**
 * Breakpoint Manager class
 */
export class BreakpointManager {
  private breakpoints: Map<string, Breakpoint[]> = new Map();
  private listeners: Array<(event: BreakpointChangeEvent) => void> = [];

  /**
   * Get breakpoint key from file and line
   */
  private getKey(file: string): string {
    return file.toLowerCase();
  }

  /**
   * Add a breakpoint
   */
  add(breakpoint: Omit<Breakpoint, 'hitCount'>): Breakpoint {
    const key = this.getKey(breakpoint.file);
    const bp: Breakpoint = {
      ...breakpoint,
      hitCount: 0,
    };

    if (!this.breakpoints.has(key)) {
      this.breakpoints.set(key, []);
    }

    // Check for duplicate
    const existing = this.breakpoints.get(key)!;
    const existingIndex = existing.findIndex(b => b.line === bp.line);

    if (existingIndex !== -1) {
      // Update existing
      existing[existingIndex] = bp;
      this.emit({ type: 'updated', breakpoint: bp });
    } else {
      // Add new
      existing.push(bp);
      this.emit({ type: 'added', breakpoint: bp });
    }

    return bp;
  }

  /**
   * Remove a breakpoint
   */
  remove(file: string, line: number): boolean {
    const key = this.getKey(file);
    const breakpoints = this.breakpoints.get(key);

    if (!breakpoints) return false;

    const index = breakpoints.findIndex(bp => bp.line === line);
    if (index === -1) return false;

    const [removed] = breakpoints.splice(index, 1);
    this.emit({ type: 'removed', breakpoint: removed });
    return true;
  }

  /**
   * Get breakpoint at location
   */
  get(file: string, line: number): Breakpoint | undefined {
    const key = this.getKey(file);
    const breakpoints = this.breakpoints.get(key);

    if (!breakpoints) return undefined;
    return breakpoints.find(bp => bp.line === line);
  }

  /**
   * Get all breakpoints for a file
   */
  getForFile(file: string): Breakpoint[] {
    const key = this.getKey(file);
    return this.breakpoints.get(key) || [];
  }

  /**
   * Get all breakpoints
   */
  getAll(): Breakpoint[] {
    const all: Breakpoint[] = [];
    for (const breakpoints of this.breakpoints.values()) {
      all.push(...breakpoints);
    }
    return all;
  }

  /**
   * Enable a breakpoint
   */
  enable(file: string, line: number): boolean {
    const bp = this.get(file, line);
    if (!bp) return false;

    bp.enabled = true;
    this.emit({ type: 'enabled', breakpoint: bp });
    return true;
  }

  /**
   * Disable a breakpoint
   */
  disable(file: string, line: number): boolean {
    const bp = this.get(file, line);
    if (!bp) return false;

    bp.enabled = false;
    this.emit({ type: 'disabled', breakpoint: bp });
    return true;
  }

  /**
   * Toggle a breakpoint
   */
  toggle(file: string, line: number): boolean {
    const bp = this.get(file, line);
    if (!bp) return false;

    bp.enabled = !bp.enabled;
    this.emit({ type: bp.enabled ? 'enabled' : 'disabled', breakpoint: bp });
    return true;
  }

  /**
   * Check if should break at location
   */
  shouldBreak(file: string, line: number): boolean {
    const bp = this.get(file, line);
    if (!bp || !bp.enabled) return false;

    // Check condition if present
    if (bp.condition) {
      // In a real implementation, evaluate condition
      // For now, assume condition passes
    }

    // Check hit count condition
    bp.hitCount++;
    if (bp.hitCountCondition && bp.hitCount < bp.hitCountCondition) {
      return false;
    }

    return true;
  }

  /**
   * Reset all hit counts
   */
  resetHitCounts(): void {
    for (const breakpoints of this.breakpoints.values()) {
      for (const bp of breakpoints) {
        bp.hitCount = 0;
      }
    }
  }

  /**
   * Clear all breakpoints
   */
  clear(): void {
    const all = this.getAll();
    this.breakpoints.clear();

    for (const bp of all) {
      this.emit({ type: 'removed', breakpoint: bp });
    }
  }

  /**
   * Clear breakpoints for a file
   */
  clearFile(file: string): void {
    const key = this.getKey(file);
    const breakpoints = this.breakpoints.get(key) || [];

    this.breakpoints.delete(key);

    for (const bp of breakpoints) {
      this.emit({ type: 'removed', breakpoint: bp });
    }
  }

  /**
   * Add change listener
   */
  onChange(listener: (event: BreakpointChangeEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit change event
   */
  private emit(event: BreakpointChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /**
   * Export breakpoints to JSON
   */
  export(): DebugBreakpoint[] {
    return this.getAll().map(bp => ({
      file: bp.file,
      line: bp.line,
      condition: bp.condition,
      enabled: bp.enabled,
    }));
  }

  /**
   * Import breakpoints from JSON
   */
  import(breakpoints: DebugBreakpoint[]): void {
    this.clear();
    for (const bp of breakpoints) {
      this.add(bp);
    }
  }
}

export default BreakpointManager;
