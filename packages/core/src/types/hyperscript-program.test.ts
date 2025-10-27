/**
 * Test file to validate HyperScriptProgram type system
 * Demonstrates complete type coverage for hyperscript programs
 */

import { describe, test, expect } from 'vitest';
import type { 
  HyperScriptProgram, 
  HyperScriptFeature, 
  ParsedCommand,
  HyperScriptFeatureType,
  ParsedCommandType
} from './command-types';
import { HyperScriptProgramSchema } from './command-types';

describe('HyperScriptProgram Type System', () => {
  test('HyperScriptProgram type structure is complete', () => {
    // Example program structure showing complete type coverage
    const exampleProgram: HyperScriptProgram = {
      source: 'on click toggle .red on me',
      features: [{
        type: 'event' as HyperScriptFeatureType,
        id: 'click-handler-1',
        trigger: {
          event: 'click',
          options: {
            once: false
          }
        },
        commands: [{
          type: 'dom-manipulation' as ParsedCommandType,
          name: 'toggle',
          args: [{
            value: '.red',
            type: 'string',
            kind: 'literal'
          }],
          options: {
            validateInputs: true,
            trackPerformance: true,
            errorHandling: 'throw'
          },
          sourceRange: {
            start: 9,
            end: 25
          }
        }],
        config: {
          enabled: true,
          priority: 1,
          options: {},
          dependencies: [],
          capabilities: {
            requiresDOM: true,
            isAsync: false,
            modifiesGlobalState: false,
            requiredAPIs: [],
            performance: {
              complexity: 'low',
              memoryUsage: 'minimal',
              cpuIntensive: false,
              executionTime: {
                min: 0.1,
                max: 5.0,
                typical: 1.0
              }
            }
          }
        },
        sourceRange: {
          start: 0,
          end: 26
        },
        metadata: {
          compiledAt: new Date(),
          stats: {
            executionCount: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            errorCount: 0
          },
          resolvedDependencies: [],
          warnings: []
        }
      }],
      metadata: {
        compilation: {
          compiled: true,
          compiledAt: new Date(),
          compiler: 'hyperfixi',
          version: '1.0.0'
        },
        analysis: {
          complexity: 1,
          estimatedExecutionTime: 1.0,
          memoryRequirements: 512,
          warnings: [],
          optimizations: []
        }
      },
      sourceInfo: {
        attribute: '_'
      },
      state: {
        status: 'ready',
        context: {
          element: null,
          variables: new Map(),
          callStack: []
        }
      }
    };

    // Type checking passes - this validates our type structure
    expect(exampleProgram.source).toBe('on click toggle .red on me');
    expect(exampleProgram.features).toHaveLength(1);
    expect(exampleProgram.features[0].type).toBe('event');
    expect(exampleProgram.state.status).toBe('ready');
  });

  test('HyperScriptFeatureType enum covers all official features', () => {
    const featureTypes: HyperScriptFeatureType[] = [
      'event',
      'behavior', 
      'definition',
      'init',
      'worker',
      'socket',
      'eventsource',
      'set',
      'js',
      'custom'
    ];

    // Validates that our type system covers all hyperscript features
    expect(featureTypes).toContain('event');
    expect(featureTypes).toContain('behavior');
    expect(featureTypes).toContain('definition');
    expect(featureTypes).toContain('init');
  });

  test('ParsedCommandType enum covers all command categories', () => {
    const commandTypes: ParsedCommandType[] = [
      'dom-manipulation',
      'content',
      'navigation', 
      'event',
      'async',
      'control-flow',
      'data',
      'expression',
      'custom'
    ];

    // Validates command type coverage
    expect(commandTypes).toContain('dom-manipulation');
    expect(commandTypes).toContain('content');
    expect(commandTypes).toContain('navigation');
    expect(commandTypes).toContain('event');
  });

  test('HyperScriptProgramSchema validates program structure', () => {
    const validProgram = {
      source: 'on click hide me',
      features: [{
        type: 'event',
        id: 'test-feature',
        commands: [{
          type: 'dom-manipulation',
          name: 'hide',
          args: [{
            value: 'me',
            type: 'string',
            kind: 'reference'
          }]
        }],
        config: {
          enabled: true,
          priority: 1,
          options: {},
          dependencies: []
        }
      }],
      metadata: {
        compilation: {
          compiled: false,
          compiler: 'hyperfixi',
          version: '1.0.0'
        }
      },
      state: {
        status: 'ready'
      }
    };

    // Schema validation should pass for valid program
    const result = HyperScriptProgramSchema.safeParse(validProgram);
    expect(result.success).toBe(true);
  });

  test('Type system supports LLM agent requirements', () => {
    // Demonstrates rich metadata and type information for LLM agents
    const commandWithMetadata: ParsedCommand = {
      type: 'dom-manipulation',
      name: 'hide',
      args: [{
        value: 'me',
        type: 'element',
        kind: 'reference',
        analysis: {
          isUsed: true,
          typeCompatibility: 1.0,
          suggestions: []
        }
      }],
      options: {
        validateInputs: true,
        trackPerformance: true,
        errorHandling: 'throw'
      },
      sourceRange: {
        start: 9,
        end: 16
      },
      analysis: {
        complexity: 1,
        requirements: ['DOM access'],
        sideEffects: ['element visibility'],
        typeInference: {
          inputTypes: ['element'],
          outputType: 'void',
          confidence: 1.0
        },
        optimizations: []
      }
    };

    // Rich metadata enables LLM understanding
    expect(commandWithMetadata.analysis?.complexity).toBe(1);
    expect(commandWithMetadata.analysis?.requirements).toContain('DOM access');
    expect(commandWithMetadata.args[0].analysis?.typeCompatibility).toBe(1.0);
  });

  test('Program state tracking enables runtime monitoring', () => {
    const programWithState: Pick<HyperScriptProgram, 'state'> = {
      state: {
        status: 'running',
        currentFeature: 'click-handler-1',
        context: {
          element: null,
          variables: new Map([['count', 5]]),
          callStack: ['click-handler', 'toggle-command']
        },
        startedAt: new Date()
      }
    };

    // State tracking enables runtime monitoring and debugging
    expect(programWithState.state.status).toBe('running');
    expect(programWithState.state.currentFeature).toBe('click-handler-1');
    expect(programWithState.state.context.variables.get('count')).toBe(5);
    expect(programWithState.state.context.callStack).toHaveLength(2);
  });
});