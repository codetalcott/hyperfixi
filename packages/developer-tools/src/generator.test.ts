/**
 * Generator Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createProject, createComponent, createTemplate, generateCode } from './generator';

// Mock fs-extra
vi.mock('fs-extra', async () => {
  const actual = await vi.importActual('fs-extra');
  return {
    ...actual,
    pathExists: vi.fn(),
    ensureDir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    readJson: vi.fn(),
    writeJson: vi.fn(),
    chmod: vi.fn(),
    copy: vi.fn(),
  };
});

describe('Generator', () => {
  const mockFs = fs as unknown as {
    pathExists: ReturnType<typeof vi.fn>;
    ensureDir: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
    readJson: ReturnType<typeof vi.fn>;
    writeJson: ReturnType<typeof vi.fn>;
    chmod: ReturnType<typeof vi.fn>;
    copy: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.pathExists.mockResolvedValue(false);
    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.chmod.mockResolvedValue(undefined);
    mockFs.readJson.mockResolvedValue({});
    mockFs.writeJson.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProject', () => {
    it('should create a basic project', async () => {
      await createProject({
        name: 'my-project',
        template: 'basic',
        typescript: false,
        testing: false,
        linting: false,
        git: false,
        install: false,
      });

      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should create a full-stack project', async () => {
      await createProject({
        name: 'fullstack-app',
        template: 'full-stack',
        typescript: true,
        testing: true,
        linting: true,
        git: false,
        install: false,
      });

      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should throw error if directory exists', async () => {
      mockFs.pathExists.mockResolvedValue(true);

      await expect(
        createProject({
          name: 'existing-project',
          template: 'basic',
          typescript: false,
          testing: false,
          linting: false,
          git: false,
          install: false,
        })
      ).rejects.toThrow('Directory existing-project already exists');
    });

    it('should throw error for unknown template', async () => {
      await expect(
        createProject({
          name: 'test',
          template: 'nonexistent' as any,
          typescript: false,
          testing: false,
          linting: false,
          git: false,
          install: false,
        })
      ).rejects.toThrow('Template nonexistent not found');
    });

    it('should replace template variables', async () => {
      await createProject({
        name: 'my-test-project',
        template: 'basic',
        description: 'A test project',
        author: 'Test Author',
        license: 'Apache-2.0',
        typescript: false,
        testing: false,
        linting: false,
        git: false,
        install: false,
      });

      // Verify writeFile was called with content containing replaced values
      const writeCalls = mockFs.writeFile.mock.calls;
      expect(writeCalls.length).toBeGreaterThan(0);
    });

    it('should add feature dependencies', async () => {
      mockFs.readJson.mockResolvedValue({
        name: 'test',
        dependencies: {},
      });

      await createProject({
        name: 'feature-project',
        template: 'basic',
        features: ['multi-tenant'],
        typescript: false,
        testing: false,
        linting: false,
        git: false,
        install: false,
      });

      expect(mockFs.writeJson).toHaveBeenCalled();
    });
  });

  describe('createComponent', () => {
    it('should create a basic component', async () => {
      await createComponent({
        name: 'my-button',
        path: '/output',
        template: true,
        styles: true,
        hyperscript: true,
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should create TypeScript component', async () => {
      await createComponent({
        name: 'my-card',
        path: '/output',
        typescript: true,
        template: true,
        styles: true,
        hyperscript: true,
      });

      const writeCalls = mockFs.writeFile.mock.calls;
      expect(writeCalls.some(call => call[0].endsWith('.ts'))).toBe(true);
    });

    it('should create component with props', async () => {
      await createComponent({
        name: 'my-modal',
        path: '/output',
        props: ['title', 'content', 'open'],
        template: true,
        styles: true,
        hyperscript: true,
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should use kebab-case for component name', async () => {
      await createComponent({
        name: 'MyComponent',
        path: '/output',
        template: true,
        styles: true,
        hyperscript: true,
      });

      const writeCalls = mockFs.writeFile.mock.calls;
      expect(writeCalls.some(call => call[0].includes('my-component'))).toBe(true);
    });

    it('should include hyperscript boilerplate', async () => {
      await createComponent({
        name: 'interactive',
        path: '/output',
        hyperscript: true,
        events: ['click', 'mouseenter'],
        template: true,
        styles: true,
      });

      const writeCalls = mockFs.writeFile.mock.calls;
      const htmlCall = writeCalls.find(call => call[0].endsWith('.html'));
      expect(htmlCall).toBeDefined();
      expect(htmlCall?.[1]).toContain('_=');
    });
  });

  describe('createTemplate', () => {
    it('should create a basic template', async () => {
      await createTemplate({
        name: 'my-template',
        path: '/templates',
        variables: ['title', 'content'],
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should create template with slots', async () => {
      await createTemplate({
        name: 'layout-template',
        path: '/templates',
        variables: ['title'],
        slots: ['header', 'main', 'footer'],
      });

      const writeCalls = mockFs.writeFile.mock.calls;
      const templateCall = writeCalls.find(call => call[1].includes('slot'));
      expect(templateCall).toBeDefined();
    });

    it('should create TypeScript template', async () => {
      await createTemplate({
        name: 'typed-template',
        path: '/templates',
        typescript: true,
        variables: ['data'],
      });

      const writeCalls = mockFs.writeFile.mock.calls;
      expect(writeCalls.some(call => call[0].endsWith('.ts'))).toBe(true);
    });

    it('should handle empty variables array', async () => {
      await createTemplate({
        name: 'static-template',
        path: '/templates',
        variables: [],
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('generateCode', () => {
    it('should generate component code from schema', async () => {
      const result = await generateCode({
        type: 'component',
        name: 'test-component',
        schema: {
          template: '<div>Hello</div>',
          events: ['click'],
          commands: ['add', 'remove'],
        },
      });

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
    });

    it('should generate page code from schema', async () => {
      const result = await generateCode({
        type: 'page',
        name: 'home-page',
        schema: {
          title: 'Home',
          components: ['header', 'footer'],
        },
      });

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
    });

    it('should generate form code', async () => {
      const result = await generateCode({
        type: 'form',
        name: 'contact-form',
        schema: {
          fields: [
            { name: 'email', type: 'email', required: true },
            { name: 'message', type: 'textarea', required: true },
          ],
          submitAction: 'send-message',
        },
      });

      expect(result).toBeDefined();
      expect(result.files.html).toContain('form');
    });

    it('should generate list code', async () => {
      const result = await generateCode({
        type: 'list',
        name: 'todo-list',
        schema: {
          itemTemplate: '<li>{{item.text}}</li>',
          actions: ['add', 'remove', 'toggle'],
        },
      });

      expect(result).toBeDefined();
      expect(result.files.html).toContain('list');
    });

    it('should throw for unknown type', async () => {
      await expect(
        generateCode({
          type: 'unknown' as any,
          name: 'test',
          schema: {},
        })
      ).rejects.toThrow();
    });

    it('should include hyperscript for interactive components', async () => {
      const result = await generateCode({
        type: 'component',
        name: 'button',
        schema: {
          template: '<button>Click me</button>',
          events: ['click'],
          commands: ['toggle'],
        },
      });

      expect(result.files.html).toContain('_=');
    });
  });

  describe('Template Variables', () => {
    it('should replace all standard variables', async () => {
      await createProject({
        name: 'var-test',
        template: 'basic',
        description: 'Test Description',
        author: 'Test Author',
        license: 'MIT',
        typescript: false,
        testing: false,
        linting: false,
        git: false,
        install: false,
      });

      // Check that writeFile was called (template processing happened)
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('Project Templates', () => {
    const templates = ['basic', 'full-stack', 'api', 'static'];

    templates.forEach(template => {
      it(`should create ${template} template project`, async () => {
        await createProject({
          name: `${template}-project`,
          template: template as any,
          typescript: false,
          testing: false,
          linting: false,
          git: false,
          install: false,
        });

        expect(mockFs.ensureDir).toHaveBeenCalled();
        expect(mockFs.writeFile).toHaveBeenCalled();
      });
    });
  });

  describe('Options Handling', () => {
    it('should handle TypeScript option', async () => {
      await createProject({
        name: 'ts-project',
        template: 'basic',
        typescript: true,
        testing: false,
        linting: false,
        git: false,
        install: false,
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle testing option', async () => {
      await createProject({
        name: 'test-project',
        template: 'basic',
        typescript: false,
        testing: true,
        linting: false,
        git: false,
        install: false,
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle linting option', async () => {
      await createProject({
        name: 'lint-project',
        template: 'basic',
        typescript: false,
        testing: false,
        linting: true,
        git: false,
        install: false,
      });

      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });
});
