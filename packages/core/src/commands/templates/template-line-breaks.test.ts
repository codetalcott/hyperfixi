/**
 * Template Line Break Handling Tests
 * Test template system's handling of newlines and formatting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../../test-setup.js';
import { FixedTemplateProcessor } from './template-processor-fixed';
import type { ExecutionContext } from '../../types/core';

describe('Template Line Break Handling', () => {
  let processor: FixedTemplateProcessor;
  let context: ExecutionContext;

  beforeEach(() => {
    processor = new FixedTemplateProcessor();
    context = {
      me: document.createElement('div'),
      locals: new Map([
        ['items', [1, 2, 3]],
        ['x', '<br>'],
        ['showA', true],
      ]),
    };
  });

  it('should preserve newlines in @repeat directive output', async () => {
    const template = 'begin\n@repeat in items\n${it}\n@end\nend\n';

    const result = await processor.processTemplate(template, context);

    expect(result).toBe('begin\n1\n2\n3\nend\n');
  });

  it('should handle @if/@else with proper newlines', async () => {
    const template = 'begin\n@if showA\na\n@else\nb\n@end\nend\n';

    const result = await processor.processTemplate(template, context);

    expect(result).toBe('begin\na\nend\n');
  });

  it('should handle @if/@else false condition with proper newlines', async () => {
    context.locals?.set('showA', false);
    const template = 'begin\n@if showA\na\n@else\nb\n@end\nend\n';

    const result = await processor.processTemplate(template, context);

    expect(result).toBe('begin\nb\nend\n');
  });

  it('should properly escape HTML in templates', async () => {
    const template = 'render ${x} ${unescaped x}';

    const result = await processor.processTemplate(template, context);

    expect(result).toBe('render &lt;br&gt; <br>');
  });

  it('should debug HTML escaping step by step', async () => {
    // Test just escaped
    const escaped = await processor.processTemplate('${x}', context);
    expect(escaped).toBe('&lt;br&gt;');

    // Test just unescaped
    const unescaped = await processor.processTemplate('${unescaped x}', context);
    expect(unescaped).toBe('<br>');

    // Test combined
    const combined = await processor.processTemplate('${x} ${unescaped x}', context);
    expect(combined).toBe('&lt;br&gt; <br>');
  });

  it('should handle complex templates with multiple directives', async () => {
    const template = 'start\n@repeat in items\n  item: ${it}\n@end\ndone';

    const result = await processor.processTemplate(template, context);

    expect(result).toBe('start\n  item: 1\n  item: 2\n  item: 3\ndone');
  });

  it('should handle empty arrays in @repeat', async () => {
    context.locals?.set('items', []);
    const template = 'begin\n@repeat in items\n${it}\n@end\nend\n';

    const result = await processor.processTemplate(template, context);

    expect(result).toBe('begin\nend\n');
  });

  it('should evaluate literal true condition correctly', async () => {
    const template = 'begin\n@if true\na\n@else\nb\n@end\nend\n';

    const result = await processor.processTemplate(template, context);

    expect(result).toBe('begin\na\nend\n');
  });

  it('should evaluate literal false condition correctly', async () => {
    const template = 'begin\n@if false\na\n@else\nb\n@end\nend\n';

    const result = await processor.processTemplate(template, context);

    expect(result).toBe('begin\nb\nend\n');
  });
});
