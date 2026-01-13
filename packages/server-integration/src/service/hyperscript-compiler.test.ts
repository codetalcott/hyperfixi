/**
 * Tests for HyperscriptCompiler - compiles hyperscript to executable JavaScript
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HyperscriptCompiler } from './hyperscript-compiler.js';
import { CompilationCache } from '../cache/compilation-cache.js';
import type { CompilationOptions } from '../types.js';

describe('HyperscriptCompiler', () => {
  let compiler: HyperscriptCompiler;
  let cache: CompilationCache;

  beforeEach(() => {
    cache = new CompilationCache({ maxSize: 100, ttl: 60000 });
    compiler = new HyperscriptCompiler(cache);
  });

  describe('Basic Compilation', () => {
    it('should compile simple hyperscript', async () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.compiled).toContain('addEventListener');
      expect(result.compiled).toContain('click');
      expect(result.compiled).toContain('.active');
      expect(result.compiled).toContain('classList.toggle');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should compile fetch hyperscript', async () => {
      const script = 'on click fetch /api/data';
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.compiled).toContain('addEventListener');
      expect(result.compiled).toContain('fetch');
      expect(result.compiled).toContain('/api/data');
      expect(result.errors).toHaveLength(0);
    });

    it('should compile send event hyperscript', async () => {
      const script = 'on click send search';
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.compiled).toContain('addEventListener');
      expect(result.compiled).toContain('CustomEvent');
      expect(result.compiled).toContain('search');
      expect(result.errors).toHaveLength(0);
    });

    it('should compile log hyperscript', async () => {
      const script = 'on click log "Hello World"';
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.compiled).toContain('addEventListener');
      expect(result.compiled).toContain('console.log');
      expect(result.compiled).toContain('Hello World');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty scripts', async () => {
      const script = '';
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.compiled).toBe('// Empty hyperscript compilation');
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Metadata Analysis', () => {
    it('should extract events from hyperscript', async () => {
      const script = `
        on click toggle .active
        on hover show .tooltip
        on keyup send search
      `;
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.metadata.events).toContain('click');
      expect(result.metadata.events).toContain('hover');
      expect(result.metadata.events).toContain('keyup');
      expect(result.metadata.events).toHaveLength(3);
    });

    it('should extract commands from hyperscript', async () => {
      const script = `
        on click toggle .active
        on hover show .tooltip
        on submit fetch /api/data
        on load log "Ready"
      `;
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.metadata.commands).toContain('toggle');
      expect(result.metadata.commands).toContain('show');
      expect(result.metadata.commands).toContain('fetch');
      expect(result.metadata.commands).toContain('log');
    });

    it('should extract CSS selectors from hyperscript', async () => {
      const script = `
        on click toggle .active
        on hover show #tooltip
        on submit put result into .results
      `;
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.metadata.selectors).toContain('.active');
      expect(result.metadata.selectors).toContain('#tooltip');
      expect(result.metadata.selectors).toContain('.results');
    });

    it('should extract template variables from hyperscript', async () => {
      const script = `
        on click fetch /api/users/{{userId}}
        put result into {{container}}
      `;
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.metadata.templateVariables).toContain('userId');
      expect(result.metadata.templateVariables).toContain('container');
    });

    it('should calculate complexity based on features', async () => {
      const simpleScript = 'on click log "test"';
      const complexScript = `
        on click
          if condition
            toggle .active
            fetch /api/data
            wait 100ms
          else
            repeat 3 times
              show .tooltip
            end
          end
      `;

      const simpleResult = await compiler.compile(simpleScript, {});
      const complexResult = await compiler.compile(complexScript, {});

      expect(complexResult.metadata.complexity).toBeGreaterThan(simpleResult.metadata.complexity);
    });
  });

  describe('Compilation Options', () => {
    it('should minify compiled JavaScript when requested', async () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = { minify: true };

      const result = await compiler.compile(script, options);
      const normalResult = await compiler.compile(script, {});

      expect(result.compiled.length).toBeLessThan(normalResult.compiled.length);
      expect(result.compiled).not.toContain('\n  '); // Should not have indentation
    });

    it('should generate legacy JavaScript when requested', async () => {
      const script = 'on click fetch /api/data';
      const options: CompilationOptions = { compatibility: 'legacy' };

      const result = await compiler.compile(script, options);

      expect(result.compiled).toContain('var ');
      expect(result.compiled).not.toContain('const ');
      expect(result.compiled).not.toContain('let ');
      expect(result.compiled).not.toContain('async ');
      expect(result.compiled).not.toContain('await ');
    });

    it('should generate source maps when requested', async () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = { sourceMap: true };

      const result = await compiler.compile(script, options);

      expect(result.sourceMap).toBeDefined();
      expect(result.sourceMap).toContain('version');
      expect(result.sourceMap).toContain('sources');
      expect(result.sourceMap).toContain('mappings');

      const sourceMap = JSON.parse(result.sourceMap!);
      expect(sourceMap.version).toBe(3);
      expect(sourceMap.sources).toContain('hyperscript');
    });

    it('should handle multiple options together', async () => {
      const script = 'on click fetch /api/data';
      const options: CompilationOptions = {
        minify: true,
        compatibility: 'legacy',
        sourceMap: true,
      };

      const result = await compiler.compile(script, options);

      expect(result.compiled).toContain('var ');
      expect(result.compiled).not.toContain('\n  ');
      expect(result.sourceMap).toBeDefined();
    });
  });

  describe('Validation Mode', () => {
    it('should validate without generating code', async () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options, true);

      expect(result.compiled).toBe('');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.events).toContain('click');
      expect(result.errors).toHaveLength(0);
    });

    it('should not cache validation results', async () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = {};

      // First validation
      await compiler.compile(script, options, true);
      expect(cache.has(script, options)).toBe(false);

      // Normal compilation should still work
      const result = await compiler.compile(script, options, false);
      expect(result.compiled).not.toBe('');
      expect(cache.has(script, options)).toBe(true);
    });

    it('should detect errors in validation mode', async () => {
      const script = 'invalid hyperscript syntax here';
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options, true);

      expect(result.compiled).toBe('');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle compilation errors gracefully', async () => {
      // Force an error by providing malformed input that would crash normal parsing
      const script = 'on click toggle .'; // Invalid selector
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatchObject({
        type: expect.any(String),
        message: expect.any(String),
        line: expect.any(Number),
        column: expect.any(Number),
      });
    });

    it('should provide empty metadata on error', async () => {
      const script = null as any; // Force error
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.metadata).toMatchObject({
        complexity: 0,
        dependencies: [],
        selectors: [],
        events: [],
        commands: [],
        templateVariables: [],
      });
    });
  });

  describe('Caching Integration', () => {
    it('should use cached results', async () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = {};

      // First compilation
      const result1 = await compiler.compile(script, options);

      // Second compilation should use cache
      const result2 = await compiler.compile(script, options);

      expect(result1.compiled).toEqual(result2.compiled);
      expect(result1.metadata).toEqual(result2.metadata);
    });

    it('should not cache validation results', async () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = {};

      // Validation should not cache
      await compiler.compile(script, options, true);
      expect(cache.has(script, options)).toBe(false);

      // Normal compilation should cache
      await compiler.compile(script, options, false);
      expect(cache.has(script, options)).toBe(true);
    });

    it('should cache different option combinations separately', async () => {
      const script = 'on click toggle .active';
      const options1: CompilationOptions = { minify: false };
      const options2: CompilationOptions = { minify: true };

      const result1 = await compiler.compile(script, options1);
      const result2 = await compiler.compile(script, options2);

      expect(result1.compiled).not.toEqual(result2.compiled);
      expect(cache.has(script, options1)).toBe(true);
      expect(cache.has(script, options2)).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple event handlers', async () => {
      const script = `
        on click
          toggle .active
          fetch /api/toggle
        on hover
          show .tooltip
        on keyup
          send search
      `;
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.compiled).toContain('click');
      expect(result.compiled).toContain('hover');
      expect(result.compiled).toContain('keyup');
      expect(result.metadata.events).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed hyperscript patterns', async () => {
      const script = `
        on click
          if .active is in me
            remove .active from me
            fetch /api/deactivate
          else
            add .active to me  
            log "Activated"
          end
      `;
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.metadata.events).toContain('click');
      expect(result.metadata.commands).toContain('fetch');
      expect(result.metadata.commands).toContain('log');
      expect(result.metadata.selectors).toContain('.active');
      expect(result.metadata.complexity).toBeGreaterThan(1);
    });

    it('should process template variables in realistic scenarios', async () => {
      const script = `
        on click
          fetch /api/{{resource}}/{{id}}
          put the result into {{target}}
          send {{eventName}} to {{listener}}
      `;
      const options: CompilationOptions = {};

      const result = await compiler.compile(script, options);

      expect(result.metadata.templateVariables).toContain('resource');
      expect(result.metadata.templateVariables).toContain('id');
      expect(result.metadata.templateVariables).toContain('target');
      expect(result.metadata.templateVariables).toContain('eventName');
      expect(result.metadata.templateVariables).toContain('listener');
      expect(result.metadata.templateVariables).toHaveLength(5);
    });
  });
});
