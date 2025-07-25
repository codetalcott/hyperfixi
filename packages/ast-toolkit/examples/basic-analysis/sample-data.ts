/**
 * Sample AST data for basic analysis example
 */

import type { ASTNode } from '@hyperfixi/ast-toolkit';

/**
 * Complex interactive application AST for comprehensive analysis
 */
export function sampleComplexAST(): ASTNode {
  return {
    type: 'program',
    start: 0,
    end: 500,
    line: 1,
    column: 1,
    features: [
      // Modal trigger functionality
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.modal-trigger',
        start: 0,
        end: 80,
        line: 1,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'add',
            start: 20,
            end: 40,
            line: 1,
            column: 21,
            args: [{ type: 'selector', value: '.loading', start: 25, end: 33, line: 1, column: 26 }]
          },
          {
            type: 'command',
            name: 'fetch',
            start: 45,
            end: 65,
            line: 1,
            column: 46,
            args: [{ type: 'literal', value: '/api/modal-content', start: 51, end: 70, line: 1, column: 52 }]
          },
          {
            type: 'command',
            name: 'remove',
            start: 70,
            end: 95,
            line: 1,
            column: 71,
            args: [{ type: 'selector', value: '.loading', start: 77, end: 85, line: 1, column: 78 }]
          },
          {
            type: 'command',
            name: 'toggle',
            start: 100,
            end: 125,
            line: 1,
            column: 101,
            args: [{ type: 'selector', value: '.modal-open', start: 107, end: 118, line: 1, column: 108 }],
            target: { type: 'identifier', name: 'body', start: 123, end: 127, line: 1, column: 124 }
          }
        ]
      },
      
      // Form validation with complex logic
      {
        type: 'eventHandler',
        event: 'input',
        selector: 'input[required]',
        start: 130,
        end: 250,
        line: 3,
        column: 1,
        commands: [
          {
            type: 'conditional',
            start: 150,
            end: 240,
            line: 3,
            column: 21,
            condition: {
              type: 'logicalExpression',
              operator: 'and',
              left: {
                type: 'binaryExpression',
                operator: '>',
                left: { type: 'memberExpression', property: { type: 'identifier', name: 'length' } },
                right: { type: 'literal', value: 0 }
              },
              right: {
                type: 'callExpression',
                callee: { type: 'memberExpression', property: { type: 'identifier', name: 'matches' } },
                arguments: [{ type: 'literal', value: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/' }]
              }
            },
            then: {
              type: 'command',
              name: 'remove',
              args: [{ type: 'selector', value: '.invalid', start: 190, end: 198, line: 3, column: 61 }]
            },
            else: {
              type: 'command',
              name: 'add',
              args: [{ type: 'selector', value: '.invalid', start: 220, end: 228, line: 3, column: 91 }]
            }
          }
        ]
      },
      
      // Form submission with error handling
      {
        type: 'eventHandler',
        event: 'submit',
        selector: '#contact-form',
        start: 255,
        end: 380,
        line: 5,
        column: 1,
        commands: [
          {
            type: 'conditional',
            start: 275,
            end: 320,
            line: 5,
            column: 21,
            condition: {
              type: 'callExpression',
              callee: { type: 'memberExpression', property: { type: 'identifier', name: 'checkValidity' } }
            },
            then: {
              type: 'command',
              name: 'fetch',
              args: [
                { type: 'literal', value: '/api/contact', start: 295, end: 308, line: 5, column: 66 },
                { type: 'identifier', name: 'form', start: 310, end: 314, line: 5, column: 81 }
              ]
            }
          },
          {
            type: 'command',
            name: 'put',
            start: 325,
            end: 360,
            line: 5,
            column: 96,
            args: [{ type: 'literal', value: 'Message sent successfully!', start: 330, end: 356, line: 5, column: 101 }],
            target: { type: 'selector', value: '#status', start: 365, end: 372, line: 5, column: 136 }
          }
        ]
      },
      
      // Hover effects for tooltips
      {
        type: 'eventHandler',
        event: 'mouseenter',
        selector: '[data-tooltip]',
        start: 385,
        end: 420,
        line: 7,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'add',
            start: 405,
            end: 415,
            line: 7,
            column: 21,
            args: [{ type: 'selector', value: '.tooltip-visible', start: 410, end: 426, line: 7, column: 26 }]
          }
        ]
      },
      
      // Tooltip hide on mouse leave
      {
        type: 'eventHandler',
        event: 'mouseleave',
        selector: '[data-tooltip]',
        start: 425,
        end: 460,
        line: 8,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'remove',
            start: 445,
            end: 455,
            line: 8,
            column: 21,
            args: [{ type: 'selector', value: '.tooltip-visible', start: 450, end: 466, line: 8, column: 26 }]
          }
        ]
      },
      
      // Reusable modal behavior definition
      {
        type: 'behavior',
        name: 'modal-controller',
        start: 465,
        end: 485,
        line: 10,
        column: 1,
        parameters: ['trigger', 'modal'],
        body: [
          {
            type: 'command',
            name: 'toggle',
            args: [{ type: 'selector', value: '.modal-open' }]
          }
        ]
      },
      
      // Custom validation function
      {
        type: 'function',
        name: 'validateEmail',
        start: 490,
        end: 500,
        line: 12,
        column: 1,
        parameters: ['email'],
        body: {
          type: 'returnStatement',
          argument: {
            type: 'callExpression',
            callee: { type: 'memberExpression', property: { type: 'identifier', name: 'test' } }
          }
        }
      }
    ]
  } as any;
}

/**
 * Simple AST for comparison
 */
export function sampleSimpleAST(): ASTNode {
  return {
    type: 'program',
    start: 0,
    end: 50,
    line: 1,
    column: 1,
    features: [
      {
        type: 'eventHandler',
        event: 'click',
        selector: '#button',
        start: 0,
        end: 50,
        line: 1,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'toggle',
            start: 10,
            end: 30,
            line: 1,
            column: 11,
            args: [{ type: 'selector', value: '.active', start: 17, end: 24, line: 1, column: 18 }]
          }
        ]
      }
    ]
  } as any;
}

/**
 * AST with code smells for demonstrating detection
 */
export function sampleProblematicAST(): ASTNode {
  return {
    type: 'program',
    start: 0,
    end: 300,
    line: 1,
    column: 1,
    features: [
      {
        type: 'eventHandler',
        event: 'click',
        start: 0,
        end: 150,
        line: 1,
        column: 1,
        commands: Array.from({ length: 10 }, (_, i) => ({
          type: 'command',
          name: 'add',
          start: i * 10,
          end: (i + 1) * 10,
          line: 1,
          column: i * 10 + 1,
          args: [{ type: 'selector', value: `.class${i}`, start: 0, end: 7, line: 1, column: 1 }]
        }))
      },
      // Duplicate event handler (code smell)
      {
        type: 'eventHandler',
        event: 'click',
        start: 155,
        end: 200,
        line: 2,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'remove',
            start: 165,
            end: 185,
            line: 2,
            column: 11,
            args: [{ type: 'selector', value: '.active', start: 172, end: 179, line: 2, column: 18 }]
          }
        ]
      }
    ]
  } as any;
}