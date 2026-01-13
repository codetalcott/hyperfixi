/**
 * Patterns Bridge
 * Integrates @hyperfixi/patterns-reference with ast-toolkit pattern matching
 */

import type { ASTNode } from '../types.js';

// Types for the bridge (avoid importing patterns-reference directly to keep optional)
export interface PatternEntry {
  id: string;
  code: string;
  command: string | null;
  language: string;
  confidence: number;
  verified: boolean;
  title?: string;
  category?: string;
}

export interface LLMExample {
  prompt: string;
  completion: string;
  qualityScore: number;
}

export interface PatternSource {
  searchPatterns(query: string): Promise<PatternEntry[]>;
  getPatternsByCommand(command: string): Promise<PatternEntry[]>;
  getLLMExamples(prompt: string, language?: string, limit?: number): Promise<LLMExample[]>;
  close(): void;
}

// Lazy-loaded patterns-reference module
let patternsReference: typeof import('@hyperfixi/patterns-reference') | null = null;
let patternSourceInstance: PatternSource | null = null;

/**
 * Check if patterns-reference is available
 */
export function isPatternsReferenceAvailable(): boolean {
  try {
    // Dynamic import check
    require.resolve('@hyperfixi/patterns-reference');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get or create a pattern source instance
 */
export async function getPatternSource(): Promise<PatternSource | null> {
  if (patternSourceInstance) {
    return patternSourceInstance;
  }

  try {
    if (!patternsReference) {
      patternsReference = await import('@hyperfixi/patterns-reference');
    }

    const ref = patternsReference.createPatternsReference();

    patternSourceInstance = {
      async searchPatterns(query: string): Promise<PatternEntry[]> {
        const results = await ref.searchPatterns(query, { limit: 10 });
        return results.map((p: any) => ({
          id: p.id,
          code: p.rawCode,
          command: extractCommand(p.rawCode),
          language: 'en',
          confidence: 1.0,
          verified: true,
          title: p.title,
          category: p.feature,
        }));
      },

      async getPatternsByCommand(command: string): Promise<PatternEntry[]> {
        const results = await ref.getPatternsByCommand(command);
        return results.map((p: any) => ({
          id: p.id,
          code: p.rawCode,
          command: command,
          language: 'en',
          confidence: 1.0,
          verified: true,
          title: p.title,
          category: p.feature,
        }));
      },

      async getLLMExamples(prompt: string, language = 'en', limit = 5): Promise<LLMExample[]> {
        const examples = await ref.getLLMExamples(prompt, language, limit);
        return examples.map((e: any) => ({
          prompt: e.prompt,
          completion: e.completion,
          qualityScore: e.qualityScore,
        }));
      },

      close() {
        ref.close();
        patternSourceInstance = null;
      },
    };

    return patternSourceInstance;
  } catch (error) {
    // patterns-reference not available or database not initialized
    console.warn('patterns-reference not available:', error);
    return null;
  }
}

/**
 * Search patterns by text query
 */
export async function searchPatterns(query: string): Promise<PatternEntry[]> {
  const source = await getPatternSource();
  if (!source) return [];
  return source.searchPatterns(query);
}

/**
 * Get patterns for a specific command
 */
export async function getPatternsByCommand(command: string): Promise<PatternEntry[]> {
  const source = await getPatternSource();
  if (!source) return [];
  return source.getPatternsByCommand(command);
}

/**
 * Get LLM examples for intent recognition
 */
export async function getLLMExamples(
  prompt: string,
  language = 'en',
  limit = 5
): Promise<LLMExample[]> {
  const source = await getPatternSource();
  if (!source) return [];
  return source.getLLMExamples(prompt, language, limit);
}

/**
 * Find patterns matching an AST node structure
 */
export async function findMatchingPatterns(node: ASTNode): Promise<PatternEntry[]> {
  const source = await getPatternSource();
  if (!source) return [];

  // Extract command name from node
  const command = (node as any).name || (node as any).command;
  if (command) {
    return source.getPatternsByCommand(command);
  }

  // Search by node type
  return source.searchPatterns(node.type);
}

/**
 * Close the pattern source connection
 */
export function closePatternSource(): void {
  if (patternSourceInstance) {
    patternSourceInstance.close();
    patternSourceInstance = null;
  }
}

// Helper to extract command name from hyperscript code
function extractCommand(code: string): string | null {
  // Match common command patterns
  const match = code.match(
    /\b(add|remove|toggle|put|set|show|hide|fetch|wait|trigger|send|call|go|log)\b/i
  );
  return match?.[1]?.toLowerCase() ?? null;
}
