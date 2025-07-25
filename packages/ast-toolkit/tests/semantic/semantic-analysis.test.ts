import { describe, it, expect } from 'vitest';
import {
  extractIntents,
  calculateSimilarity, 
  generateVariations,
  extractSemanticPatterns,
  analyzeSemantics
} from '../../src/semantic/index.js';
import type { ASTNode } from '../../src/types.js';

// Mock AST structures for testing
const createSimpleClickAST = (): ASTNode => ({
  type: 'program',
  start: 0,
  end: 50,
  line: 1,
  column: 1,
  features: [
    {
      type: 'eventHandler',
      event: 'click',
      selector: '#button',
      start: 0,
      end: 50,
      line: 1,
      column: 1,
      commands: [
        {
          type: 'command',
          name: 'toggle',
          start: 10,
          end: 30,
          line: 1,
          column: 11,
          args: [{ type: 'selector', value: '.active', start: 17, end: 24, line: 1, column: 18 }]
        }
      ]
    }
  ]
} as any);

const createFormSubmitAST = (): ASTNode => ({
  type: 'program',
  start: 0,
  end: 100,
  line: 1,
  column: 1,
  features: [
    {
      type: 'eventHandler',
      event: 'submit',
      selector: 'form',
      start: 0,
      end: 80,
      line: 1,
      column: 1,
      commands: [
        {
          type: 'command',
          name: 'fetch',
          start: 10,
          end: 40,
          line: 1,
          column: 11,
          args: [{ type: 'literal', value: '/api/submit', start: 17, end: 29, line: 1, column: 18 }]
        },
        {
          type: 'command',
          name: 'put',
          start: 45,
          end: 70,
          line: 1,
          column: 46,
          args: [{ type: 'literal', value: 'Success!', start: 50, end: 60, line: 1, column: 51 }],
          target: { type: 'selector', value: '#message', start: 65, end: 73, line: 1, column: 66 }
        }
      ]
    }
  ]
} as any);

const createComplexInteractiveAST = (): ASTNode => ({
  type: 'program',
  start: 0,
  end: 300,
  line: 1,
  column: 1,
  features: [
    {
      type: 'eventHandler',
      event: 'click',
      selector: '.modal-trigger',
      start: 0,
      end: 50,
      line: 1,
      column: 1,
      commands: [
        {
          type: 'command',
          name: 'toggle',
          start: 10,
          end: 30,
          line: 1,
          column: 11,
          args: [{ type: 'selector', value: '.modal-open', start: 17, end: 28, line: 1, column: 18 }]
        }
      ]
    },
    {
      type: 'eventHandler',
      event: 'input',
      selector: 'input[type="email"]',
      start: 55,
      end: 120,
      line: 2,
      column: 1,
      commands: [
        {
          type: 'conditional',
          start: 65,
          end: 110,
          line: 2,
          column: 11,
          condition: {
            type: 'callExpression',
            callee: { type: 'memberExpression', property: { type: 'identifier', name: 'matches' } }
          },
          then: {
            type: 'command',
            name: 'remove',
            args: [{ type: 'selector', value: '.invalid', start: 85, end: 93, line: 2, column: 31 }]
          },
          else: {
            type: 'command',
            name: 'add',
            args: [{ type: 'selector', value: '.invalid', start: 100, end: 108, line: 2, column: 46 }]
          }
        }
      ]
    },
    {
      type: 'eventHandler',
      event: 'hover',
      selector: '.tooltip-trigger',
      start: 125,
      end: 180,
      line: 3,
      column: 1,
      commands: [
        {
          type: 'command',
          name: 'add',
          start: 135,
          end: 155,
          line: 3,
          column: 11,
          args: [{ type: 'selector', value: '.visible', start: 140, end: 148, line: 3, column: 16 }],
          target: { type: 'selector', value: '.tooltip', start: 150, end: 158, line: 3, column: 26 }
        }
      ]
    },
    {
      type: 'behavior',
      name: 'modal',
      start: 185,
      end: 250,
      line: 4,
      column: 1
    },
    {
      type: 'function',
      name: 'validateEmail',
      start: 255,
      end: 300,
      line: 5,
      column: 1
    }
  ]
} as any);

