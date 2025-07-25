/**
 * Sample AST data for AI analysis example
 */

import type { ASTNode } from '@hyperfixi/ast-toolkit';

/**
 * Interactive dashboard with multiple user interactions
 */
export function sampleInteractiveAST(): ASTNode {
  return {
    type: 'program',
    start: 0,
    end: 400,
    line: 1,
    column: 1,
    features: [
      // Tab switching functionality
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.tab-button',
        start: 0,
        end: 80,
        line: 1,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'remove',
            start: 20,
            end: 40,
            line: 1,
            column: 21,
            args: [{ type: 'selector', value: '.active', start: 27, end: 34, line: 1, column: 28 }],
            target: { type: 'selector', value: '.tab-button', start: 45, end: 56, line: 1, column: 46 }
          },
          {
            type: 'command',
            name: 'add',
            start: 60,
            end: 75,
            line: 1,
            column: 61,
            args: [{ type: 'selector', value: '.active', start: 65, end: 72, line: 1, column: 66 }],
            target: { type: 'identifier', name: 'me', start: 77, end: 79, line: 1, column: 78 }
          }
        ]
      },
      
      // Data loading with AJAX
      {
        type: 'eventHandler',
        event: 'click',
        selector: '#refresh-data',
        start: 85,
        end: 160,
        line: 3,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'add',
            start: 105,
            end: 120,
            line: 3,
            column: 21,
            args: [{ type: 'selector', value: '.loading', start: 110, end: 118, line: 3, column: 26 }]
          },
          {
            type: 'command',
            name: 'fetch',
            start: 125,
            end: 145,
            line: 3,
            column: 41,
            args: [{ type: 'literal', value: '/api/dashboard-data', start: 131, end: 150, line: 3, column: 47 }]
          },
          {
            type: 'command',
            name: 'put',
            start: 150,
            end: 175,
            line: 3,
            column: 66,
            args: [{ type: 'identifier', name: 'it', start: 155, end: 157, line: 3, column: 71 }],
            target: { type: 'selector', value: '#data-container', start: 160, end: 175, line: 3, column: 76 }
          },
          {
            type: 'command',
            name: 'remove',
            start: 180,
            end: 195,
            line: 3,
            column: 96,
            args: [{ type: 'selector', value: '.loading', start: 187, end: 195, line: 3, column: 103 }]
          }
        ]
      },
      
      // Search functionality
      {
        type: 'eventHandler',
        event: 'input',
        selector: '#search-input',
        start: 200,
        end: 280,
        line: 5,
        column: 1,
        commands: [
          {
            type: 'conditional',
            start: 220,
            end: 270,
            line: 5,
            column: 21,
            condition: {
              type: 'binaryExpression',
              operator: '>',
              left: { type: 'memberExpression', property: { type: 'identifier', name: 'length' } },
              right: { type: 'literal', value: 2 }
            },
            then: {
              type: 'command',
              name: 'fetch',
              args: [{ type: 'literal', value: '/api/search', start: 245, end: 257, line: 5, column: 66 }]
            },
            else: {
              type: 'command',
              name: 'put',
              args: [{ type: 'literal', value: '', start: 265, end: 267, line: 5, column: 86 }],
              target: { type: 'selector', value: '#search-results', start: 270, end: 285, line: 5, column: 91 }
            }
          }
        ]
      },
      
      // Notification dismissal
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.notification .close',
        start: 285,
        end: 320,
        line: 7,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'add',
            start: 305,
            end: 315,
            line: 7,
            column: 21,
            args: [{ type: 'selector', value: '.fade-out', start: 310, end: 319, line: 7, column: 26 }],
            target: { type: 'identifier', name: 'closest', start: 325, end: 332, line: 7, column: 41 }
          }
        ]
      },
      
      // Modal behavior definition
      {
        type: 'behavior',
        name: 'modal-handler',
        start: 325,
        end: 370,
        line: 9,
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
      
      // Utility function for data formatting
      {
        type: 'function',
        name: 'formatData',
        start: 375,
        end: 400,
        line: 11,
        column: 1,
        parameters: ['data'],
        body: {
          type: 'returnStatement',
          argument: {
            type: 'callExpression',
            callee: { type: 'memberExpression', property: { type: 'identifier', name: 'map' } }
          }
        }
      }
    ]
  } as any;
}

