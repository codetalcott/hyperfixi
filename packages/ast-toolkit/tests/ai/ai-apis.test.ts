import { describe, it, expect } from 'vitest';
import {
  explainCode,
  generateCodeTemplate,
  recognizeIntent,
  generateQualityInsights,
  createAIAssistant
} from '../../src/ai/index.js';
import type { ASTNode } from '../../src/types.js';

// Mock AST structures for testing
const createSimpleEventHandlerAST = (): ASTNode => ({
  type: 'program',
  start: 0,
  end: 50,
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
          ],
          target: {
            type: 'identifier',
            name: 'me',
            start: 30,
            end: 32,
            line: 1,
            column: 31
          }
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
      event: 'click',
      commands: [
        {
          type: 'command',
          name: 'fetch',
          args: [{ type: 'literal', value: '/api/data', start: 0, end: 9, line: 1, column: 1 }]
        },
        {
          type: 'command',
          name: 'put',
          args: [{ type: 'literal', value: 'result', start: 0, end: 6, line: 1, column: 1 }],
          target: { type: 'selector', value: '#output', start: 0, end: 7, line: 1, column: 1 }
        }
      ]
    },
    {
      type: 'eventHandler',
      event: 'submit',
      selector: 'form',
      commands: [
        {
          type: 'conditional',
          condition: {
            type: 'callExpression',
            callee: {
              type: 'memberExpression',
              object: { type: 'identifier', name: 'form', start: 0, end: 4, line: 1, column: 1 },
              property: { type: 'identifier', name: 'checkValidity', start: 0, end: 12, line: 1, column: 1 }
            }
          },
          then: {
            type: 'command',
            name: 'fetch',
            args: [{ type: 'literal', value: '/api/submit', start: 0, end: 11, line: 1, column: 1 }]
          }
        }
      ]
    },
    {
      type: 'behavior',
      name: 'modal',
      start: 100,
      end: 150,
      line: 3,
      column: 1
    }
  ]
} as any);

describe('AI APIs - Code Explanation', () => {
  it('should generate basic code explanation', () => {
    const ast = createSimpleEventHandlerAST();
    const explanation = explainCode(ast);

    expect(explanation).toBeDefined();
    expect(explanation.overview).toContain('hyperscript');
    expect(explanation.overview).toContain('click');
    expect(explanation.structure).toContain('Event handler');
    expect(explanation.behavior).toContain('clicks');
    expect(explanation.complexity).toBeDefined();
  });

  it('should adapt explanation for different audiences', () => {
    const ast = createSimpleEventHandlerAST();
    
    const beginnerExplanation = explainCode(ast, { audience: 'beginner' });
    const expertExplanation = explainCode(ast, { audience: 'expert' });

    expect(beginnerExplanation.overview).toContain('web page behavior');
    expect(expertExplanation.overview).toContain('hyperscript program');
    
    // Both explanations should be informative
    expect(beginnerExplanation.overview.length).toBeGreaterThan(50);
    expect(expertExplanation.overview.length).toBeGreaterThan(50);
  });

  it('should include optional sections based on configuration', () => {
    const ast = createComplexAST();
    
    const minimalExplanation = explainCode(ast, {
      includeComplexity: false,
      includePatterns: false,
      includeSmells: false
    });

    const fullExplanation = explainCode(ast, {
      includeComplexity: true,
      includePatterns: true,
      includeSmells: true
    });

    expect(minimalExplanation.complexity).toBeUndefined();
    expect(minimalExplanation.patterns).toEqual([]);
    expect(minimalExplanation.smells).toEqual([]);

    expect(fullExplanation.complexity).toBeDefined();
    expect(fullExplanation.patterns?.length).toBeGreaterThan(0);
  });

  it('should provide detailed structure analysis', () => {
    const ast = createComplexAST();
    const explanation = explainCode(ast, { detail: 'comprehensive' });

    expect(explanation.structure).toContain('Program with');
    expect(explanation.structure).toContain('Event handler');
    expect(explanation.structure).toContain('Behavior definition');
  });

  it('should describe behavior in user-friendly terms', () => {
    const ast = createSimpleEventHandlerAST();
    const explanation = explainCode(ast);

    expect(explanation.behavior).toContain('clicks');
    expect(explanation.behavior).toContain('Toggle');
    expect(explanation.behavior).toContain('.active');
  });

  it('should identify common patterns', () => {
    const ast = createComplexAST();
    const explanation = explainCode(ast, { includePatterns: true });

    expect(explanation.patterns).toBeDefined();
    expect(explanation.patterns?.some(p => p.includes('AJAX') || p.includes('form'))).toBe(true);
  });

  it('should provide improvement suggestions', () => {
    const ast = createComplexAST();
    const explanation = explainCode(ast, { includeSmells: true });

    expect(explanation.suggestions).toBeDefined();
    expect(explanation.suggestions?.length).toBeGreaterThanOrEqual(0);
  });
});