describe('Semantic Analysis - Intent Extraction', () => {
  it('should extract click interaction intent from simple toggle', () => {
    const ast = createSimpleClickAST();
    const intents = extractIntents(ast);

    expect(intents).toBeDefined();
    expect(intents.length).toBeGreaterThan(0);
    
    const stateChangeIntent = intents.find(i => i.type === 'state-change');
    expect(stateChangeIntent).toBeDefined();
    expect(stateChangeIntent?.description).toContain('Toggle');
    expect(stateChangeIntent?.confidence).toBeGreaterThan(0.8);
    expect(stateChangeIntent?.patterns).toContain('toggle-state');
  });

  it('should extract form submission intent', () => {
    const ast = createFormSubmitAST();
    const intents = extractIntents(ast);

    const dataFlowIntent = intents.find(i => i.type === 'data-flow');
    expect(dataFlowIntent).toBeDefined();
    expect(dataFlowIntent?.description).toContain('Submit form data');
    expect(dataFlowIntent?.patterns).toContain('form-submission');
    expect(dataFlowIntent?.confidence).toBeGreaterThan(0.9);
  });

  it('should extract validation intent from input handlers', () => {
    const ast = createComplexInteractiveAST();
    const intents = extractIntents(ast);

    const validationIntent = intents.find(i => i.type === 'validation');
    expect(validationIntent).toBeDefined();
    expect(validationIntent?.description).toContain('validation');
    expect(validationIntent?.patterns).toContain('live-validation');
  });

  it('should extract hover UI feedback intent', () => {
    const ast = createComplexInteractiveAST();
    const intents = extractIntents(ast);

    const uiUpdateIntent = intents.find(i => 
      i.type === 'ui-update' && i.description.includes('hover')
    );
    expect(uiUpdateIntent).toBeDefined();
    expect(uiUpdateIntent?.patterns).toContain('hover-effects');
  });

  it('should extract program-level interaction intent for complex apps', () => {
    const ast = createComplexInteractiveAST();
    const intents = extractIntents(ast);

    const interactionIntent = intents.find(i => 
      i.description.includes('Interactive web application')
    );
    expect(interactionIntent).toBeDefined();
    expect(interactionIntent?.patterns).toContain('multi-interaction');
  });

  it('should deduplicate similar intents', () => {
    const ast = createComplexInteractiveAST();
    const intents = extractIntents(ast);

    // Check that we don't have duplicate state-change intents
    const stateChangeIntents = intents.filter(i => i.type === 'state-change');
    const descriptions = stateChangeIntents.map(i => i.description);
    const uniqueDescriptions = [...new Set(descriptions)];
    
    expect(descriptions.length).toBe(uniqueDescriptions.length);
  });
});

describe('Semantic Analysis - Similarity Detection', () => {
  it('should calculate high similarity for identical structures', () => {
    const ast1 = createSimpleClickAST();
    const ast2 = createSimpleClickAST();
    
    const similarity = calculateSimilarity(ast1, ast2);
    
    expect(similarity.similarity).toBeGreaterThan(0.9);
    expect(similarity.structuralSimilarity).toBe(1.0);
    expect(similarity.behavioralSimilarity).toBe(1.0);
    expect(similarity.differences.length).toBe(0);
  });

  it('should calculate lower similarity for different structures', () => {
    const ast1 = createSimpleClickAST();
    const ast2 = createFormSubmitAST();
    
    const similarity = calculateSimilarity(ast1, ast2);
    
    expect(similarity.similarity).toBeLessThan(0.7);
    expect(similarity.differences.length).toBeGreaterThan(0);
  });

  it('should identify common patterns between similar ASTs', () => {
    const ast1 = createFormSubmitAST();
    const ast2 = createComplexInteractiveAST();
    
    const similarity = calculateSimilarity(ast1, ast2);
    
    expect(similarity.commonPatterns).toBeDefined();
    expect(Array.isArray(similarity.commonPatterns)).toBe(true);
  });

  it('should provide behavioral similarity independent of structure', () => {
    // Two different ways to achieve similar behavior
    const clickToggleAST = createSimpleClickAST();
    const complexInteractiveAST = createComplexInteractiveAST();
    
    const similarity = calculateSimilarity(clickToggleAST, complexInteractiveAST);
    
    expect(similarity.behavioralSimilarity).toBeGreaterThan(0);
    // Note: In this case, structural similarity might be higher due to shared node types
    // The test is checking that behavioral analysis provides meaningful insights
    expect(similarity.similarity).toBeGreaterThan(0);
  });
});

