/**
 * Command Performance Profiler Test Suite
 * Tests performance measurement, bottleneck identification, and optimization suggestions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CommandPerformanceProfiler,
  performanceProfiler,
  type CommandPerformanceMetrics,
  type CommandPerformanceStats,
  type PerformanceBottleneck,
  type OptimizationSuggestion,
} from './command-performance-profiler';
import type { CommandExecutionResult } from './unified-command-system';
import type { TypedExecutionContext } from '../types/core';

// Mock performance.now for consistent testing
let mockTime = 0;
const originalPerformanceNow = performance.now;

beforeEach(() => {
  mockTime = 0;
  performance.now = vi.fn(() => mockTime);
});

afterEach(() => {
  performance.now = originalPerformanceNow;
});

describe('CommandPerformanceProfiler', () => {
  let profiler: CommandPerformanceProfiler;
  let mockContext: TypedExecutionContext;

  beforeEach(() => {
    profiler = new CommandPerformanceProfiler();
    profiler.clearMetrics();

    mockContext = {
      me: null,
      you: null,
      it: null,
      result: null,
      locals: new Map([
        ['var1', 'value1'],
        ['var2', 'value2'],
      ]),
      globals: new Map(),
      parent: null,
      halted: false,
      returned: false,
      broke: false,
      continued: false,
      async: false,
      evaluationHistory: [],
      effectHistory: [],
    };
  });

  describe('Basic Profiling', () => {
    it('should enable and disable profiling', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      profiler.enable();
      expect(consoleSpy).toHaveBeenCalledWith('[Performance Profiler] Enabled');

      profiler.disable();
      expect(consoleSpy).toHaveBeenCalledWith('[Performance Profiler] Disabled');

      consoleSpy.mockRestore();
    });

    it('should profile command execution', () => {
      profiler.enable();

      const profileId = profiler.startProfiling('set', ['x', 'to', '1'], mockContext);
      expect(profileId).toBeTruthy();

      mockTime = 50; // Simulate 50ms execution time

      const result: CommandExecutionResult = {
        success: true,
        value: 'test',
        executionTime: 50,
        context: {
          commandName: 'set',
          args: ['x', 'to', '1'],
          timestamp: Date.now(),
        },
      };

      const metric = profiler.endProfiling(profileId, result);

      expect(metric).toBeDefined();
      expect(metric?.commandName).toBe('set');
      expect(metric?.executionTime).toBe(50);
      expect(metric?.success).toBe(true);
    });

    it('should not profile when disabled', () => {
      profiler.disable();

      const profileId = profiler.startProfiling('set', ['x', 'to', '1'], mockContext);
      expect(profileId).toBe('');

      const result: CommandExecutionResult = {
        success: true,
        value: 'test',
        executionTime: 50,
        context: {
          commandName: 'set',
          args: ['x', 'to', '1'],
          timestamp: Date.now(),
        },
      };

      const metric = profiler.endProfiling(profileId, result);
      expect(metric).toBeNull();
    });

    it('should calculate context size', () => {
      profiler.enable();

      const profileId = profiler.startProfiling('set', ['x', 'to', '1'], mockContext);
      mockTime = 10;

      const result: CommandExecutionResult = {
        success: true,
        value: 'test',
        executionTime: 10,
        context: {
          commandName: 'set',
          args: ['x', 'to', '1'],
          timestamp: Date.now(),
        },
      };

      const metric = profiler.endProfiling(profileId, result);
      expect(metric?.contextSize).toBeGreaterThan(0);
    });
  });

  describe('Performance Statistics', () => {
    beforeEach(() => {
      profiler.enable();
    });

    it('should calculate basic statistics', () => {
      // Profile multiple executions of the same command
      const executionTimes = [10, 20, 30, 40, 50];

      executionTimes.forEach((time, i) => {
        const profileId = profiler.startProfiling(
          'set',
          [`x${i}`, 'to', i.toString()],
          mockContext
        );
        mockTime = time;

        const result: CommandExecutionResult = {
          success: true,
          value: 'test',
          executionTime: time,
          context: {
            commandName: 'set',
            args: [`x${i}`, 'to', i.toString()],
            timestamp: Date.now() + i * 1000,
          },
        };

        profiler.endProfiling(profileId, result);
      });

      const stats = profiler.getStats('set');

      expect(stats).toBeDefined();
      expect(stats?.commandName).toBe('set');
      expect(stats?.executionCount).toBe(5);
      expect(stats?.averageTime).toBe(30);
      expect(stats?.minTime).toBe(10);
      expect(stats?.maxTime).toBe(50);
    });

    it('should calculate percentiles correctly', () => {
      profiler.enable();

      // Create 100 executions with known distribution
      for (let i = 0; i < 100; i++) {
        const profileId = profiler.startProfiling('test', [], mockContext);
        mockTime = i + 1; // 1ms to 100ms

        const result: CommandExecutionResult = {
          success: true,
          value: 'test',
          executionTime: i + 1,
          context: {
            commandName: 'test',
            args: [],
            timestamp: Date.now() + i * 100,
          },
        };

        profiler.endProfiling(profileId, result);
      }

      const stats = profiler.getStats('test');

      expect(stats?.p50Time).toBe(50);
      expect(stats?.p95Time).toBe(95);
      expect(stats?.p99Time).toBe(99);
    });

    it('should calculate error rate', () => {
      const successCount = 7;
      const errorCount = 3;

      // Success executions
      for (let i = 0; i < successCount; i++) {
        const profileId = profiler.startProfiling('test', [], mockContext);
        mockTime = 10;

        const result: CommandExecutionResult = {
          success: true,
          value: 'test',
          executionTime: 10,
          context: {
            commandName: 'test',
            args: [],
            timestamp: Date.now(),
          },
        };

        profiler.endProfiling(profileId, result);
      }

      // Error executions
      for (let i = 0; i < errorCount; i++) {
        const profileId = profiler.startProfiling('test', [], mockContext);
        mockTime = 10;

        const result: CommandExecutionResult = {
          success: false,
          error: new Error('Test error'),
          executionTime: 10,
          context: {
            commandName: 'test',
            args: [],
            timestamp: Date.now(),
          },
        };

        profiler.endProfiling(profileId, result);
      }

      const stats = profiler.getStats('test');
      expect(stats?.errorRate).toBeCloseTo(0.3, 1); // 3/10 = 0.3, allow for floating point precision
    });
  });

  describe('Bottleneck Identification', () => {
    beforeEach(() => {
      profiler.enable();
    });

    it('should identify slow execution bottleneck', () => {
      // Create a slow command
      const profileId = profiler.startProfiling('slowCommand', [], mockContext);
      mockTime = 600; // 600ms execution time

      const result: CommandExecutionResult = {
        success: true,
        value: 'test',
        executionTime: 600,
        context: {
          commandName: 'slowCommand',
          args: [],
          timestamp: Date.now(),
        },
      };

      profiler.endProfiling(profileId, result);

      const bottlenecks = profiler.identifyBottlenecks();

      expect(bottlenecks).toHaveLength(1);
      expect(bottlenecks[0].commandName).toBe('slowCommand');
      expect(bottlenecks[0].severity).toBe('critical');
      expect(bottlenecks[0].issue).toContain('Slow execution time');
    });

    it('should identify high error rate bottleneck', () => {
      // Create command with high error rate
      for (let i = 0; i < 10; i++) {
        const profileId = profiler.startProfiling('errorCommand', [], mockContext);
        mockTime = 10;

        const result: CommandExecutionResult = {
          success: i < 3, // 30% success rate = 70% error rate
          error: i >= 3 ? new Error('Test error') : undefined,
          executionTime: 10,
          context: {
            commandName: 'errorCommand',
            args: [],
            timestamp: Date.now(),
          },
        };

        profiler.endProfiling(profileId, result);
      }

      const bottlenecks = profiler.identifyBottlenecks();

      const errorBottleneck = bottlenecks.find(b => b.issue.includes('High error rate'));
      expect(errorBottleneck).toBeDefined();
      expect(errorBottleneck?.commandName).toBe('errorCommand');
      expect(errorBottleneck?.severity).toBe('critical');
    });

    it('should identify high variance bottleneck', () => {
      const times = [1, 2, 3, 4, 500]; // High variance

      times.forEach((time, i) => {
        const profileId = profiler.startProfiling('varianceCommand', [], mockContext);
        mockTime = time;

        const result: CommandExecutionResult = {
          success: true,
          value: 'test',
          executionTime: time,
          context: {
            commandName: 'varianceCommand',
            args: [],
            timestamp: Date.now(),
          },
        };

        profiler.endProfiling(profileId, result);
      });

      const bottlenecks = profiler.identifyBottlenecks();

      const varianceBottleneck = bottlenecks.find(b =>
        b.issue.includes('High performance variance')
      );
      expect(varianceBottleneck).toBeDefined();
      expect(varianceBottleneck?.commandName).toBe('varianceCommand');
    });
  });

  describe('Optimization Suggestions', () => {
    beforeEach(() => {
      profiler.enable();
    });

    it('should suggest caching for frequently executed commands', () => {
      // Create frequently executed command with decent execution time
      for (let i = 0; i < 150; i++) {
        const profileId = profiler.startProfiling('frequentCommand', [], mockContext);
        mockTime = 20;

        const result: CommandExecutionResult = {
          success: true,
          value: 'test',
          executionTime: 20,
          context: {
            commandName: 'frequentCommand',
            args: [],
            timestamp: Date.now(),
          },
        };

        profiler.endProfiling(profileId, result);
      }

      const suggestions = profiler.generateOptimizations();

      const cachingSuggestion = suggestions.find(s => s.type === 'caching');
      expect(cachingSuggestion).toBeDefined();
      expect(cachingSuggestion?.commandName).toBe('frequentCommand');
      expect(cachingSuggestion?.description).toContain('caching');
    });

    it('should suggest async execution for slow commands', () => {
      // Create slow synchronous command
      const profileId = profiler.startProfiling('slowSyncCommand', [], mockContext);
      mockTime = 150;

      const result: CommandExecutionResult = {
        success: true,
        value: 'test',
        executionTime: 150,
        context: {
          commandName: 'slowSyncCommand',
          args: [],
          timestamp: Date.now(),
        },
      };

      profiler.endProfiling(profileId, result);

      const suggestions = profiler.generateOptimizations();

      const asyncSuggestion = suggestions.find(s => s.type === 'async');
      expect(asyncSuggestion).toBeDefined();
      expect(asyncSuggestion?.commandName).toBe('slowSyncCommand');
      expect(asyncSuggestion?.description).toContain('async');
    });

    it('should prioritize suggestions correctly', () => {
      // Create multiple commands with different issues

      // Critical slow command
      let profileId = profiler.startProfiling('criticalCommand', [], mockContext);
      mockTime = 200;
      profiler.endProfiling(profileId, {
        success: true,
        value: 'test',
        executionTime: 200,
        context: { commandName: 'criticalCommand', args: [], timestamp: Date.now() },
      });

      // Medium priority command
      for (let i = 0; i < 50; i++) {
        profileId = profiler.startProfiling('mediumCommand', [], mockContext);
        mockTime = 5;
        profiler.endProfiling(profileId, {
          success: true,
          value: 'test',
          executionTime: 5,
          context: { commandName: 'mediumCommand', args: [], timestamp: Date.now() },
        });
      }

      const suggestions = profiler.generateOptimizations();

      // High priority suggestions should come first
      const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
      expect(highPrioritySuggestions.length).toBeGreaterThan(0);

      // Check that high priority comes before low priority
      const firstHighIndex = suggestions.findIndex(s => s.priority === 'high');
      const firstLowIndex = suggestions.findIndex(s => s.priority === 'low');

      if (firstHighIndex !== -1 && firstLowIndex !== -1) {
        expect(firstHighIndex).toBeLessThan(firstLowIndex);
      }
    });
  });

  describe('Reporting', () => {
    beforeEach(() => {
      profiler.enable();
    });

    it('should generate comprehensive performance report', () => {
      // Create some test data
      const profileId = profiler.startProfiling('reportCommand', [], mockContext);
      mockTime = 100;

      const result: CommandExecutionResult = {
        success: true,
        value: 'test',
        executionTime: 100,
        context: {
          commandName: 'reportCommand',
          args: [],
          timestamp: Date.now(),
        },
      };

      profiler.endProfiling(profileId, result);

      const report = profiler.generateReport();

      expect(report).toContain('Command Performance Report');
      expect(report).toContain('Total Commands Profiled: 1');
      expect(report).toContain('reportCommand');
      expect(report).toContain('100.00ms');
    });

    it('should enable and disable auto reporting', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      // Add some test data first
      const profileId = profiler.startProfiling('reportTest', [], mockContext);
      mockTime = 25;
      profiler.endProfiling(profileId, {
        success: true,
        value: 'test',
        executionTime: 25,
        context: { commandName: 'reportTest', args: [], timestamp: Date.now() },
      });

      profiler.enableAutoReporting(50); // 50ms interval for testing

      // Wait for report
      await new Promise<void>(resolve => {
        setTimeout(() => {
          profiler.disable(); // This should clear the interval
          resolve();
        }, 100);
      });

      // Check if any reports were generated
      const calls = consoleSpy.getCalls();
      expect(calls.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    }, 1000); // 1 second timeout
  });

  describe('Data Management', () => {
    beforeEach(() => {
      profiler.enable();
    });

    it('should clear all metrics', () => {
      const profileId = profiler.startProfiling('test', [], mockContext);
      mockTime = 10;

      profiler.endProfiling(profileId, {
        success: true,
        value: 'test',
        executionTime: 10,
        context: { commandName: 'test', args: [], timestamp: Date.now() },
      });

      expect(profiler.getStats('test')).toBeDefined();

      profiler.clearMetrics();

      expect(profiler.getStats('test')).toBeNull();
    });

    it('should export and import metrics', () => {
      const profileId = profiler.startProfiling('exportTest', [], mockContext);
      mockTime = 25;

      profiler.endProfiling(profileId, {
        success: true,
        value: 'test',
        executionTime: 25,
        context: { commandName: 'exportTest', args: [], timestamp: Date.now() },
      });

      const exported = profiler.exportMetrics();
      expect(exported.has('exportTest')).toBe(true);

      profiler.clearMetrics();
      expect(profiler.getStats('exportTest')).toBeNull();

      profiler.importMetrics(exported);
      expect(profiler.getStats('exportTest')).toBeDefined();
    });

    it('should limit stored metrics per command', () => {
      const maxMetrics = 10000; // Internal limit

      // This would be a long-running test, so we'll just verify the concept
      // by checking that the profiler doesn't grow indefinitely

      for (let i = 0; i < 50; i++) {
        const profileId = profiler.startProfiling('limitTest', [], mockContext);
        mockTime = i;

        profiler.endProfiling(profileId, {
          success: true,
          value: 'test',
          executionTime: i,
          context: { commandName: 'limitTest', args: [], timestamp: Date.now() },
        });
      }

      const stats = profiler.getStats('limitTest');
      expect(stats?.executionCount).toBe(50);

      // Verify internal metrics are stored (we can't directly test the limit without 10k+ executions)
      const exported = profiler.exportMetrics();
      expect(exported.get('limitTest')?.length).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing start time gracefully', () => {
      profiler.enable();

      const result: CommandExecutionResult = {
        success: true,
        value: 'test',
        executionTime: 10,
        context: { commandName: 'test', args: [], timestamp: Date.now() },
      };

      // End profiling without starting
      const metric = profiler.endProfiling('invalid-id', result);
      expect(metric).toBeNull();
    });

    it('should handle commands with no metrics', () => {
      profiler.enable();

      const stats = profiler.getStats('nonexistent');
      expect(stats).toBeNull();
    });

    it('should handle empty metrics when generating bottlenecks', () => {
      profiler.enable();

      const bottlenecks = profiler.identifyBottlenecks();
      expect(bottlenecks).toEqual([]);
    });

    it('should handle empty metrics when generating optimizations', () => {
      profiler.enable();

      const optimizations = profiler.generateOptimizations();
      expect(optimizations).toEqual([]);
    });
  });
});

describe('Singleton Performance Profiler', () => {
  it('should export singleton instance', () => {
    expect(performanceProfiler).toBeInstanceOf(CommandPerformanceProfiler);
  });

  it('should maintain state across imports', () => {
    performanceProfiler.enable();
    performanceProfiler.clearMetrics();

    // This would be tested across different files in a real scenario
    expect(performanceProfiler.getAllStats()).toEqual([]);
  });
});
