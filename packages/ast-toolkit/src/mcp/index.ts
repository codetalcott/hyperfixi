/**
 * Model Context Protocol (MCP) Server for AST Toolkit
 * Exposes AST analysis capabilities through the MCP protocol
 */

import type {
  InitializeRequest,
  InitializeResult,
  ListToolsRequest,
  ListToolsResult,
  CallToolRequest,
  CallToolResult,
  ListResourcesRequest,
  ListResourcesResult,
  ReadResourceRequest,
  ReadResourceResult,
  Tool,
  Resource,
  TextContent
} from './types.js';

import {
  visit,
  findNodes,
  calculateComplexity,
  analyzeMetrics,
  explainCode,
  generateCodeTemplate,
  recognizeIntent,
  generateQualityInsights,
  benchmarkASTOperations,
  analyzePerformance
} from '../index.js';

import type { ASTNode } from '../types.js';

// ============================================================================
// MCP Server Implementation
// ============================================================================

class ASTToolkitMCPServer {
  private serverInfo = {
    name: "@hyperfixi/ast-toolkit",
    version: "0.1.0"
  };

  private protocolVersion = "2025-03-26";

  constructor() {
    // Initialize any required state
  }

  /**
   * Handle MCP initialize request
   */
  async initialize(request: InitializeRequest): Promise<InitializeResult> {
    return {
      protocolVersion: this.protocolVersion,
      capabilities: {
        tools: {
          listChanged: true
        },
        resources: {
          listChanged: true,
          subscribe: false
        }
      },
      serverInfo: this.serverInfo,
      instructions: [
        "This is the HyperFixi AST Toolkit MCP server.",
        "It provides comprehensive AST analysis capabilities for hyperscript code including:",
        "- Code complexity analysis and metrics",
        "- pattern detection and code smell identification", 
        "- natural language code explanation",
        "- performance benchmarking and optimization suggestions",
        "- Semantic analysis and intent recognition",
        "- Code generation templates and examples",
        "",
        "Use the available tools to analyze, understand, and optimize hyperscript ASTs.",
        "The server can handle both individual AST nodes and complete codebases."
      ].join('\n')
    };
  }