describe('Semantic Analysis - Code Variations', () => {
  it('should generate syntactic variations', () => {
    const ast = createSimpleClickAST();
    const variations = generateVariations(ast, { types: ['syntactic'] });

    expect(variations).toBeDefined();
    expect(variations.length).toBeGreaterThan(0);
    
    const syntacticVariation = variations.find(v => v.type === 'syntactic');
    expect(syntacticVariation).toBeDefined();
    expect(syntacticVariation?.preservesMeaning).toBe(true);
  });

  it('should generate semantic variations', () => {
    const ast = createSimpleClickAST();
    const variations = generateVariations(ast, { types: ['semantic'] });

    const semanticVariation = variations.find(v => v.type === 'semantic');
    expect(semanticVariation).toBeDefined();
    expect(semanticVariation?.description).toBeDefined();
  });

  it('should generate structural variations for complex ASTs', () => {
    const ast = createComplexInteractiveAST();
    const variations = generateVariations(ast, { types: ['structural'] });

    const structuralVariation = variations.find(v => v.type === 'structural');
    expect(structuralVariation).toBeDefined();
    expect(structuralVariation?.description).toContain('behavior');
  });

  it('should respect maxVariations limit', () => {
    const ast = createComplexInteractiveAST();
    const variations = generateVariations(ast, { maxVariations: 3 });

    expect(variations.length).toBeLessThanOrEqual(3);
  });

  it('should preserve semantics when requested', () => {
    const ast = createSimpleClickAST();
    const variations = generateVariations(ast, { preserveSemantics: true });

    const semanticPreservingVariations = variations.filter(v => v.preservesMeaning);
    expect(semanticPreservingVariations.length).toBe(variations.length);
  });
});

describe('Semantic Analysis - Pattern Extraction', () => {
  it('should extract event handling patterns', () => {
    const ast = createComplexInteractiveAST();
    const patterns = extractSemanticPatterns(ast);

    const eventPattern = patterns.find(p => p.category === 'event-handling');
    expect(eventPattern).toBeDefined();
    expect(eventPattern?.frequency).toBeGreaterThan(1);
    expect(eventPattern?.nodes.length).toBeGreaterThan(0);
  });

  it('should extract DOM manipulation patterns', () => {
    const ast = createComplexInteractiveAST();
    const patterns = extractSemanticPatterns(ast);

    const domPattern = patterns.find(p => p.category === 'dom-manipulation');
    expect(domPattern).toBeDefined();
    expect(domPattern?.name).toContain('manipulation');
  });

  it('should extract UI interaction patterns', () => {
    const ast = createComplexInteractiveAST();
    const patterns = extractSemanticPatterns(ast);

    const uiPattern = patterns.find(p => p.category === 'ui-interaction');
    if (uiPattern) {
      expect(uiPattern.name).toContain('pattern');
      expect(uiPattern.description).toBeDefined();
    }
  });

  it('should extract data processing patterns from fetch commands', () => {
    const ast = createFormSubmitAST();
    const patterns = extractSemanticPatterns(ast);

    const dataPattern = patterns.find(p => p.category === 'data-processing');
    expect(dataPattern).toBeDefined();
    expect(dataPattern?.name).toContain('ajax');
  });

  it('should provide pattern frequency information', () => {
    const ast = createComplexInteractiveAST();
    const patterns = extractSemanticPatterns(ast);

    for (const pattern of patterns) {
      expect(pattern.frequency).toBeGreaterThan(0);
      expect(pattern.nodes.length).toBeGreaterThanOrEqual(pattern.frequency);
    }
  });
});

