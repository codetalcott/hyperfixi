/**
 * Behavior Parser Integration Tests
 * Tests for parsing behavior definition syntax
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type { BehaviorNode, EventHandlerNode } from '../types/base-types';

describe('Behavior Parser', () => {
  describe('basic behavior parsing', () => {
    it('should parse simple behavior with one event handler', () => {
      const input = `
        behavior Removable
          on click
            remove me
          end
        end
      `;

      const result = parse(input);

      if (!result.success) {
        console.error('Parse failed with error:', result.error?.message);
        console.error('Node type:', result.node?.type);
      }

      expect(result.success).toBe(true);
      expect(result.node!.type).toBe('behavior');

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('Removable');
      expect(behavior.parameters).toEqual([]);
      expect(behavior.eventHandlers).toHaveLength(1);
      expect(behavior.eventHandlers[0].event).toBe('click');
    });

    it('should parse behavior with multiple event handlers', () => {
      const input = `
        behavior Draggable
          on mousedown
            add .dragging
          end
          on mouseup
            remove .dragging
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('Draggable');
      expect(behavior.eventHandlers).toHaveLength(2);
      expect(behavior.eventHandlers[0].event).toBe('mousedown');
      expect(behavior.eventHandlers[1].event).toBe('mouseup');
    });

    it('should parse behavior without event handlers', () => {
      const input = `
        behavior EmptyBehavior
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('EmptyBehavior');
      expect(behavior.eventHandlers).toEqual([]);
    });
  });

  describe('parameterized behaviors', () => {
    it('should parse behavior with single parameter', () => {
      const input = `
        behavior Tooltip(text)
          on mouseenter
            show text
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('Tooltip');
      expect(behavior.parameters).toEqual(['text']);
    });

    it('should parse behavior with multiple parameters', () => {
      const input = `
        behavior Modal(title, content, closeable)
          on click
            hide me
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('Modal');
      expect(behavior.parameters).toEqual(['title', 'content', 'closeable']);
    });

    it('should parse behavior with empty parameter list', () => {
      const input = `
        behavior MyBehavior()
          on click
            log "clicked"
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('MyBehavior');
      expect(behavior.parameters).toEqual([]);
    });
  });

  describe('init blocks', () => {
    it('should parse behavior with init block', () => {
      const input = `
        behavior Counter
          init
            set count to 0
          end
          on click
            increment count
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('Counter');
      expect(behavior.initBlock).toBeDefined();
      expect(behavior.initBlock?.type).toBe('initBlock');
    });

    it('should parse behavior with init block and multiple commands', () => {
      const input = `
        behavior Slideshow
          init
            set currentSlide to 0
            set totalSlides to 10
            set autoplay to true
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.initBlock).toBeDefined();
      expect(behavior.initBlock?.commands).toBeDefined();
    });

    it('should parse behavior with both init and event handlers', () => {
      const input = `
        behavior Accordion
          init
            set expanded to false
          end
          on click
            toggle expanded
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.initBlock).toBeDefined();
      expect(behavior.eventHandlers).toHaveLength(1);
    });
  });

  describe('complex behaviors', () => {
    it('should parse complete behavior with all features', () => {
      const input = `
        behavior AdvancedTooltip(text, position, delay)
          init
            set visible to false
            set tooltipElement to null
          end
          on mouseenter
            show text at position
          end
          on mouseleave
            hide me
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('AdvancedTooltip');
      expect(behavior.parameters).toEqual(['text', 'position', 'delay']);
      expect(behavior.initBlock).toBeDefined();
      expect(behavior.eventHandlers).toHaveLength(2);
    });

    it('should parse behavior with multiple commands in event handler', () => {
      const input = `
        behavior FadeRemove
          on click
            add .fading
            hide me
            remove me
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      const handler = behavior.eventHandlers[0];
      expect(handler.commands).toHaveLength(3);
    });
  });

  describe('error cases', () => {
    it('should reject behavior name starting with lowercase', () => {
      const input = `
        behavior removable
          on click
            remove me
          end
        end
      `;

      const result = parse(input);

      // Should still parse but with error
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('uppercase');
    });

    it('should reject missing behavior name', () => {
      const input = `
        behavior
          on click
            remove me
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject missing end keyword', () => {
      const input = `
        behavior Removable
          on click
            remove me
          end
      `;

      const result = parse(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('end');
    });

    it('should reject missing end after event handler', () => {
      const input = `
        behavior Removable
          on click
            remove me
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid tokens in behavior body', () => {
      const input = `
        behavior Removable
          invalid_keyword
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('real-world examples', () => {
    it('should parse official removable behavior', () => {
      const input = `
        behavior Removable
          on click
            remove me
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('Removable');
      expect(behavior.eventHandlers).toHaveLength(1);
      expect(behavior.eventHandlers[0].event).toBe('click');
    });

    it('should parse draggable behavior', () => {
      const input = `
        behavior Draggable
          on mousedown
            add .dragging to me
          end
          on mousemove
            set left to event.clientX
            set top to event.clientY
          end
          on mouseup
            remove .dragging from me
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('Draggable');
      expect(behavior.eventHandlers).toHaveLength(3);
    });

    it('should parse sortable behavior with parameters', () => {
      const input = `
        behavior Sortable(axis, handle)
          init
            set items to []
          end
          on mousedown
            log "sorting started"
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('Sortable');
      expect(behavior.parameters).toEqual(['axis', 'handle']);
      expect(behavior.initBlock).toBeDefined();
      expect(behavior.eventHandlers).toHaveLength(1);
    });
  });

  describe('AST structure', () => {
    it('should include position information', () => {
      const input = `
        behavior Test
          on click
            log "test"
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.start).toBeDefined();
      expect(behavior.end).toBeDefined();
      expect(behavior.line).toBeDefined();
      expect(behavior.column).toBeDefined();
    });

    it('should have correct node types', () => {
      const input = `
        behavior Test
          on click
            remove me
          end
        end
      `;

      const result = parse(input);

      const behavior = result.node as BehaviorNode;
      expect(behavior.type).toBe('behavior');
      expect(behavior.eventHandlers[0].type).toBe('eventHandler');
    });
  });

  describe('complex nested behavior patterns', () => {
    it('should parse behavior with repeat until event from document', () => {
      const input = `
        behavior Draggable(dragHandle)
          init
            if no dragHandle set the dragHandle to me
          end
          on pointerdown(clientX, clientY) from dragHandle
            halt the event
            trigger draggable:start
            set startX to 0
            set startY to 0
            set xoff to clientX - startX
            set yoff to clientY - startY
            repeat until event pointerup from document
              wait for pointermove(clientX, clientY) from document
              set x to clientX - xoff
              set y to clientY - yoff
            end
            trigger draggable:end
          end
        end
      `;

      const result = parse(input);

      expect(result.success).toBe(true);

      const behavior = result.node as BehaviorNode;
      expect(behavior.name).toBe('Draggable');
      expect(behavior.parameters).toEqual(['dragHandle']);
      expect(behavior.eventHandlers).toHaveLength(1);

      const handler = behavior.eventHandlers[0];
      expect(handler.event).toBe('pointerdown');
      expect(handler.args).toEqual(['clientX', 'clientY']);
      expect(handler.target).toBe('dragHandle');
    });
  });
});
