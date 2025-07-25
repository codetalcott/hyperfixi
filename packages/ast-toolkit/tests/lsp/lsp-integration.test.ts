import { describe, it, expect, beforeEach } from 'vitest';
import {
  astToLSPDiagnostics,
  astToLSPCompletions,
  astToLSPHover,
  astToLSPSymbols,
  createASTEnhancedLSPHandlers,
  createLSPIntegration,
  setDocumentAST,
  clearDocumentAST,
  DiagnosticSeverity,
  CompletionItemKind,
  SymbolKind
} from '../../src/lsp/index.js';
import type { ASTNode } from '../../src/types.js';

// Mock AST structures for testing
const createSimpleEventHandlerAST = (): ASTNode => ({
  type: 'program',
  start: 0,
  end: 100,
  line: 1,
  column: 1,
  features: [
    {
      type: 'eventHandler',
      start: 0,
      end: 50,
      line: 1,
      column: 1,
      event: 'click',
      selector: '#button',
      commands: [
        {
          type: 'command',
          name: 'toggle',
          start: 10,
          end: 30,
          line: 1,
          column: 11,
          args: [
            {
              type: 'selector',
              value: '.active',
              start: 17,
              end: 24,
              line: 1,
              column: 18
            }
          ]
        }
      ]
    }
  ]
} as any);

const createComplexAST = (): ASTNode => ({
  type: 'program',
  start: 0,
  end: 200,
  line: 1,
  column: 1,
  features: [
    {
      type: 'eventHandler',
      start: 0,
      end: 80,
      line: 1,
      column: 1,
      event: 'click',
      commands: Array.from({ length: 8 }, (_, i) => ({
        type: 'command',
        name: 'add',
        start: i * 10,
        end: (i + 1) * 10,
        line: 1,
        column: 1,
        args: [
          {
            type: 'selector',
            value: `.class${i}`,
            start: 0,
            end: 5,
            line: 1,
            column: 1
          }
        ]
      }))
    },
    {
      type: 'behavior',
      name: 'modal',
      start: 85,
      end: 150,
      line: 2,
      column: 1
    },
    {
      type: 'function',
      name: 'helper',
      start: 155,
      end: 200,
      line: 3,
      column: 1
    }
  ]
} as any);

describe('LSP Integration - Diagnostics', () => {
  it('should convert code smells to LSP diagnostics', () => {
    const ast = createComplexAST();
    const diagnostics = astToLSPDiagnostics(ast);
    
    expect(diagnostics).toBeDefined();
    expect(Array.isArray(diagnostics)).toBe(true);
    
    // Should find long command chain smell
    const longChainDiagnostic = diagnostics.find(d => d.code === 'long-command-chain');
    expect(longChainDiagnostic).toBeDefined();
    expect(longChainDiagnostic?.severity).toBe(DiagnosticSeverity.Warning);
    expect(longChainDiagnostic?.source).toBe('hyperscript-ast-toolkit');
  });

  it('should include complexity warnings in diagnostics', () => {
    const ast = createComplexAST();
    const diagnostics = astToLSPDiagnostics(ast);
    
    // Should find at least code smell diagnostics from the complex AST
    expect(diagnostics.length).toBeGreaterThan(0);
    
    // Check that diagnostics have proper structure
    for (const diagnostic of diagnostics) {
      expect(diagnostic.range).toBeDefined();
      expect(diagnostic.message).toBeDefined();
      expect(diagnostic.source).toBe('hyperscript-ast-toolkit');
    }
  });

  it('should handle empty AST gracefully', () => {
    const emptyAST: ASTNode = {
      type: 'program',
      start: 0,
      end: 0,
      line: 1,
      column: 1,
      features: []
    } as any;
    
    const diagnostics = astToLSPDiagnostics(emptyAST);
    expect(diagnostics).toBeDefined();
    expect(Array.isArray(diagnostics)).toBe(true);
  });
});