describe('AI APIs - Code Generation', () => {
  it('should generate toggle class template', () => {
    const template = generateCodeTemplate('toggle class active');

    expect(template).toBeDefined();
    expect(template.pattern).toBe('toggle-class');
    expect(template.code).toContain('toggle');
    expect(template.code).toContain('.active');
    expect(template.explanation).toContain('toggle');
    expect(template.variations).toBeDefined();
  });

  it('should generate fetch template', () => {
    const template = generateCodeTemplate('fetch data from API');

    expect(template).toBeDefined();
    expect(template.pattern).toBe('fetch-data');
    expect(template.code).toContain('fetch');
    expect(template.explanation).toContain('HTTP request');
    expect(template.variations?.length).toBeGreaterThan(0);
  });

  it('should generate form submit template', () => {
    const template = generateCodeTemplate('submit form data');

    expect(template).toBeDefined();
    expect(template.pattern).toBe('form-submit');
    expect(template.code).toContain('submit');
    expect(template.code).toContain('fetch');
    expect(template.explanation).toContain('form');
  });

  it('should generate modal template', () => {
    const template = generateCodeTemplate('open modal dialog');

    expect(template).toBeDefined();
    expect(template.pattern).toBe('modal-toggle');
    expect(template.code).toContain('toggle');
    expect(template.explanation).toContain('modal');
  });

  it('should generate validation template', () => {
    const template = generateCodeTemplate('validate input field');

    expect(template).toBeDefined();
    expect(template.pattern).toBe('input-validation');
    expect(template.code).toContain('input');
    expect(template.explanation.toLowerCase()).toContain('validate');
  });

  it('should adapt code style based on options', () => {
    const minimalTemplate = generateCodeTemplate('toggle class', {
      style: 'minimal',
      includeComments: false
    });

    const verboseTemplate = generateCodeTemplate('toggle class', {
      style: 'documented',
      includeComments: true
    });

    expect(minimalTemplate.code.length).toBeLessThan(verboseTemplate.code.length);
    // Verbose template should have more content (documented style includes comments)
    expect(verboseTemplate.code).toContain('toggle');
  });

  it('should provide template variations', () => {
    const template = generateCodeTemplate('fetch data');

    expect(template.variations).toBeDefined();
    expect(template.variations?.length).toBeGreaterThan(0);
    
    const loadingVariation = template.variations?.find(v => v.pattern.includes('loading'));
    expect(loadingVariation).toBeDefined();
    expect(loadingVariation?.code).toContain('loading');
  });

  it('should handle unknown intents gracefully', () => {
    const template = generateCodeTemplate('do something mysterious');

    expect(template).toBeDefined();
    expect(template.pattern).toBe('basic-handler');
    expect(template.code).toContain('click');
  });
});