  /**
   * List available tools
   */
  async listTools(request: ListToolsRequest): Promise<ListToolsResult> {
    const tools: Tool[] = [
      {
        name: "analyze_complexity",
        description: "Calculate cyclomatic complexity, cognitive complexity, and Halstead metrics for an AST",
        inputSchema: {
          type: "object",
          properties: {
            ast: {
              type: "object",
              description: "The AST node to analyze"
            }
          },
          required: ["ast"]
        }
      },
      {
        name: "analyze_metrics", 
        description: "Perform comprehensive code analysis including complexity, patterns, and quality metrics",
        inputSchema: {
          type: "object",
          properties: {
            ast: {
              type: "object", 
              description: "The AST node to analyze"
            }
          },
          required: ["ast"]
        }
      },
      {
        name: "explain_code",
        description: "Generate natural language explanation of AST code structure and behavior",
        inputSchema: {
          type: "object",
          properties: {
            ast: {
              type: "object",
              description: "The AST node to explain"
            },
            audience: {
              type: "string",
              enum: ["beginner", "intermediate", "expert"],
              description: "Target audience level for explanation"
            },
            detail: {
              type: "string", 
              enum: ["brief", "detailed", "comprehensive"],
              description: "Level of detail in explanation"
            }
          },
          required: ["ast"]
        }
      },
      {
        name: "find_nodes",
        description: "Search for specific nodes in an AST using predicate functions",
        inputSchema: {
          type: "object",
          properties: {
            ast: {
              type: "object",
              description: "The AST to search in"
            },
            nodeType: {
              type: "string",
              description: "Type of node to find (e.g., 'command', 'eventHandler', 'conditional')"
            }
          },
          required: ["ast", "nodeType"]
        }
      },
      {
        name: "generate_template",
        description: "Generate code templates based on AST patterns and intent",
        inputSchema: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              description: "Description of what code should do"
            },
            style: {
              type: "string",
              enum: ["minimal", "comprehensive", "example"],
              description: "Template style preference"
            }
          },
          required: ["intent"]
        }
      },
      {
        name: "recognize_intent",
        description: "Analyze code to understand its purpose and classify common patterns",
        inputSchema: {
          type: "object",
          properties: {
            ast: {
              type: "object",
              description: "The AST node to analyze"
            }
          },
          required: ["ast"]
        }
      },
      {
        name: "quality_insights",
        description: "Generate quality insights and improvement suggestions for AST code",
        inputSchema: {
          type: "object", 
          properties: {
            ast: {
              type: "object",
              description: "The AST node to analyze"
            }
          },
          required: ["ast"]
        }
      },
      {
        name: "benchmark_performance",
        description: "Benchmark AST operations and analyze performance characteristics",
        inputSchema: {
          type: "object",
          properties: {
            ast: {
              type: "object",
              description: "The AST to benchmark"
            },
            operations: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Specific operations to benchmark (optional)"
            }
          },
          required: ["ast"]
        }
      },
      {
        name: "traverse_ast",
        description: "Traverse an AST with custom visitor pattern and collect information",
        inputSchema: {
          type: "object",
          properties: {
            ast: {
              type: "object",
              description: "The AST to traverse"
            },
            collectNodes: {
              type: "boolean",
              description: "Whether to collect all visited nodes"
            }
          },
          required: ["ast"]
        }
      }
    ];

    return {
      tools
    };
  }

  /**
   * Call a specific tool
   */
  async callTool(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "analyze_complexity":
          return await this.analyzeComplexity(args);
        
        case "analyze_metrics":
          return await this.analyzeMetrics(args);
          
        case "explain_code":
          return await this.explainCode(args);
          
        case "find_nodes":
          return await this.findNodes(args);
          
        case "generate_template":
          return await this.generateTemplate(args);
          
        case "recognize_intent":
          return await this.recognizeIntent(args);
          
        case "quality_insights":
          return await this.qualityInsights(args);
          
        case "benchmark_performance":
          return await this.benchmarkPerformance(args);
          
        case "traverse_ast":
          return await this.traverseAST(args);
          
        default:
          return {
            content: [{
              type: "text",
              text: `Unknown tool: ${name}`
            }],
            isError: true
          };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  /**
   * List available resources (AST examples, documentation)
   */
  async listResources(request: ListResourcesRequest): Promise<ListResourcesResult> {
    const resources: Resource[] = [
      {
        uri: "ast://examples/simple",
        name: "Simple AST Example",
        description: "A basic hyperscript AST structure for testing",
        mimeType: "application/json"
      },
      {
        uri: "ast://examples/complex", 
        name: "Complex AST Example",
        description: "A complex hyperscript AST with multiple features",
        mimeType: "application/json"
      },
      {
        uri: "ast://examples/massive",
        name: "Large AST Example", 
        description: "A large AST structure for performance testing",
        mimeType: "application/json"
      },
      {
        uri: "ast://documentation/api",
        name: "AST Toolkit API Documentation",
        description: "Complete API reference for the AST toolkit",
        mimeType: "text/markdown"
      },
      {
        uri: "ast://documentation/examples",
        name: "Usage Examples",
        description: "Examples of how to use the AST toolkit",
        mimeType: "text/markdown"
      }
    ];

    return {
      resources
    };
  }

  /**
   * Read a specific resource
   */
  async readResource(request: ReadResourceRequest): Promise<ReadResourceResult> {
    const { uri } = request.params;

    // Generate or retrieve resource content based on URI
    switch (uri) {
      case "ast://examples/simple":
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(this.getSimpleAST(), null, 2)
          }]
        };
        
      case "ast://examples/complex":
        return {
          contents: [{
            uri,
            mimeType: "application/json", 
            text: JSON.stringify(this.getComplexAST(), null, 2)
          }]
        };
        
      case "ast://examples/massive":
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(this.getMassiveAST(), null, 2)
          }]
        };
        
      case "ast://documentation/api":
        return {
          contents: [{
            uri,
            mimeType: "text/markdown",
            text: this.getAPIDocumentation()
          }]
        };
        
      case "ast://documentation/examples":
        return {
          contents: [{
            uri,
            mimeType: "text/markdown", 
            text: this.getUsageExamples()
          }]
        };
        
      default:
        throw new Error(`Resource not found: ${uri}`);
    }
  }

  // ============================================================================
  // Tool Implementation Methods
  // ============================================================================

  private async analyzeComplexity(args: any): Promise<CallToolResult> {
    const { ast } = args;
    const complexity = calculateComplexity(ast as ASTNode);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          cyclomatic: complexity.cyclomatic,
          cognitive: complexity.cognitive,
          halstead: complexity.halstead,
          summary: `Code complexity analysis complete. Cyclomatic: ${complexity.cyclomatic}, Cognitive: ${complexity.cognitive}`
        }, null, 2)
      }]
    };
  }

  private async analyzeMetrics(args: any): Promise<CallToolResult> {
    const { ast } = args;
    const metrics = analyzeMetrics(ast as ASTNode);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          complexity: metrics.complexity,
          patterns: metrics.patterns,
          smells: metrics.smells,
          summary: `Found ${metrics.patterns.length} patterns and ${metrics.smells.length} code smells`
        }, null, 2)
      }]
    };
  }

  private async explainCode(args: any): Promise<CallToolResult> {
    const { ast, audience = "intermediate", detail = "detailed" } = args;
    const explanation = explainCode(ast as ASTNode, { audience, detail });
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(explanation, null, 2)
      }]
    };
  }

  private async findNodes(args: any): Promise<CallToolResult> {
    const { ast, nodeType } = args;
    
    const predicate = (node: ASTNode) => node.type === nodeType;
    const foundNodes = findNodes(ast as ASTNode, predicate);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          nodeType,
          count: foundNodes.length,
          nodes: foundNodes,
          summary: `Found ${foundNodes.length} nodes of type '${nodeType}'`
        }, null, 2)
      }]
    };
  }

  private async generateTemplate(args: any): Promise<CallToolResult> {
    const { intent, style = "comprehensive" } = args;
    const template = generateCodeTemplate(intent, { style });
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          intent,
          template,
          summary: `Generated ${template.pattern} template for: ${intent}`
        }, null, 2)
      }]
    };
  }

  private async recognizeIntent(args: any): Promise<CallToolResult> {
    const { ast } = args;
    const intent = recognizeIntent(ast as ASTNode);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(intent, null, 2)
      }]
    };
  }

  private async qualityInsights(args: any): Promise<CallToolResult> {
    const { ast } = args;
    const insights = generateQualityInsights(ast as ASTNode);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(insights, null, 2)
      }]
    };
  }

  private async benchmarkPerformance(args: any): Promise<CallToolResult> {
    const { ast, operations } = args;
    const benchmarks = benchmarkASTOperations(ast as ASTNode);
    const analysis = analyzePerformance(benchmarks);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          benchmarks,
          analysis,
          summary: `Benchmarked ${benchmarks.length} operations with ${analysis.length} optimization suggestions`
        }, null, 2)
      }]
    };
  }

  private async traverseAST(args: any): Promise<CallToolResult> {
    const { ast, collectNodes = false } = args;
    
    if (!ast) {
      return {
        content: [{
          type: "text",
          text: "Error: AST is required for traversal"
        }],
        isError: true
      };
    }
    
    const visitedNodes: ASTNode[] = [];
    let nodeCount = 0;
    
    try {
      const visitor = {
        enterNode: (node: ASTNode) => {
          nodeCount++;
          if (collectNodes) {
            visitedNodes.push(node);
          }
        }
      };
      
      await visit(ast as ASTNode, visitor);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            nodeCount,
            visitedNodes: collectNodes ? visitedNodes : undefined,
            summary: `Traversed ${nodeCount} nodes in the AST`
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error during AST traversal: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  // ============================================================================
  // Resource Generation Methods
  // ============================================================================

  private getSimpleAST(): ASTNode {
    return {
      type: 'program',
      start: 0,
      end: 50,
      line: 1,
      column: 1,
      features: [{
        type: 'eventHandler',
        event: 'click',
        selector: '#button',
        start: 0,
        end: 50,
        line: 1,
        column: 1,
        commands: [{
          type: 'command',
          name: 'toggle',
          start: 10,
          end: 30,
          line: 1,
          column: 11,
          args: [{ type: 'selector', value: '.active', start: 17, end: 24, line: 1, column: 18 }]
        }]
      }]
    } as any;
  }

  private getComplexAST(): ASTNode {
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
          selector: '.modal-trigger',
          start: 0,
          end: 100,
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
              type: 'conditional',
              start: 70,
              end: 95,
              line: 1,
              column: 71,
              condition: {
                type: 'binaryExpression',
                operator: '===',
                left: { type: 'memberExpression', property: { type: 'identifier', name: 'status' } },
                right: { type: 'literal', value: 200 }
              },
              then: {
                type: 'command',
                name: 'toggle',
                args: [{ type: 'selector', value: '.modal-open' }]
              },
              else: {
                type: 'command',
                name: 'put',
                args: [{ type: 'literal', value: 'Error loading content' }]
              }
            }
          ]
        }
      ]
    } as any;
  }

  private getMassiveAST(): ASTNode {
    // Generate a large AST with many features for performance testing
    const features = Array.from({ length: 100 }, (_, i) => ({
      type: 'eventHandler',
      event: ['click', 'submit', 'input', 'hover'][i % 4],
      selector: `.element-${i}`,
      start: i * 20,
      end: (i + 1) * 20,
      line: i + 1,
      column: 1,
      commands: Array.from({ length: 3 }, (_, j) => ({
        type: 'command',
        name: ['add', 'remove', 'toggle'][j % 3],
        start: i * 20 + j * 3,
        end: i * 20 + j * 3 + 3,
        line: i + 1,
        column: j * 3 + 1,
        args: [{ 
          type: 'selector', 
          value: `.class-${i}-${j}`,
          start: 0, 
          end: 10, 
          line: i + 1, 
          column: 1 
        }]
      }))
    }));

    return {
      type: 'program',
      start: 0,
      end: 2000,
      line: 1,
      column: 1,
      features
    } as any;
  }

  private getAPIDocumentation(): string {
    return `# AST Toolkit API Documentation

## Overview
The HyperFixi AST Toolkit provides comprehensive analysis capabilities for hyperscript ASTs.

## Core Functions

### Analysis Functions
- \`calculateComplexity(ast)\` - Calculate code complexity metrics
- \`analyzeMetrics(ast)\` - Comprehensive code analysis
- \`findNodes(ast, predicate)\` - Search for specific nodes

### AI Functions  
- \`explainCode(ast, options)\` - Generate natural language explanations
- \`generateCodeTemplate(intent, options)\` - Create code templates
- \`recognizeIntent(ast)\` - Analyze code purpose

### Performance Functions
- \`benchmarkASTOperations(ast)\` - Performance benchmarking
- \`analyzePerformance(results)\` - Performance analysis

### Visitor Pattern
- \`visit(ast, visitor)\` - Traverse AST with visitor pattern

## Usage Examples
See the examples resource for detailed usage patterns.
`;
  }

  private getUsageExamples(): string {
    return `# AST Toolkit Usage Examples

## Basic Analysis
\`\`\`typescript
import { calculateComplexity, analyzeMetrics } from '@hyperfixi/ast-toolkit';

const complexity = calculateComplexity(ast);
console.log('Cyclomatic complexity:', complexity.cyclomatic);

const metrics = analyzeMetrics(ast);
console.log('Code smells found:', metrics.smells.length);
\`\`\`

## AI-Powered Explanation
\`\`\`typescript
import { explainCode } from '@hyperfixi/ast-toolkit';

const explanation = explainCode(ast, {
  audience: 'beginner',
  detail: 'comprehensive'
});
console.log(explanation.overview);
\`\`\`

## Performance Benchmarking
\`\`\`typescript
import { benchmarkASTOperations, analyzePerformance } from '@hyperfixi/ast-toolkit';

const benchmarks = benchmarkASTOperations(ast);
const suggestions = analyzePerformance(benchmarks);
console.log('Optimization suggestions:', suggestions);
\`\`\`

## Node Finding
\`\`\`typescript
import { findNodes } from '@hyperfixi/ast-toolkit';

const commands = findNodes(ast, node => node.type === 'command');
console.log('Found commands:', commands.length);
\`\`\`
`;
  }
}

