/**
 * Sample AST data for semantic analysis example
 */

import type { ASTNode } from '@hyperfixi/ast-toolkit';

/**
 * Modal dialog system with trigger and close functionality
 */
export function sampleModalAST(): ASTNode {
  return {
    type: 'program',
    start: 0,
    end: 200,
    line: 1,
    column: 1,
    features: [
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.modal-trigger',
        commands: [
          {
            type: 'command',
            name: 'add',
            args: [{ type: 'selector', value: '.modal-open' }],
            target: { type: 'identifier', name: 'body' }
          },
          {
            type: 'command',
            name: 'add',
            args: [{ type: 'selector', value: '.modal-backdrop' }]
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.modal-close, .modal-backdrop',
        commands: [
          {
            type: 'command',
            name: 'remove',
            args: [{ type: 'selector', value: '.modal-open' }],
            target: { type: 'identifier', name: 'body' }
          },
          {
            type: 'command',
            name: 'remove',
            args: [{ type: 'selector', value: '.modal-backdrop' }]
          }
        ]
      }
    ]
  } as any;
}

/**
 * Contact form with validation and submission
 */
export function sampleFormAST(): ASTNode {
  return {
    type: 'program',
    start: 0,
    end: 300,
    line: 1,
    column: 1,
    features: [
      {
        type: 'eventHandler',
        event: 'input',
        selector: 'input[required]',
        commands: [
          {
            type: 'conditional',
            condition: {
              type: 'binaryExpression',
              operator: '>',
              left: { type: 'memberExpression', property: { type: 'identifier', name: 'length' } },
              right: { type: 'literal', value: 0 }
            },
            then: {
              type: 'command',
              name: 'remove',
              args: [{ type: 'selector', value: '.error' }]
            },
            else: {
              type: 'command',
              name: 'add',
              args: [{ type: 'selector', value: '.error' }]
            }
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'submit',
        selector: '#contact-form',
        commands: [
          {
            type: 'conditional',
            condition: {
              type: 'callExpression',
              callee: { type: 'memberExpression', property: { type: 'identifier', name: 'checkValidity' } }
            },
            then: {
              type: 'command',
              name: 'fetch',
              args: [
                { type: 'literal', value: '/api/contact' },
                { type: 'identifier', name: 'form' }
              ]
            }
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'literal', value: 'Message sent successfully!' }],
            target: { type: 'selector', value: '#success-message' }
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'click',
        selector: '#reset-form',
        commands: [
          {
            type: 'command',
            name: 'remove',
            args: [{ type: 'selector', value: '.error' }],
            target: { type: 'selector', value: 'form' }
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'literal', value: '' }],
            target: { type: 'selector', value: 'input, textarea' }
          }
        ]
      }
    ]
  } as any;
}

/**
 * Dashboard interface with data loading and interactions
 */
export function sampleDashboardAST(): ASTNode {
  return {
    type: 'program',
    start: 0,
    end: 400,
    line: 1,
    column: 1,
    features: [
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.tab-button',
        commands: [
          {
            type: 'command',
            name: 'remove',
            args: [{ type: 'selector', value: '.active' }],
            target: { type: 'selector', value: '.tab-button' }
          },
          {
            type: 'command',
            name: 'add',
            args: [{ type: 'selector', value: '.active' }],
            target: { type: 'identifier', name: 'me' }
          },
          {
            type: 'command',
            name: 'fetch',
            args: [{ type: 'literal', value: '/api/tab-data' }]
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'identifier', name: 'it' }],
            target: { type: 'selector', value: '.tab-content' }
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'click',
        selector: '#refresh-data',
        commands: [
          {
            type: 'command',
            name: 'add',
            args: [{ type: 'selector', value: '.loading' }]
          },
          {
            type: 'command',
            name: 'fetch',
            args: [{ type: 'literal', value: '/api/dashboard' }]
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'identifier', name: 'it' }],
            target: { type: 'selector', value: '#dashboard-content' }
          },
          {
            type: 'command',
            name: 'remove',
            args: [{ type: 'selector', value: '.loading' }]
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'input',
        selector: '#search-input',
        commands: [
          {
            type: 'conditional',
            condition: {
              type: 'binaryExpression',
              operator: '>',
              left: { type: 'memberExpression', property: { type: 'identifier', name: 'length' } },
              right: { type: 'literal', value: 2 }
            },
            then: {
              type: 'command',
              name: 'fetch',
              args: [{ type: 'literal', value: '/api/search' }]
            },
            else: {
              type: 'command',
              name: 'put',
              args: [{ type: 'literal', value: '' }],
              target: { type: 'selector', value: '#search-results' }
            }
          }
        ]
      },
      {
        type: 'behavior',
        name: 'data-loader',
        parameters: ['endpoint', 'target'],
        body: [
          {
            type: 'command',
            name: 'fetch',
            args: [{ type: 'identifier', name: 'endpoint' }]
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'identifier', name: 'it' }],
            target: { type: 'identifier', name: 'target' }
          }
        ]
      }
    ]
  } as any;
}

