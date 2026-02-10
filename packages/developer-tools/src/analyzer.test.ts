/**
 * Analyzer Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  analyzeProject,
  analyzeFile,
  generateReport,
  validateScript,
  getSuggestions,
} from './analyzer';

// Mock fs-extra
vi.mock('fs-extra', async () => {
  const actual = await vi.importActual('fs-extra');
  return {
    ...actual,
    readFile: vi.fn(),
    pathExists: vi.fn(),
  };
});

// Mock glob
vi.mock('glob', () => ({
  glob: vi.fn(),
}));

describe('Analyzer', () => {
  const mockFs = fs as unknown as {
    readFile: ReturnType<typeof vi.fn>;
    pathExists: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeFile', () => {
    it('should analyze a simple HTML file with hyperscript', async () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <button id="btn" _="on click add .active to me">Click</button>
</body>
</html>`;

      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/index.html');

      expect(result.file).toBe('index.html');
      expect(result.elements.length).toBeGreaterThan(0);
      expect(result.scripts.length).toBeGreaterThan(0);
    });

    it('should detect hyperscript patterns', async () => {
      const htmlContent = `<div _="on click toggle .active on me then wait 500ms then remove .active from me">Test</div>`;

      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/test.html');

      // Should detect events, commands, and selectors
      expect(result.scripts[0].events).toContain('click');
      expect(result.scripts[0].commands).toContain('toggle');
      expect(result.scripts[0].commands).toContain('wait');
      expect(result.scripts[0].commands).toContain('remove');
    });

    it('should detect issues in hyperscript', async () => {
      const htmlContent = `<div _="on click put 'test' into nowhere">Bad</div>`;

      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/bad.html');

      // Should detect the "put into nowhere" issue
      const putIssue = result.issues.find(i => i.code === 'E001');
      expect(putIssue).toBeDefined();
    });

    it('should calculate complexity', async () => {
      const htmlContent = `
<div _="on click if #count.innerText as Number > 10 then add .warning else remove .warning end">Simple</div>
<button _="on click
  repeat 3 times
    toggle .flash on me
    wait 200ms
  end
">Complex</button>`;

      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/complex.html');

      expect(result.complexity).toBeGreaterThan(0);
    });

    it('should extract dependencies', async () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/@hyperfixi/core"></script>
  <link rel="stylesheet" href="styles.css">
</head>
<body></body>
</html>`;

      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/deps.html');

      expect(result.dependencies).toBeDefined();
    });

    it('should parse element attributes correctly', async () => {
      const htmlContent = `<button id="myBtn" class="btn primary" data-action="submit" _="on click call submit()">Submit</button>`;

      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/attrs.html');

      const button = result.elements.find(e => e.tag === 'button');
      expect(button).toBeDefined();
      expect(button?.id).toBe('myBtn');
      expect(button?.classes).toContain('btn');
      expect(button?.classes).toContain('primary');
    });

    it('should handle empty files', async () => {
      mockFs.readFile.mockResolvedValue('');

      const result = await analyzeFile('/test/empty.html');

      expect(result.scripts).toEqual([]);
      expect(result.elements).toEqual([]);
      expect(result.complexity).toBe(0);
    });

    it('should handle files without hyperscript', async () => {
      const htmlContent = `<!DOCTYPE html>
<html>
<body>
  <h1>Hello World</h1>
  <p>No hyperscript here</p>
</body>
</html>`;

      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/no-hs.html');

      expect(result.scripts).toEqual([]);
    });
  });

  describe('analyzeProject', () => {
    it('should analyze multiple files in a project', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;

      mockGlob.mockResolvedValue(['/project/index.html', '/project/about.html']);

      mockFs.readFile
        .mockResolvedValueOnce('<div _="on click add .active">Test1</div>')
        .mockResolvedValueOnce('<div _="on click remove .active">Test2</div>');

      const results = await analyzeProject('/project');

      expect(results.length).toBe(2);
    });

    it('should respect include/exclude patterns', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;

      mockGlob.mockResolvedValue(['/project/src/index.html']);

      mockFs.readFile.mockResolvedValue('<div _="on click">Test</div>');

      await analyzeProject('/project', {
        include: ['src/**/*.html'],
        exclude: ['node_modules/**'],
      });

      expect(mockGlob).toHaveBeenCalled();
    });

    it('should handle file read errors gracefully', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;

      mockGlob.mockResolvedValue(['/project/error.html']);

      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const results = await analyzeProject('/project');

      expect(results.length).toBe(1);
      expect(results[0].issues[0].type).toBe('error');
      expect(results[0].issues[0].code).toBe('E002');
    });
  });

  describe('generateReport', () => {
    const mockResults = [
      {
        file: 'index.html',
        scripts: [
          {
            content: 'on click add .active',
            line: 5,
            column: 10,
            events: ['click'],
            commands: ['add'],
            selectors: ['.active'],
            references: [],
            literals: [],
            variables: [],
            complexity: 1,
            issues: [],
          },
        ],
        elements: [],
        dependencies: [],
        complexity: 1,
        issues: [],
        metrics: {
          totalScripts: 1,
          totalElements: 5,
          totalLines: 20,
          averageComplexity: 1,
          featuresUsed: ['events', 'commands'],
          commandsUsed: ['add'],
          eventsUsed: ['click'],
        },
      },
    ];

    it('should generate table format report', () => {
      const report = generateReport(mockResults, 'table');

      expect(report).toContain('index.html');
      expect(report).toContain('Scripts');
    });

    it('should generate JSON format report', () => {
      const report = generateReport(mockResults, 'json');

      const parsed = JSON.parse(report);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].file).toBe('index.html');
    });

    it('should generate detailed format report', () => {
      const report = generateReport(mockResults, 'detailed');

      expect(report).toContain('index.html');
      expect(report).toContain('click');
      expect(report).toContain('add');
    });

    it('should handle empty results', () => {
      const report = generateReport([], 'table');

      expect(report).toBeDefined();
    });

    it('should include issues in report', () => {
      const resultsWithIssues = [
        {
          ...mockResults[0],
          issues: [
            {
              type: 'warning' as const,
              code: 'W001',
              message: 'Test warning',
              line: 5,
              column: 10,
            },
          ],
        },
      ];

      const report = generateReport(resultsWithIssues, 'detailed');

      expect(report).toContain('W001');
      expect(report).toContain('Test warning');
    });
  });

  describe('validateScript', () => {
    it('should validate correct hyperscript', () => {
      const script = 'on click add .active to me';
      const issues = validateScript(script);

      // Simple valid script should have no major issues
      expect(issues.filter(i => i.type === 'error')).toHaveLength(0);
    });

    it('should detect duplicate then keywords', () => {
      const script = 'on click then then add .active';
      const issues = validateScript(script);

      const duplicateThen = issues.find(i => i.code === 'W002');
      expect(duplicateThen).toBeDefined();
    });

    it('should detect multiple me references', () => {
      const script = 'on click add .active to me then remove .other from me';
      const issues = validateScript(script);

      const multipleMe = issues.find(i => i.code === 'I001');
      expect(multipleMe).toBeDefined();
    });

    it('should handle empty script', () => {
      const issues = validateScript('');

      expect(issues).toBeDefined();
    });
  });

  describe('getSuggestions', () => {
    it('should provide suggestions for issues', () => {
      const analysis = {
        file: 'test.html',
        scripts: [],
        elements: [],
        dependencies: [],
        complexity: 10,
        issues: [
          {
            type: 'warning' as const,
            code: 'W001',
            message: 'Event listener without proper target',
            line: 5,
            column: 10,
            suggestion: 'Specify an event target',
          },
        ],
        metrics: {
          totalScripts: 5,
          totalElements: 20,
          totalLines: 100,
          averageComplexity: 2,
          featuresUsed: [],
          commandsUsed: [],
          eventsUsed: [],
        },
      };

      const suggestions = getSuggestions(analysis);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should suggest complexity reduction for complex scripts', () => {
      const analysis = {
        file: 'complex.html',
        scripts: [],
        elements: [],
        dependencies: [],
        complexity: 50, // High complexity
        issues: [],
        metrics: {
          totalScripts: 10,
          totalElements: 50,
          totalLines: 500,
          averageComplexity: 5,
          featuresUsed: [],
          commandsUsed: [],
          eventsUsed: [],
        },
      };

      const suggestions = getSuggestions(analysis);

      // Should have suggestions about complexity
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle analysis with no issues', () => {
      const analysis = {
        file: 'clean.html',
        scripts: [],
        elements: [],
        dependencies: [],
        complexity: 1,
        issues: [],
        metrics: {
          totalScripts: 1,
          totalElements: 5,
          totalLines: 20,
          averageComplexity: 1,
          featuresUsed: [],
          commandsUsed: [],
          eventsUsed: [],
        },
      };

      const suggestions = getSuggestions(analysis);

      expect(suggestions).toBeDefined();
    });
  });

  describe('Pattern Detection', () => {
    it('should detect event patterns', async () => {
      const htmlContent = `<div _="on click on mouseenter on keydown from window">Multi-event</div>`;
      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/events.html');

      expect(result.scripts[0].events).toContain('click');
      expect(result.scripts[0].events).toContain('mouseenter');
      expect(result.scripts[0].events).toContain('keydown');
    });

    it('should detect command patterns', async () => {
      const htmlContent = `<div _="on click add .a remove .b toggle .c put 'x' into #y">Commands</div>`;
      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/commands.html');

      expect(result.scripts[0].commands).toContain('add');
      expect(result.scripts[0].commands).toContain('remove');
      expect(result.scripts[0].commands).toContain('toggle');
      expect(result.scripts[0].commands).toContain('put');
    });

    it('should detect selector patterns', async () => {
      const htmlContent = `<div _="on click add .active to #myId .myClass [data-attr]">Selectors</div>`;
      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/selectors.html');

      const selectors = result.scripts[0].selectors;
      expect(selectors.some(s => s.includes('#myId'))).toBe(true);
      expect(selectors.some(s => s.includes('.myClass') || s.includes('.active'))).toBe(true);
    });

    it('should detect reference patterns', async () => {
      const htmlContent = `<div _="on click set my innerHTML to it then log the event">Refs</div>`;
      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/refs.html');

      expect(result.scripts[0].references).toContain('my');
      expect(result.scripts[0].references).toContain('it');
      expect(result.scripts[0].references).toContain('the');
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate correct metrics', async () => {
      const htmlContent = `
<div _="on click add .a">Script 1</div>
<div _="on click add .b">Script 2</div>
<div _="on click add .c">Script 3</div>
<span>No script</span>
<p>Also no script</p>`;

      mockFs.readFile.mockResolvedValue(htmlContent);

      const result = await analyzeFile('/test/metrics.html');

      expect(result.metrics.totalScripts).toBe(3);
      expect(result.metrics.totalElements).toBeGreaterThan(3);
      expect(result.metrics.commandsUsed).toContain('add');
      expect(result.metrics.eventsUsed).toContain('click');
    });
  });
});