// ============================================================================
// MCP Server Factory and Utilities
// ============================================================================

/**
 * Create a new AST Toolkit MCP server instance
 */
export function createASTToolkitMCPServer(): ASTToolkitMCPServer {
  return new ASTToolkitMCPServer();
}

/**
 * Create a standard MCP server with proper message handling
 */
export function createMCPServerWithHandlers() {
  const server = createASTToolkitMCPServer();
  
  return {
    server,
    
    // Message handler for MCP protocol
    async handleMessage(message: any): Promise<any> {
      const { method, params, id } = message;
      
      try {
        let result: any;
        
        switch (method) {
          case 'initialize':
            result = await server.initialize({ method, params });
            break;
            
          case 'tools/list':
            result = await server.listTools({ method, params });
            break;
            
          case 'tools/call':
            result = await server.callTool({ method, params });
            break;
            
          case 'resources/list':
            result = await server.listResources({ method, params });
            break;
            
          case 'resources/read':
            result = await server.readResource({ method, params });
            break;
            
          default:
            throw new Error(`Unknown method: ${method}`);
        }
        
        return {
          jsonrpc: "2.0",
          id,
          result
        };
        
      } catch (error) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : String(error)
          }
        };
      }
    }
  };
}

export { ASTToolkitMCPServer };