/**
 * Todo application with CRUD operations
 */
export function sampleTodoAST(): ASTNode {
  return {
    type: 'program',
    start: 0,
    end: 350,
    line: 1,
    column: 1,
    features: [
      {
        type: 'eventHandler',
        event: 'submit',
        selector: '#add-todo-form',
        commands: [
          {
            type: 'command',
            name: 'fetch',
            args: [
              { type: 'literal', value: '/api/todos' },
              { type: 'identifier', name: 'form' }
            ]
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'identifier', name: 'it' }],
            target: { type: 'selector', value: '#todo-list' }
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'literal', value: '' }],
            target: { type: 'selector', value: '#todo-input' }
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.todo-toggle',
        commands: [
          {
            type: 'command',
            name: 'toggle',
            args: [{ type: 'selector', value: '.completed' }],
            target: { type: 'identifier', name: 'closest', args: [{ type: 'selector', value: '.todo-item' }] }
          },
          {
            type: 'command',
            name: 'fetch',
            args: [
              { type: 'literal', value: '/api/todos/toggle' },
              { type: 'objectExpression', properties: [
                { key: 'id', value: { type: 'memberExpression', property: { type: 'identifier', name: 'dataset' } } }
              ]}
            ]
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.todo-delete',
        commands: [
          {
            type: 'conditional',
            condition: {
              type: 'callExpression',
              callee: { type: 'identifier', name: 'confirm' },
              arguments: [{ type: 'literal', value: 'Delete this todo?' }]
            },
            then: {
              type: 'command',
              name: 'fetch',
              args: [{ type: 'literal', value: '/api/todos/delete' }]
            }
          },
          {
            type: 'command',
            name: 'remove',
            args: [],
            target: { type: 'identifier', name: 'closest', args: [{ type: 'selector', value: '.todo-item' }] }
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'click',
        selector: '#clear-completed',
        commands: [
          {
            type: 'command',
            name: 'fetch',
            args: [{ type: 'literal', value: '/api/todos/clear-completed' }]
          },
          {
            type: 'command',
            name: 'remove',
            args: [],
            target: { type: 'selector', value: '.todo-item.completed' }
          }
        ]
      },
      {
        type: 'function',
        name: 'updateTodoCount',
        parameters: [],
        body: {
          type: 'blockStatement',
          body: [
            {
              type: 'command',
              name: 'put',
              args: [{ type: 'callExpression', callee: { type: 'memberExpression', property: { type: 'identifier', name: 'length' } } }],
              target: { type: 'selector', value: '#todo-count' }
            }
          ]
        }
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
    end: 500,
    line: 1,
    column: 1,
    features: [
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.add-to-cart',
        commands: [
          {
            type: 'command',
            name: 'add',
            args: [{ type: 'selector', value: '.adding' }]
          },
          {
            type: 'command',
            name: 'fetch',
            args: [
              { type: 'literal', value: '/api/cart/add' },
              { type: 'objectExpression', properties: [
                { key: 'productId', value: { type: 'memberExpression', property: { type: 'identifier', name: 'dataset' } } },
                { key: 'quantity', value: { type: 'memberExpression', property: { type: 'identifier', name: 'value' } } }
              ]}
            ]
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'literal', value: 'Added to cart!' }],
            target: { type: 'selector', value: '.cart-message' }
          },
          {
            type: 'command',
            name: 'remove',
            args: [{ type: 'selector', value: '.adding' }]
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.product-image, .thumbnail',
        commands: [
          {
            type: 'command',
            name: 'remove',
            args: [{ type: 'selector', value: '.active' }],
            target: { type: 'selector', value: '.thumbnail' }
          },
          {
            type: 'command',
            name: 'add',
            args: [{ type: 'selector', value: '.active' }],
            target: { type: 'identifier', name: 'me' }
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'memberExpression', property: { type: 'identifier', name: 'src' } }],
            target: { type: 'selector', value: '.main-image' }
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'change',
        selector: '.quantity-select',
        commands: [
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'memberExpression', property: { type: 'identifier', name: 'value' } }],
            target: { type: 'selector', value: '.quantity-display' }
          },
          {
            type: 'conditional',
            condition: {
              type: 'binaryExpression',
              operator: '>',
              left: { type: 'memberExpression', property: { type: 'identifier', name: 'value' } },
              right: { type: 'literal', value: 5 }
            },
            then: {
              type: 'command',
              name: 'add',
              args: [{ type: 'selector', value: '.bulk-discount' }]
            },
            else: {
              type: 'command',
              name: 'remove',
              args: [{ type: 'selector', value: '.bulk-discount' }]
            }
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.wishlist-btn',
        commands: [
          {
            type: 'command',
            name: 'fetch',
            args: [
              { type: 'literal', value: '/api/wishlist/toggle' },
              { type: 'objectExpression', properties: [
                { key: 'productId', value: { type: 'memberExpression', property: { type: 'identifier', name: 'dataset' } } }
              ]}
            ]
          },
          {
            type: 'command',
            name: 'toggle',
            args: [{ type: 'selector', value: '.in-wishlist' }]
          },
          {
            type: 'conditional',
            condition: {
              type: 'callExpression',
              callee: { type: 'memberExpression', property: { type: 'identifier', name: 'matches' } },
              arguments: [{ type: 'literal', value: '.in-wishlist' }]
            },
            then: {
              type: 'command',
              name: 'put',
              args: [{ type: 'literal', value: 'Remove from wishlist' }]
            },
            else: {
              type: 'command',
              name: 'put',
              args: [{ type: 'literal', value: 'Add to wishlist' }]
            }
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'click',
        selector: '.review-tab',
        commands: [
          {
            type: 'command',
            name: 'remove',
            args: [{ type: 'selector', value: '.active' }],
            target: { type: 'selector', value: '.tab' }
          },
          {
            type: 'command',
            name: 'add',
            args: [{ type: 'selector', value: '.active' }],
            target: { type: 'identifier', name: 'me' }
          },
          {
            type: 'command',
            name: 'fetch',
            args: [{ type: 'literal', value: '/api/reviews' }]
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'identifier', name: 'it' }],
            target: { type: 'selector', value: '.tab-content' }
          }
        ]
      },
      {
        type: 'eventHandler',
        event: 'submit',
        selector: '#review-form',
        commands: [
          {
            type: 'conditional',
            condition: {
              type: 'binaryExpression',
              operator: '>=',
              left: { type: 'memberExpression', property: { type: 'identifier', name: 'rating' } },
              right: { type: 'literal', value: 1 }
            },
            then: {
              type: 'command',
              name: 'fetch',
              args: [
                { type: 'literal', value: '/api/reviews/add' },
                { type: 'identifier', name: 'form' }
              ]
            }
          },
          {
            type: 'command',
            name: 'put',
            args: [{ type: 'literal', value: 'Thank you for your review!' }],
            target: { type: 'selector', value: '.review-message' }
          }
        ]
      },
      {
        type: 'behavior',
        name: 'price-calculator',
        parameters: ['quantity', 'basePrice'],
        body: [
          {
            type: 'conditional',
            condition: {
              type: 'binaryExpression',
              operator: '>=',
              left: { type: 'identifier', name: 'quantity' },
              right: { type: 'literal', value: 10 }
            },
            then: {
              type: 'returnStatement',
              argument: {
                type: 'binaryExpression',
                operator: '*',
                left: { type: 'identifier', name: 'basePrice' },
                right: { type: 'literal', value: 0.9 }
              }
            },
            else: {
              type: 'returnStatement',
              argument: { type: 'identifier', name: 'basePrice' }
            }
          }
        ]
      }
    ]
  } as any;
}