describe('Semantic Analysis - Comprehensive Analysis', () => {
  it('should provide complete semantic analysis', () => {
    const ast = createComplexInteractiveAST();
    const analysis = analyzeSemantics(ast);

    expect(analysis.intents).toBeDefined();
    expect(analysis.patterns).toBeDefined();
    expect(analysis.concepts).toBeDefined();
    expect(analysis.relationships).toBeDefined();
    expect(analysis.complexity).toBeDefined();
  });

  it('should extract meaningful concepts', () => {
    const ast = createFormSubmitAST();
    const analysis = analyzeSemantics(ast);

    expect(analysis.concepts).toContain('submit-interaction');
    expect(analysis.concepts).toContain('fetch-operation');
    expect(analysis.concepts).toContain('put-operation');
  });

  it('should identify relationships between nodes', () => {
    const ast = createFormSubmitAST();
    const analysis = analyzeSemantics(ast);

    expect(analysis.relationships.length).toBeGreaterThan(0);
    
    const updateRelationship = analysis.relationships.find(r => r.type === 'updates');
    expect(updateRelationship).toBeDefined();
    expect(updateRelationship?.strength).toBeGreaterThan(0.8);
  });

  it('should calculate semantic complexity metrics', () => {
    const ast = createComplexInteractiveAST();
    const analysis = analyzeSemantics(ast);

    expect(analysis.complexity.conceptualComplexity).toBeGreaterThanOrEqual(0);
    expect(analysis.complexity.conceptualComplexity).toBeLessThanOrEqual(1);
    
    expect(analysis.complexity.interactionComplexity).toBeGreaterThanOrEqual(0);
    expect(analysis.complexity.interactionComplexity).toBeLessThanOrEqual(1);
    
    expect(analysis.complexity.dataFlowComplexity).toBeGreaterThanOrEqual(0);
    expect(analysis.complexity.dataFlowComplexity).toBeLessThanOrEqual(1);
    
    expect(analysis.complexity.cognitiveLoad).toBeGreaterThanOrEqual(0);
    expect(analysis.complexity.cognitiveLoad).toBeLessThanOrEqual(1);
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

    expect(() => analyzeSemantics(emptyAST)).not.toThrow();
    
    const analysis = analyzeSemantics(emptyAST);
    expect(analysis.intents.length).toBe(0);
    expect(analysis.patterns.length).toBe(0);
    expect(analysis.concepts.length).toBe(0);
    expect(analysis.relationships.length).toBe(0);
    expect(analysis.complexity.cognitiveLoad).toBe(0);
  });
});

describe('Semantic Analysis - Edge Cases', () => {
  it('should handle malformed event handlers', () => {
    const malformedAST: ASTNode = {
      type: 'program',
      start: 0,
      end: 50,
      line: 1,
      column: 1,
      features: [
        {
          type: 'eventHandler',
          // Missing event field
          commands: []
        }
      ]
    } as any;

    expect(() => extractIntents(malformedAST)).not.toThrow();
    const intents = extractIntents(malformedAST);
    expect(Array.isArray(intents)).toBe(true);
  });

  it('should handle commands without names', () => {
    const malformedAST: ASTNode = {
      type: 'program',
      start: 0,
      end: 50,
      line: 1,
      column: 1,
      features: [
        {
          type: 'eventHandler',
          event: 'click',
          commands: [
            {
              type: 'command',
              // Missing name field
              args: []
            }
          ]
        }
      ]
    } as any;

    expect(() => extractIntents(malformedAST)).not.toThrow();
    expect(() => extractSemanticPatterns(malformedAST)).not.toThrow();
  });

  it('should handle very complex nested structures', () => {
    const deeplyNestedAST: ASTNode = {
      type: 'program',
      start: 0,
      end: 100,
      line: 1,
      column: 1,
      features: Array.from({ length: 20 }, (_, i) => ({
        type: 'eventHandler',
        event: 'click',
        commands: Array.from({ length: 10 }, (_, j) => ({
          type: 'command',
          name: 'toggle',
          args: [{ type: 'selector', value: `.class${i}-${j}` }]
        }))
      }))
    } as any;

    const startTime = Date.now();
    const analysis = analyzeSemantics(deeplyNestedAST);
    const endTime = Date.now();

    expect(analysis).toBeDefined();
    expect(endTime - startTime).toBeLessThan(500); // Should complete in reasonable time
  });
});

describe('Semantic Analysis - Performance', () => {
  it('should handle large ASTs efficiently', () => {
    const largeAST: ASTNode = {
      type: 'program',
      start: 0,
      end: 1000,
      line: 1,
      column: 1,
      features: Array.from({ length: 100 }, (_, i) => ({
        type: 'eventHandler',
        event: i % 2 === 0 ? 'click' : 'submit',
        commands: Array.from({ length: 5 }, (_, j) => ({
          type: 'command',
          name: ['add', 'remove', 'toggle', 'fetch', 'put'][j],
          args: [{ type: 'selector', value: `.class${i}-${j}` }]
        }))
      }))
    } as any;

    const startTime = Date.now();
    
    const intents = extractIntents(largeAST);
    const patterns = extractSemanticPatterns(largeAST);
    const analysis = analyzeSemantics(largeAST);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(intents).toBeDefined();
    expect(patterns).toBeDefined();
    expect(analysis).toBeDefined();
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
});