/**
 * Contact form with validation
 */
export function sampleFormAST(): ASTNode {
  return {
    type: 'program',
    start: 0,
    end: 250,
    line: 1,
    column: 1,
    features: [
      // Email validation on input
      {
        type: 'eventHandler',
        event: 'input',
        selector: 'input[type="email"]',
        start: 0,
        end: 80,
        line: 1,
        column: 1,
        commands: [
          {
            type: 'conditional',
            start: 20,
            end: 70,
            line: 1,
            column: 21,
            condition: {
              type: 'callExpression',
              callee: { type: 'memberExpression', property: { type: 'identifier', name: 'matches' } },
              arguments: [{ type: 'literal', value: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/' }]
            },
            then: {
              type: 'command',
              name: 'remove',
              args: [{ type: 'selector', value: '.error', start: 45, end: 51, line: 1, column: 46 }]
            },
            else: {
              type: 'command',
              name: 'add',
              args: [{ type: 'selector', value: '.error', start: 60, end: 66, line: 1, column: 61 }]
            }
          }
        ]
      },
      
      // Form submission
      {
        type: 'eventHandler',
        event: 'submit',
        selector: '#contact-form',
        start: 85,
        end: 180,
        line: 3,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'add',
            start: 105,
            end: 120,
            line: 3,
            column: 21,
            args: [{ type: 'selector', value: '.submitting', start: 110, end: 121, line: 3, column: 26 }]
          },
          {
            type: 'command',
            name: 'fetch',
            start: 125,
            end: 150,
            line: 3,
            column: 41,
            args: [
              { type: 'literal', value: '/api/contact', start: 131, end: 143, line: 3, column: 47 },
              { type: 'identifier', name: 'form', start: 148, end: 152, line: 3, column: 64 }
            ]
          },
          {
            type: 'command',
            name: 'put',
            start: 155,
            end: 175,
            line: 3,
            column: 71,
            args: [{ type: 'literal', value: 'Thank you for your message!', start: 160, end: 187, line: 3, column: 76 }],
            target: { type: 'selector', value: '#success-message', start: 190, end: 206, line: 3, column: 106 }
          }
        ]
      },
      
      // Reset form button
      {
        type: 'eventHandler',
        event: 'click',
        selector: '#reset-form',
        start: 185,
        end: 220,
        line: 5,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'remove',
            start: 205,
            end: 215,
            line: 5,
            column: 21,
            args: [{ type: 'selector', value: '.error', start: 212, end: 218, line: 5, column: 28 }],
            target: { type: 'selector', value: 'input', start: 220, end: 225, line: 5, column: 36 }
          }
        ]
      },
      
      // Character counter for textarea
      {
        type: 'eventHandler',
        event: 'input',
        selector: 'textarea',
        start: 225,
        end: 250,
        line: 7,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'put',
            start: 245,
            end: 250,
            line: 7,
            column: 21,
            args: [{ type: 'memberExpression', property: { type: 'identifier', name: 'length' } }],
            target: { type: 'selector', value: '#char-count', start: 255, end: 266, line: 7, column: 31 }
          }
        ]
      }
    ]
  } as any;
}

/**
 * E-commerce product page with complex interactions
 */