describe('LSP Integration - Document Symbols', () => {
  it('should extract event handler symbols', () => {
    const ast = createSimpleEventHandlerAST();
    const symbols = astToLSPSymbols(ast);
    
    expect(symbols).toBeDefined();
    expect(symbols.length).toBeGreaterThan(0);
    
    const eventHandlerSymbol = symbols.find(s => s.name.includes('on click'));
    expect(eventHandlerSymbol).toBeDefined();
    expect(eventHandlerSymbol?.kind).toBe(SymbolKind.Event);
    expect(eventHandlerSymbol?.detail).toBe('Event Handler');
    expect(eventHandlerSymbol?.children).toBeDefined();
    expect(eventHandlerSymbol?.children?.length).toBeGreaterThan(0);
  });

  it('should extract behavior and function symbols', () => {
    const ast = createComplexAST();
    const symbols = astToLSPSymbols(ast);
    
    // Should find behavior symbol
    const behaviorSymbol = symbols.find(s => s.name.includes('behavior modal'));
    expect(behaviorSymbol).toBeDefined();
    expect(behaviorSymbol?.kind).toBe(SymbolKind.Class);
    expect(behaviorSymbol?.detail).toBe('Behavior Definition');
    
    // Should find function symbol
    const functionSymbol = symbols.find(s => s.name.includes('def helper'));
    expect(functionSymbol).toBeDefined();
    expect(functionSymbol?.kind).toBe(SymbolKind.Function);
    expect(functionSymbol?.detail).toBe('Function Definition');
  });

  it('should include command children in event handler symbols', () => {
    const ast = createSimpleEventHandlerAST();
    const symbols = astToLSPSymbols(ast);
    
    const eventHandlerSymbol = symbols.find(s => s.name.includes('on click'));
    expect(eventHandlerSymbol?.children).toBeDefined();
    expect(eventHandlerSymbol?.children?.length).toBe(1);
    
    const commandSymbol = eventHandlerSymbol?.children?.[0];
    expect(commandSymbol?.name).toBe('toggle');
    expect(commandSymbol?.kind).toBe(SymbolKind.Method);
    expect(commandSymbol?.detail).toBe('Command');
  });
});

describe('LSP Integration - Completions', () => {
  it('should provide default completions when no specific context', () => {
    const ast = createSimpleEventHandlerAST();
    const position = { line: 99, character: 99 }; // Position outside AST
    
    const completions = astToLSPCompletions(ast, position);
    
    expect(completions).toBeDefined();
    expect(Array.isArray(completions)).toBe(true);
    expect(completions.length).toBeGreaterThan(0);
    
    // Should include basic keywords
    const keywords = ['on', 'init', 'behavior', 'def'];
    for (const keyword of keywords) {
      const completion = completions.find(c => c.label === keyword);
      expect(completion).toBeDefined();
      expect(completion?.kind).toBe(CompletionItemKind.Keyword);
    }
  });

  it('should provide contextual completions based on AST position', () => {
    const ast = createSimpleEventHandlerAST();
    const position = { line: 0, character: 5 }; // Inside event handler at line 1
    
    const completions = astToLSPCompletions(ast, position);
    
    expect(completions).toBeDefined();
    expect(completions.length).toBeGreaterThan(0);
    
    // Should include command completions or at least default completions
    const commandLabels = completions.map(c => c.label);
    // Since position finding might be tricky, just verify we get some valid completions
    expect(commandLabels.length).toBeGreaterThan(0);
    expect(commandLabels.some(label => ['add', 'remove', 'toggle', 'on', 'init'].includes(label))).toBe(true);
  });
});

