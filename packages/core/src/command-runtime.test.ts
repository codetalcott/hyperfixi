import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandRuntime } from './command-runtime';
import { parseHyperscript } from './hyperscript-parser';
import { createMutableTestContext } from './test-helpers/context-factory';

// Mock DOM environment
const mockElement = {
  innerHTML: '',
  textContent: '',
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    toggle: vi.fn(),
  },
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  hasAttribute: vi.fn(),
  style: {},
  appendChild: vi.fn(),
  before: vi.fn(),
  after: vi.fn(),
  prepend: vi.fn(),
  append: vi.fn(),
} as any;

const mockDocument = {
  getElementById: vi.fn(),
  querySelector: vi.fn(),
  createDocumentFragment: vi.fn(() => ({
    append: vi.fn(),
    appendChild: vi.fn(),
    querySelectorAll: vi.fn(() => []),
  })),
  createElement: vi.fn(() => ({
    innerHTML: '',
    content: {
      cloneNode: vi.fn(() => mockElement),
    },
  })),
} as any;

// Set up global mocks
globalThis.document = mockDocument;
globalThis.console = { log: vi.fn() } as any;

describe('CommandRuntime', () => {
  let runtime: CommandRuntime;
  let context: ReturnType<typeof createMutableTestContext>;

  beforeEach(() => {
    runtime = new CommandRuntime();
    context = createMutableTestContext({
      me: mockElement,
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('PUT command', () => {
    it('should execute basic put into element', async () => {
      const result = parseHyperscript('put "Hello" into me');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      // Should convert to fragment and append
      expect(mockDocument.createDocumentFragment).toHaveBeenCalled();
    });

    it('should execute put with ID target', async () => {
      const targetElement = { ...mockElement };
      mockDocument.getElementById.mockReturnValue(targetElement);

      const result = parseHyperscript('put "Hello" into #target');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockDocument.getElementById).toHaveBeenCalledWith('target');
    });

    it('should execute put with class target', async () => {
      const targetElement = { ...mockElement };
      mockDocument.querySelector.mockReturnValue(targetElement);

      const result = parseHyperscript('put "Hello" into .target');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockDocument.querySelector).toHaveBeenCalledWith('.target');
    });

    it('should handle possessive expressions', async () => {
      const result = parseHyperscript("put 'test' into my innerHTML");
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      // Should set innerHTML property
      expect(context.me.innerHTML).toBe('test');
    });

    it('should handle attribute targets', async () => {
      const result = parseHyperscript('put "value" into @data-test');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockElement.setAttribute).toHaveBeenCalledWith('data-test', 'value');
    });

    it('should handle style targets', async () => {
      const result = parseHyperscript('put "red" into *color');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(context.me.style.color).toBe('red');
    });
  });

  describe('ADD command', () => {
    it('should add CSS class', async () => {
      const result = parseHyperscript('add .active to me');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockElement.classList.add).toHaveBeenCalledWith('active');
    });

    it('should add CSS class without dot', async () => {
      const result = parseHyperscript('add active to me');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockElement.classList.add).toHaveBeenCalledWith('active');
    });

    it('should add attribute', async () => {
      const result = parseHyperscript('add @disabled to me');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockElement.setAttribute).toHaveBeenCalledWith('disabled', '');
    });
  });

  describe('REMOVE command', () => {
    it('should remove CSS class', async () => {
      const result = parseHyperscript('remove .active from me');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockElement.classList.remove).toHaveBeenCalledWith('active');
    });

    it('should remove attribute', async () => {
      const result = parseHyperscript('remove @disabled from me');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockElement.removeAttribute).toHaveBeenCalledWith('disabled');
    });
  });

  describe('TOGGLE command', () => {
    it('should toggle CSS class', async () => {
      const result = parseHyperscript('toggle .active on me');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockElement.classList.toggle).toHaveBeenCalledWith('active');
    });

    it('should toggle attribute', async () => {
      mockElement.hasAttribute.mockReturnValue(false);

      const result = parseHyperscript('toggle @disabled on me');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockElement.hasAttribute).toHaveBeenCalledWith('disabled');
      expect(mockElement.setAttribute).toHaveBeenCalledWith('disabled', '');
    });

    it('should toggle attribute when present', async () => {
      mockElement.hasAttribute.mockReturnValue(true);

      const result = parseHyperscript('toggle @disabled on me');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(mockElement.hasAttribute).toHaveBeenCalledWith('disabled');
      expect(mockElement.removeAttribute).toHaveBeenCalledWith('disabled');
    });
  });

  describe('SET command', () => {
    it('should set variable', async () => {
      const result = parseHyperscript('set myVar to "hello"');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect((context as any).myVar).toBe('hello');
    });
  });

  describe('LOG command', () => {
    it('should log value', async () => {
      const result = parseHyperscript('log "test message"');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(console.log).toHaveBeenCalledWith('test message');
    });

    it('should log variable', async () => {
      (context as any).myVar = 'hello world';

      const result = parseHyperscript('log myVar');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(console.log).toHaveBeenCalledWith('hello world');
    });
  });

  describe('error handling', () => {
    it('should handle unknown commands', async () => {
      const result = parseHyperscript('unknownCommand "test"');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];

      await expect(runtime.executeCommand(command, context)).rejects.toThrow(
        'Unknown command: unknownCommand'
      );
    });

    it('should handle null targets gracefully', async () => {
      mockDocument.getElementById.mockReturnValue(null);

      const result = parseHyperscript('put "hello" into #nonexistent');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];

      // Should not throw
      await expect(runtime.executeCommand(command, context)).resolves.toBeUndefined();
    });
  });

  describe('expression evaluation', () => {
    it('should evaluate context variables', async () => {
      context.it = 'test value';

      const result = parseHyperscript('log it');
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(console.log).toHaveBeenCalledWith('test value');
    });

    it('should evaluate possessive expressions', async () => {
      const testObj = { prop: 'test value' };
      (context as any).myObj = testObj;

      const result = parseHyperscript("log myObj's prop");
      expect(result.success).toBe(true);

      const command = result.result!.features[0].body[0];
      await runtime.executeCommand(command, context);

      expect(console.log).toHaveBeenCalledWith('test value');
    });
  });
});