export function sampleEcommerceAST(): ASTNode {
  return {
    type: 'program',
    start: 0,
    end: 350,
    line: 1,
    column: 1,
    features: [
      // Add to cart functionality
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.add-to-cart',
        start: 0,
        end: 100,
        line: 1,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'fetch',
            start: 20,
            end: 50,
            line: 1,
            column: 21,
            args: [
              { type: 'literal', value: '/api/cart/add', start: 26, end: 39, line: 1, column: 27 },
              { type: 'objectExpression', properties: [
                { key: 'productId', value: { type: 'literal', value: '123' } },
                { key: 'quantity', value: { type: 'literal', value: 1 } }
              ]}
            ]
          },
          {
            type: 'command',
            name: 'put',
            start: 55,
            end: 80,
            line: 1,
            column: 56,
            args: [{ type: 'literal', value: 'Added to cart!', start: 60, end: 74, line: 1, column: 61 }],
            target: { type: 'selector', value: '.cart-message', start: 85, end: 98, line: 1, column: 86 }
          }
        ]
      },
      
      // Image gallery navigation
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.thumbnail',
        start: 105,
        end: 150,
        line: 3,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'remove',
            start: 125,
            end: 140,
            line: 3,
            column: 21,
            args: [{ type: 'selector', value: '.active', start: 132, end: 139, line: 3, column: 28 }],
            target: { type: 'selector', value: '.thumbnail', start: 145, end: 155, line: 3, column: 41 }
          },
          {
            type: 'command',
            name: 'add',
            start: 160,
            end: 170,
            line: 3,
            column: 56,
            args: [{ type: 'selector', value: '.active', start: 165, end: 172, line: 3, column: 61 }],
            target: { type: 'identifier', name: 'me', start: 175, end: 177, line: 3, column: 71 }
          }
        ]
      },
      
      // Quantity selector
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.quantity-btn',
        start: 180,
        end: 250,
        line: 5,
        column: 1,
        commands: [
          {
            type: 'conditional',
            start: 200,
            end: 240,
            line: 5,
            column: 21,
            condition: {
              type: 'callExpression',
              callee: { type: 'memberExpression', property: { type: 'identifier', name: 'matches' } },
              arguments: [{ type: 'literal', value: '.plus' }]
            },
            then: {
              type: 'command',
              name: 'put',
              args: [{ type: 'binaryExpression', operator: '+', left: { type: 'identifier', name: 'currentValue' }, right: { type: 'literal', value: 1 } }]
            },
            else: {
              type: 'command',
              name: 'put',
              args: [{ type: 'binaryExpression', operator: '-', left: { type: 'identifier', name: 'currentValue' }, right: { type: 'literal', value: 1 } }]
            }
          }
        ]
      },
      
      // Product comparison
      {
        type: 'eventHandler',
        event: 'change',
        selector: '.compare-checkbox',
        start: 255,
        end: 320,
        line: 7,
        column: 1,
        commands: [
          {
            type: 'conditional',
            start: 275,
            end: 310,
            line: 7,
            column: 21,
            condition: {
              type: 'memberExpression',
              property: { type: 'identifier', name: 'checked' }
            },
            then: {
              type: 'command',
              name: 'add',
              args: [{ type: 'selector', value: '.comparing', start: 290, end: 300, line: 7, column: 36 }]
            },
            else: {
              type: 'command',
              name: 'remove',
              args: [{ type: 'selector', value: '.comparing', start: 305, end: 315, line: 7, column: 51 }]
            }
          }
        ]
      },
      
      // Review submission
      {
        type: 'eventHandler',
        event: 'submit',
        selector: '#review-form',
        start: 325,
        end: 350,
        line: 9,
        column: 1,
        commands: [
          {
            type: 'command',
            name: 'fetch',
            start: 345,
            end: 350,
            line: 9,
            column: 21,
            args: [
              { type: 'literal', value: '/api/reviews', start: 0, end: 12, line: 9, column: 27 },
              { type: 'identifier', name: 'form', start: 15, end: 19, line: 9, column: 40 }
            ]
          }
        ]
      }
    ]
  } as any;
}