/**
 * Performance Benchmarks
 * Compare standard vs optimized registry
 */

import { HyperfixiPluginRegistry } from '../src/registry';
import { OptimizedPluginRegistry } from '../src/optimized-registry';
import { OnCommand, ToggleCommand, SendCommand } from '../src/plugins/typed-commands';

interface BenchmarkResult {
  name: string;
  ops: number;
  duration: number;
  average: number;
}

class PluginBenchmark {
  private results: BenchmarkResult[] = [];

  async run() {
    console.log('🏃 Running Plugin System Benchmarks...\n');

    // Setup registries
    const standardRegistry = new HyperfixiPluginRegistry();
    const optimizedRegistry = new OptimizedPluginRegistry();

    // Load same plugins
    const plugins = [OnCommand, ToggleCommand, SendCommand];
    standardRegistry.load(...plugins);
    optimizedRegistry.load(...plugins);

    // Benchmark plugin loading
    await this.benchmarkLoading();

    // Benchmark pattern matching
    await this.benchmarkPatternMatching(standardRegistry, optimizedRegistry);

    // Benchmark DOM application
    await this.benchmarkDOMApplication(standardRegistry, optimizedRegistry);

    // Print results
    this.printResults();
  }

  private async benchmarkLoading() {
    const iterations = 10000;
    
    // Standard loading
    const standardStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const registry = new HyperfixiPluginRegistry();
      registry.load(OnCommand, ToggleCommand, SendCommand);
    }
    const standardDuration = performance.now() - standardStart;

    // Optimized loading
    const optimizedStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const registry = new OptimizedPluginRegistry();
      registry.load(OnCommand, ToggleCommand, SendCommand);
    }
    const optimizedDuration = performance.now() - optimizedStart;

    this.results.push({
      name: 'Plugin Loading - Standard',
      ops: iterations,
      duration: standardDuration,
      average: standardDuration / iterations
    });

    this.results.push({
      name: 'Plugin Loading - Optimized',
      ops: iterations,
      duration: optimizedDuration,
      average: optimizedDuration / iterations
    });
  }

  private async benchmarkPatternMatching(
    standard: HyperfixiPluginRegistry,
    optimized: OptimizedPluginRegistry
  ) {
    const testPatterns = [
      'on click toggle .active',
      'toggle class active',
      'send custom-event',
      'on mouseenter add .hover',
      'on mouseleave remove .hover',
      'toggle visible',
      'send notification "Hello"',
      'on scroll throttle:100ms log "scrolling"'
    ];

    const iterations = 100000;

    // Create mock element
    const mockElement = document.createElement('div');

    // Standard pattern matching
    const standardStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const pattern = testPatterns[i % testPatterns.length];
      // Simulate pattern matching
      (standard as any).processAttribute(mockElement, {
        name: '_',
        value: pattern
      });
    }
    const standardDuration = performance.now() - standardStart;

    // Optimized pattern matching (with cache)
    const optimizedStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const pattern = testPatterns[i % testPatterns.length];
      (optimized as any).processAttribute(mockElement, {
        name: '_',
        value: pattern
      });
    }
    const optimizedDuration = performance.now() - optimizedStart;

    this.results.push({
      name: 'Pattern Matching - Standard',
      ops: iterations,
      duration: standardDuration,
      average: standardDuration / iterations
    });

    this.results.push({
      name: 'Pattern Matching - Optimized',
      ops: iterations,
      duration: optimizedDuration,
      average: optimizedDuration / iterations
    });
  }

  private async benchmarkDOMApplication(
    standard: HyperfixiPluginRegistry,
    optimized: OptimizedPluginRegistry
  ) {
    // Create test DOM
    const container = document.createElement('div');
    container.innerHTML = `
      <div _="on click toggle .active">Button 1</div>
      <div _="on mouseenter add .hover on mouseleave remove .hover">Hover me</div>
      <div _="on click send custom-event">Send Event</div>
      <div data-fetch="/api/data" data-fetch-interval="5000">Auto fetch</div>
      <div data-intersect="0.5">Intersection observer</div>
    `.repeat(20);

    const iterations = 1000;

    // Standard DOM application
    const standardStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const clone = container.cloneNode(true) as Element;
      standard.apply(clone);
    }
    const standardDuration = performance.now() - standardStart;

    // Optimized DOM application
    const optimizedStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const clone = container.cloneNode(true) as Element;
      optimized.apply(clone);
    }
    const optimizedDuration = performance.now() - optimizedStart;

    this.results.push({
      name: 'DOM Application - Standard',
      ops: iterations,
      duration: standardDuration,
      average: standardDuration / iterations
    });

    this.results.push({
      name: 'DOM Application - Optimized',
      ops: iterations,
      duration: optimizedDuration,
      average: optimizedDuration / iterations
    });
  }

  private printResults() {
    console.log('📊 Benchmark Results\n');
    console.log('Operation                        | Total (ms) | Avg (ms) | Ops/sec');
    console.log('---------------------------------|------------|----------|--------');

    for (const result of this.results) {
      const opsPerSec = Math.round(1000 / result.average);
      console.log(
        `${result.name.padEnd(32)} | ${result.duration.toFixed(2).padStart(10)} | ${
          result.average.toFixed(4).padStart(8)
        } | ${opsPerSec.toLocaleString().padStart(7)}`
      );
    }

    // Calculate improvements
    console.log('\n📈 Performance Improvements\n');
    
    for (let i = 0; i < this.results.length; i += 2) {
      const standard = this.results[i];
      const optimized = this.results[i + 1];
      
      if (standard && optimized) {
        const improvement = ((standard.average - optimized.average) / standard.average * 100).toFixed(1);
        const speedup = (standard.average / optimized.average).toFixed(2);
        
        console.log(`${standard.name.replace(' - Standard', '')}`);
        console.log(`  Improvement: ${improvement}%`);
        console.log(`  Speedup: ${speedup}x faster\n`);
      }
    }
  }
}

// Run benchmarks
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    const benchmark = new PluginBenchmark();
    await benchmark.run();
  });
} else {
  console.log('Benchmarks must be run in a browser environment');
}

export { PluginBenchmark };