describe('AI APIs - Intent Recognition', () => {
  it('should recognize toggle class intent', () => {
    const intent = recognizeIntent('toggle class active on button click');

    expect(intent.intent).toBe('toggle-class');
    expect(intent.confidence).toBeGreaterThan(0.8);
    expect(intent.parameters.class).toBe('active');
    expect(intent.suggestions.length).toBeGreaterThan(0);
  });

  it('should recognize fetch data intent', () => {
    const intent = recognizeIntent('fetch data from /api/users');

    expect(intent.intent).toBe('fetch-data');
    expect(intent.confidence).toBeGreaterThan(0.8);
    expect(intent.parameters.url).toBe('/api/users');
  });

  it('should recognize form submit intent', () => {
    const intent = recognizeIntent('submit form to server');

    expect(intent.intent).toBe('form-submit');
    expect(intent.confidence).toBeGreaterThan(0.7);
  });

  it('should recognize modal intent', () => {
    const intent = recognizeIntent('open modal dialog');

    expect(intent.intent).toBe('modal-toggle');
    expect(intent.confidence).toBeGreaterThan(0.8);
  });

  it('should recognize validation intent', () => {
    const intent = recognizeIntent('validate input field');

    expect(intent.intent).toBe('input-validation');
    expect(intent.confidence).toBeGreaterThan(0.7);
  });

  it('should recognize class modification intent', () => {
    const intent = recognizeIntent('add class highlight to element');

    expect(intent.intent).toBe('modify-class');
    expect(intent.parameters.action).toBe('add');
    expect(intent.parameters.class).toBe('highlight');
  });

  it('should handle unrecognized intents', () => {
    const intent = recognizeIntent('do something completely unknown');

    expect(intent.intent).toBe('custom');
    expect(intent.confidence).toBeLessThan(0.5);
    expect(intent.suggestions.length).toBeGreaterThan(0);
  });

  it('should be case insensitive', () => {
    const intent1 = recognizeIntent('TOGGLE CLASS ACTIVE');
    const intent2 = recognizeIntent('toggle class active');

    expect(intent1.intent).toBe(intent2.intent);
    expect(intent1.parameters).toEqual(intent2.parameters);
  });

  it('should provide helpful suggestions', () => {
    const intent = recognizeIntent('toggle class active');

    expect(intent.suggestions).toBeDefined();
    expect(intent.suggestions.length).toBeGreaterThan(0);
    expect(intent.suggestions.some(s => s.includes('element'))).toBe(true);
  });
});

describe('AI APIs - Quality Insights', () => {
  it('should generate performance insights', () => {
    // Create AST with many event handlers
    const astWithManyHandlers = {
      type: 'program',
      features: Array.from({ length: 15 }, () => ({
        type: 'eventHandler',
        event: 'click'
      }))
    } as any;

    const insights = generateQualityInsights(astWithManyHandlers);
    
    const performanceInsight = insights.find(i => i.category === 'performance');
    expect(performanceInsight).toBeDefined();
    expect(performanceInsight?.level).toBe('warning');
    expect(performanceInsight?.message).toContain('event handlers');
  });

  it('should generate maintainability insights', () => {
    const complexAST = createComplexAST();
    const insights = generateQualityInsights(complexAST);

    // Should provide insights about the code
    expect(insights).toBeDefined();
    expect(Array.isArray(insights)).toBe(true);
  });

  it('should suggest error handling for fetch commands', () => {
    const fetchAST = {
      type: 'program',
      features: [
        {
          type: 'eventHandler',
          commands: [
            {
              type: 'command',
              name: 'fetch',
              args: [{ type: 'literal', value: '/api/data' }]
            }
          ]
        }
      ]
    } as any;

    const insights = generateQualityInsights(fetchAST);
    
    const errorHandlingInsight = insights.find(i => i.message.includes('error handling'));
    expect(errorHandlingInsight).toBeDefined();
    expect(errorHandlingInsight?.category).toBe('best-practice');
    expect(errorHandlingInsight?.automated).toBe(true);
  });

  it('should categorize insights correctly', () => {
    const insights = generateQualityInsights(createComplexAST());

    for (const insight of insights) {
      expect(['performance', 'maintainability', 'readability', 'best-practice']).toContain(insight.category);
      expect(['info', 'warning', 'error']).toContain(insight.level);
      expect(insight.message).toBeDefined();
      expect(insight.suggestion).toBeDefined();
      expect(typeof insight.automated).toBe('boolean');
    }
  });

  it('should handle empty AST gracefully', () => {
    const emptyAST = {
      type: 'program',
      features: []
    } as any;

    const insights = generateQualityInsights(emptyAST);
    expect(insights).toBeDefined();
    expect(Array.isArray(insights)).toBe(true);
  });
});