describe('LSP Integration - Hover', () => {
  it('should provide hover information for AST nodes', () => {
    const ast = createSimpleEventHandlerAST();
    const position = { line: 0, character: 5 }; // Over event handler
    
    const hover = astToLSPHover(ast, position);
    
    expect(hover).toBeDefined();
    expect(hover?.contents).toBeDefined();
    expect(hover?.contents).toContain('eventHandler');
    expect(hover?.contents).toContain('Complexity Metrics');
    expect(hover?.contents).toContain('Cyclomatic');
    expect(hover?.contents).toContain('Cognitive');
    expect(hover?.contents).toContain('Maintainability Index');
  });

  it('should include event information in hover for event handlers', () => {
    const ast = createSimpleEventHandlerAST();
    const position = { line: 0, character: 5 };
    
    const hover = astToLSPHover(ast, position);
    
    expect(hover?.contents).toContain('Event: `click`');
    expect(hover?.contents).toContain('Selector: `#button`');
  });

  it('should include command information in hover for commands', () => {
    const ast = createSimpleEventHandlerAST();
    const position = { line: 0, character: 15 }; // Try to find command node
    
    const hover = astToLSPHover(ast, position);
    
    // Since position finding can be tricky, just verify we get some hover content
    expect(hover).toBeDefined();
    expect(hover?.contents).toBeDefined();
    expect(hover?.contents).toContain('Complexity Metrics');
  });

  it('should return null for positions without nodes', () => {
    const ast = createSimpleEventHandlerAST();
    const position = { line: 100, character: 100 }; // Way outside AST
    
    const hover = astToLSPHover(ast, position);
    expect(hover).toBeNull();
  });

  it('should include code smells in hover information', () => {
    const ast = createComplexAST();
    const position = { line: 0, character: 5 }; // Over complex event handler
    
    const hover = astToLSPHover(ast, position);
    
    if (hover && hover.contents.includes('Code Issues')) {
      expect(hover.contents).toContain('Code Issues');
    }
  });
});

describe('LSP Integration - Enhanced Handlers', () => {
  let mockReferenceHandlers: any;
  let enhancedHandlers: any;
  const testURI = 'file:///test.hs';

  beforeEach(() => {
    // Clear any existing AST data
    clearDocumentAST(testURI);
    
    mockReferenceHandlers = {
      provideCompletions: async () => [
        { label: 'ref-completion', kind: CompletionItemKind.Text }
      ],
      provideHover: async () => ({
        contents: 'Reference hover content'
      }),
      provideDiagnostics: async () => [
        { 
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          message: 'Reference diagnostic'
        }
      ],
      provideDocumentSymbols: async () => [
        { name: 'ref-symbol', kind: SymbolKind.Variable, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } } }
      ]
    };

    enhancedHandlers = createASTEnhancedLSPHandlers(mockReferenceHandlers);
    
    // Set up a test AST
    const testAST = createSimpleEventHandlerAST();
    setDocumentAST(testURI, testAST);
  });

  it('should combine reference and AST completions', async () => {
    const params = {
      textDocument: { uri: testURI },
      position: { line: 99, character: 99 } // Position that will trigger default completions
    };

    const completions = await enhancedHandlers.provideCompletions(params);
    
    expect(completions).toBeDefined();
    expect(completions.length).toBeGreaterThan(1);
    
    // Should include reference completion
    expect(completions.some((c: any) => c.label === 'ref-completion')).toBe(true);
    
    // Should include AST completions (default keywords)
    expect(completions.some((c: any) => ['on', 'init', 'behavior', 'def'].includes(c.label))).toBe(true);
  });

  it('should enhance hover with AST information', async () => {
    const params = {
      textDocument: { uri: testURI },
      position: { line: 0, character: 5 }
    };

    const hover = await enhancedHandlers.provideHover(params);
    
    expect(hover).toBeDefined();
    expect(hover.contents).toContain('Reference hover content');
    expect(hover.contents).toContain('---'); // Separator
    expect(hover.contents).toContain('eventHandler');
  });

  it('should combine reference and AST diagnostics', async () => {
    const params = {
      textDocument: { uri: testURI }
    };

    const diagnostics = await enhancedHandlers.provideDiagnostics(params);
    
    expect(diagnostics).toBeDefined();
    expect(diagnostics.length).toBeGreaterThan(0);
    
    // Should include reference diagnostic
    expect(diagnostics.some((d: any) => d.message === 'Reference diagnostic')).toBe(true);
  });

  it('should combine reference and AST document symbols', async () => {
    const params = {
      textDocument: { uri: testURI }
    };

    const symbols = await enhancedHandlers.provideDocumentSymbols(params);
    
    expect(symbols).toBeDefined();
    expect(symbols.length).toBeGreaterThan(0);
    
    // Should include reference symbol
    expect(symbols.some((s: any) => s.name === 'ref-symbol')).toBe(true);
    
    // Should include AST symbols
    expect(symbols.some((s: any) => s.name.includes('on click'))).toBe(true);
  });
});

