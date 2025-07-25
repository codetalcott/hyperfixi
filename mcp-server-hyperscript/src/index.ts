// mcp-server-hyperscript/src/index.ts
// Example MCP server implementation for Hyperfixi

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import Hyperfixi components (these would be from the actual package)
import { 
  HyperscriptParser,
  HyperscriptAnalyzer,
  HyperscriptGenerator,
  HyperscriptI18n 
} from '@hyperfixi/core';

class HyperscriptMCPServer {
  private server: Server;
  private parser: HyperscriptParser;
  private analyzer: HyperscriptAnalyzer;
  private generator: HyperscriptGenerator;
  private i18n: HyperscriptI18n;

  constructor() {
    this.parser = new HyperscriptParser();
    this.analyzer = new HyperscriptAnalyzer();
    this.generator = new HyperscriptGenerator();
    this.i18n = new HyperscriptI18n('en');

    this.server = new Server(
      {
        name: 'hyperscript-assistant',
        version: '1.0.0',
        description: 'MCP server for Hyperscript development assistance'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_hyperscript',
          description: 'Analyze hyperscript code for syntax errors, semantic issues, and optimization opportunities',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'The hyperscript code to analyze'
              },
              locale: {
                type: 'string',
                description: 'Language of the hyperscript (en, es, ko, zh)',
                default: 'en'
              }
            },
            required: ['code']
          }
        },
        {
          name: 'generate_hyperscript',
          description: 'Generate hyperscript from natural language description',
          inputSchema: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'Natural language description of desired behavior'
              },
              targetElement: {
                type: 'string',
                description: 'CSS selector for target element'
              },
              locale: {
                type: 'string',
                description: 'Language to generate hyperscript in',
                default: 'en'
              }
            },
            required: ['description']
          }
        },
        {
          name: 'convert_to_hyperscript',
          description: 'Convert jQuery or vanilla JS to hyperscript',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'JavaScript or jQuery code to convert'
              },
              type: {
                type: 'string',
                enum: ['jquery', 'vanilla', 'react'],
                description: 'Type of code being converted'
              }
            },
            required: ['code', 'type']
          }
        },
        {
          name: 'translate_hyperscript',
          description: 'Translate hyperscript between languages',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Hyperscript code to translate'
              },
              fromLocale: {
                type: 'string',
                description: 'Source language'
              },
              toLocale: {
                type: 'string',
                description: 'Target language'
              }
            },
            required: ['code', 'fromLocale', 'toLocale']
          }
        },
        {
          name: 'generate_tests',
          description: 'Generate tests for hyperscript behaviors',
          inputSchema: {
            type: 'object',
            properties: {
              hyperscript: {
                type: 'string',
                description: 'Hyperscript code to test'
              },
              framework: {
                type: 'string',
                enum: ['vitest', 'jest', 'playwright'],
                default: 'vitest'
              }
            },
            required: ['hyperscript']
          }
        }
      ]
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'hyperscript://docs/commands',
          name: 'Hyperscript Commands Reference',
          description: 'Complete reference for all hyperscript commands',
          mimeType: 'text/markdown'
        },
        {
          uri: 'hyperscript://docs/expressions',
          name: 'Hyperscript Expressions Guide',
          description: 'Guide to hyperscript expression syntax',
          mimeType: 'text/markdown'
        },
        {
          uri: 'hyperscript://examples',
          name: 'Hyperscript Examples',
          description: 'Common hyperscript patterns and examples',
          mimeType: 'text/markdown'
        },
        {
          uri: 'hyperscript://i18n/dictionaries',
          name: 'I18n Dictionaries',
          description: 'Translation dictionaries for all supported languages',
          mimeType: 'application/json'
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'analyze_hyperscript':
          return this.analyzeHyperscript(args.code, args.locale);
        
        case 'generate_hyperscript':
          return this.generateHyperscript(
            args.description,
            args.targetElement,
            args.locale
          );
        
        case 'convert_to_hyperscript':
          return this.convertToHyperscript(args.code, args.type);
        
        case 'translate_hyperscript':
          return this.translateHyperscript(
            args.code,
            args.fromLocale,
            args.toLocale
          );
        
        case 'generate_tests':
          return this.generateTests(args.hyperscript, args.framework);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'hyperscript://docs/commands':
          return {
            contents: [{
              uri,
              mimeType: 'text/markdown',
              text: this.getCommandsReference()
            }]
          };
        
        case 'hyperscript://docs/expressions':
          return {
            contents: [{
              uri,
              mimeType: 'text/markdown',
              text: this.getExpressionsGuide()
            }]
          };
        
        case 'hyperscript://examples':
          return {
            contents: [{
              uri,
              mimeType: 'text/markdown',
              text: this.getExamples()
            }]
          };
        
        case 'hyperscript://i18n/dictionaries':
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(this.i18n.getDictionaries(), null, 2)
            }]
          };
        
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });
  }

  private async analyzeHyperscript(code: string, locale: string = 'en') {
    try {
      // Translate to English if needed
      const englishCode = locale !== 'en' 
        ? this.i18n.translate(code, locale, 'en')
        : code;

      // Parse and analyze
      const ast = await this.parser.parse(englishCode);
      const analysis = await this.analyzer.analyze(ast);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            valid: analysis.errors.length === 0,
            errors: analysis.errors,
            warnings: analysis.warnings,
            suggestions: analysis.suggestions,
            metrics: {
              complexity: analysis.complexity,
              lineCount: code.split('\n').length,
              commandCount: analysis.commands.length,
              selectorCount: analysis.selectors.length
            },
            features: {
              commands: analysis.commands,
              events: analysis.events,
              selectors: analysis.selectors,
              expressions: analysis.expressions
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error analyzing hyperscript: ${error.message}`
        }]
      };
    }
  }

  private async generateHyperscript(
    description: string,
    targetElement?: string,
    locale: string = 'en'
  ) {
    try {
      // Parse natural language description
      const intent = this.parseIntent(description);
      
      // Generate hyperscript
      const hyperscript = this.generator.generate({
        trigger: intent.trigger,
        conditions: intent.conditions,
        actions: intent.actions,
        target: targetElement || intent.target
      });

      // Translate if needed
      const localizedHyperscript = locale !== 'en'
        ? this.i18n.translate(hyperscript, 'en', locale)
        : hyperscript;

      return {
        content: [{
          type: 'text',
          text: localizedHyperscript
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error generating hyperscript: ${error.message}`
        }]
      };
    }
  }

  private async convertToHyperscript(code: string, type: string) {
    try {
      let converter;
      switch (type) {
        case 'jquery':
          converter = new JQueryConverter();
          break;
        case 'vanilla':
          converter = new VanillaJSConverter();
          break;
        case 'react':
          converter = new ReactConverter();
          break;
        default:
          throw new Error(`Unknown conversion type: ${type}`);
      }

      const result = await converter.convert(code);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            hyperscript: result.hyperscript,
            warnings: result.warnings,
            unconverted: result.unconverted,
            notes: result.notes
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error converting code: ${error.message}`
        }]
      };
    }
  }

  private async translateHyperscript(
    code: string,
    fromLocale: string,
    toLocale: string
  ) {
    try {
      const translated = this.i18n.translate(code, fromLocale, toLocale);
      
      return {
        content: [{
          type: 'text',
          text: translated
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error translating hyperscript: ${error.message}`
        }]
      };
    }
  }

  private async generateTests(hyperscript: string, framework: string) {
    try {
      const testGenerator = new TestGenerator(framework);
      const tests = await testGenerator.generate(hyperscript);

      return {
        content: [{
          type: 'text',
          text: tests.code
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error generating tests: ${error.message}`
        }]
      };
    }
  }

  // Helper methods
  private parseIntent(description: string) {
    // Simple NLP parsing - in production this would be more sophisticated
    const triggers = ['click', 'hover', 'focus', 'blur', 'keyup', 'submit'];
    const actions = ['toggle', 'add', 'remove', 'show', 'hide', 'fetch', 'send'];
    
    // Extract trigger
    const trigger = triggers.find(t => description.toLowerCase().includes(t)) || 'click';
    
    // Extract actions
    const foundActions = actions.filter(a => description.toLowerCase().includes(a));
    
    return {
      trigger,
      actions: foundActions,
      conditions: [],
      target: 'me'
    };
  }

  private getCommandsReference(): string {
    return `# Hyperscript Commands Reference

## Event Handling
- \`on <event>\` - Listen for events
- \`on <event> from <selector>\` - Listen for delegated events

## DOM Manipulation
- \`add .<class> to <element>\` - Add CSS class
- \`remove .<class> from <element>\` - Remove CSS class
- \`toggle .<class> on <element>\` - Toggle CSS class
- \`show <element>\` - Show element
- \`hide <element>\` - Hide element

## Control Flow
- \`if <condition> then <action> [else <action>] end\` - Conditional execution
- \`repeat <n> times\` - Loop n times
- \`for <var> in <collection>\` - Iterate over collection

## Async Operations
- \`wait <n> seconds\` - Pause execution
- \`fetch <url>\` - Make HTTP request
- \`send <event> to <element>\` - Dispatch custom event

## Values and Variables
- \`set <var> to <value>\` - Set variable
- \`put <value> into <element>\` - Set element content
- \`get <property> from <element>\` - Read property`;
  }

  private getExpressionsGuide(): string {
    return `# Hyperscript Expressions Guide

## References
- \`me\` - Current element
- \`you\` - Target of current event
- \`it\` - Result of last operation
- \`<selector>\` - CSS selector query

## Property Access
- \`element's property\` - Possessive syntax
- \`my className\` - Property of current element
- \`@data-value\` - Attribute access

## Type Conversions
- \`value as Int\` - Convert to integer
- \`value as String\` - Convert to string
- \`form as Values\` - Extract form values

## Comparisons
- \`>\`, \`<\`, \`>=\`, \`<=\` - Numeric comparisons
- \`is\`, \`is not\` - Equality checks
- \`matches\` - CSS selector matching
- \`contains\` - Membership testing`;
  }

  private getExamples(): string {
    return `# Hyperscript Examples

## Toggle Menu
\`\`\`hyperscript
on click toggle .open on #menu
\`\`\`

## Form Validation
\`\`\`hyperscript
on blur from input[required]
  if my value is ""
    add .error to me
  else
    remove .error from me
  end
\`\`\`

## Infinite Scroll
\`\`\`hyperscript
on intersection(intersecting) from bottom
  if intersecting
    fetch /api/items?page={my @data-page}
    put it at end of me
    increment my @data-page
  end
\`\`\`

## Modal Dialog
\`\`\`hyperscript
behavior Modal
  on click on .modal-trigger
    show #modal with *opacity
  on click on .modal-close or on escape
    hide #modal with *opacity
end
\`\`\``;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Hyperscript MCP server started');
  }
}

// Start the server
const server = new HyperscriptMCPServer();
server.start().catch(console.error);