describe('AI APIs - AI Assistant', () => {
  let assistant: any;

  beforeEach(() => {
    assistant = createAIAssistant();
  });

  it('should create AI assistant with all capabilities', () => {
    expect(assistant).toBeDefined();
    expect(typeof assistant.explainCode).toBe('function');
    expect(typeof assistant.generateCodeTemplate).toBe('function');
    expect(typeof assistant.recognizeIntent).toBe('function');
    expect(typeof assistant.generateQualityInsights).toBe('function');
  });

  it('should explain code through assistant', () => {
    const ast = createSimpleEventHandlerAST();
    const explanation = assistant.explainCode(ast);

    expect(explanation).toBeDefined();
    expect(explanation.overview).toBeDefined();
    expect(explanation.structure).toBeDefined();
    expect(explanation.behavior).toBeDefined();
  });

  it('should generate templates through assistant', () => {
    const template = assistant.generateCodeTemplate('toggle class');

    expect(template).toBeDefined();
    expect(template.code).toBeDefined();
    expect(template.explanation).toBeDefined();
  });

  it('should recognize intents through assistant', () => {
    const intent = assistant.recognizeIntent('fetch data from API');

    expect(intent).toBeDefined();
    expect(intent.intent).toBeDefined();
    expect(intent.confidence).toBeGreaterThan(0);
  });

  it('should generate insights through assistant', () => {
    const insights = assistant.generateQualityInsights(createComplexAST());

    expect(insights).toBeDefined();
    expect(Array.isArray(insights)).toBe(true);
  });
});

describe('AI APIs - Edge Cases', () => {
  it('should handle malformed AST in explanation', () => {
    const malformedAST = {
      type: 'program',
      // Missing required fields
    } as any;

    expect(() => explainCode(malformedAST)).not.toThrow();
    const explanation = explainCode(malformedAST);
    expect(explanation).toBeDefined();
  });

  it('should handle empty intent strings', () => {
    const intent = recognizeIntent('');
    
    expect(intent).toBeDefined();
    expect(intent.intent).toBe('custom');
    expect(intent.confidence).toBeLessThan(0.5);
  });

  it('should handle very long intent descriptions', () => {
    const longIntent = 'I want to create a really complex interactive feature that does many things including toggling classes and fetching data and submitting forms and opening modals and validating inputs and much more stuff that goes on and on';
    
    const recognized = recognizeIntent(longIntent);
    expect(recognized).toBeDefined();
    expect(recognized.intent).toBeDefined();
  });

  it('should handle AST without features', () => {
    const noFeaturesAST = {
      type: 'program',
      features: []
    } as any;

    const explanation = explainCode(noFeaturesAST);
    expect(explanation).toBeDefined();
    expect(explanation.overview).toContain('hyperscript');
  });
});

describe('AI APIs - Performance', () => {
  it('should handle large ASTs efficiently', () => {
    const largeAST = {
      type: 'program',
      features: Array.from({ length: 100 }, (_, i) => ({
        type: 'eventHandler',
        event: 'click',
        commands: Array.from({ length: 10 }, (_, j) => ({
          type: 'command',
          name: 'add',
          args: [{ type: 'selector', value: `.class${i}-${j}` }]
        }))
      }))
    } as any;

    const startTime = Date.now();
    
    const explanation = explainCode(largeAST);
    const insights = generateQualityInsights(largeAST);
    const template = generateCodeTemplate('toggle class');
    const intent = recognizeIntent('toggle class active');
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(explanation).toBeDefined();
    expect(insights).toBeDefined();
    expect(template).toBeDefined();
    expect(intent).toBeDefined();
    expect(duration).toBeLessThan(200); // Should complete within 200ms
  });

  it('should handle recursive AST structures', () => {
    const recursiveAST = {
      type: 'program',
      features: [
        {
          type: 'eventHandler',
          commands: [
            {
              type: 'conditional',
              then: {
                type: 'conditional',
                then: {
                  type: 'conditional',
                  then: {
                    type: 'command',
                    name: 'add'
                  }
                }
              }
            }
          ]
        }
      ]
    } as any;

    expect(() => explainCode(recursiveAST)).not.toThrow();
    expect(() => generateQualityInsights(recursiveAST)).not.toThrow();
  });
});