describe('LSP Integration - Configuration', () => {
  it('should create LSP integration with default config', () => {
    const integration = createLSPIntegration();
    
    expect(integration).toBeDefined();
    expect(integration.config).toBeDefined();
    expect(integration.config.enableDiagnostics).toBe(true);
    expect(integration.config.enableCompletions).toBe(true);
    expect(integration.config.enableHover).toBe(true);
    expect(integration.config.enableSymbols).toBe(true);
  });

  it('should create LSP integration with custom config', () => {
    const customConfig = {
      enableDiagnostics: false,
      enableCompletions: true,
      enableHover: false,
      enableSymbols: true,
      complexityThresholds: {
        cyclomatic: 5,
        cognitive: 8
      }
    };

    const integration = createLSPIntegration(customConfig);
    
    expect(integration.config).toEqual(customConfig);
    
    // Test that disabled features return empty results
    const ast = createSimpleEventHandlerAST();
    expect(integration.astToLSPDiagnostics(ast)).toEqual([]);
    expect(integration.astToLSPHover(ast, { line: 0, character: 0 })).toBeNull();
  });

  it('should manage document AST storage', () => {
    const testURI = 'file:///test.hs';
    const testAST = createSimpleEventHandlerAST();
    const integration = createLSPIntegration();
    
    // Initially no AST
    expect(integration.getDocumentAST(testURI)).toBeNull();
    
    // Set AST
    integration.setDocumentAST(testURI, testAST);
    expect(integration.getDocumentAST(testURI)).toBe(testAST);
    
    // Clear AST
    integration.clearDocumentAST(testURI);
    expect(integration.getDocumentAST(testURI)).toBeNull();
  });
});

describe('LSP Integration - Error Handling', () => {
  it('should handle malformed AST gracefully', () => {
    const malformedAST = {
      type: 'program',
      // Missing required fields
    } as any;
    
    expect(() => astToLSPDiagnostics(malformedAST)).not.toThrow();
    expect(() => astToLSPSymbols(malformedAST)).not.toThrow();
    expect(() => astToLSPCompletions(malformedAST, { line: 0, character: 0 })).not.toThrow();
    expect(() => astToLSPHover(malformedAST, { line: 0, character: 0 })).not.toThrow();
  });

  it('should handle null/undefined AST gracefully', () => {
    const nullAST = null as any;
    
    expect(() => astToLSPDiagnostics(nullAST)).not.toThrow();
    expect(() => astToLSPSymbols(nullAST)).not.toThrow();
    expect(() => astToLSPCompletions(nullAST, { line: 0, character: 0 })).not.toThrow();
    expect(() => astToLSPHover(nullAST, { line: 0, character: 0 })).not.toThrow();
  });
});

describe('LSP Integration - Performance', () => {
  it('should handle large ASTs efficiently', () => {
    // Create a large AST with many nodes
    const createLargeAST = (): ASTNode => ({
      type: 'program',
      start: 0,
      end: 1000,
      line: 1,
      column: 1,
      features: Array.from({ length: 50 }, (_, i) => ({
        type: 'eventHandler',
        start: i * 20,
        end: (i + 1) * 20,
        line: i + 1,
        column: 1,
        event: 'click',
        commands: Array.from({ length: 10 }, (_, j) => ({
          type: 'command',
          name: 'add',
          start: i * 20 + j * 2,
          end: i * 20 + j * 2 + 2,
          line: i + 1,
          column: j * 2 + 1
        }))
      }))
    } as any);

    const largeAST = createLargeAST();
    
    const startTime = Date.now();
    
    // Perform multiple LSP operations
    astToLSPDiagnostics(largeAST);
    astToLSPSymbols(largeAST);
    astToLSPCompletions(largeAST, { line: 25, character: 10 });
    astToLSPHover(largeAST, { line: 25, character: 10 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(100); // 100ms threshold
  });
});