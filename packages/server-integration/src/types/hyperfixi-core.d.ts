/**
 * Type declarations for @lokascript/core
 *
 * This provides minimal types for the optional integration with the core package.
 * When @lokascript/core is available and built with proper types, these can be removed.
 */

declare module '@lokascript/core' {
  import type { ASTUtilNode as ASTNode } from '@lokascript/core/ast-utils';

  export interface CompilationResult {
    success: boolean;
    ast?: ASTNode;
    errors: Array<{
      name?: string;
      message: string;
      line?: number;
      column?: number;
    }>;
    tokens: unknown[];
    compilationTime: number;
  }

  export interface HyperscriptAPI {
    compile(code: string): CompilationResult;
  }

  export const hyperscript: HyperscriptAPI;
}
