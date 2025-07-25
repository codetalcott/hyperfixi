/**
 * Example: Using the AST Toolkit MCP Server
 * This demonstrates various ways to interact with the MCP server
 */

import { createMCPServerWithHandlers, createASTToolkitMCPServer } from '@hyperfixi/ast-toolkit';
import type { 
  InitializeRequest,
  ListToolsRequest,
  CallToolRequest,
  ListResourcesRequest,
  ReadResourceRequest 
} from '@hyperfixi/ast-toolkit';

// ============================================================================
// Sample AST Data
// ============================================================================

const sampleAST = {
  type: 'program',
  start: 0,
  end: 200,
  line: 1,
  column: 1,
  features: [
    {
      type: 'eventHandler',
      event: 'click',
      selector: '.submit-button',
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
          type: 'command',
          name: 'fetch',
          start: 45,
          end: 65,
          line: 1,
          column: 46,
          args: [{ type: 'literal', value: '/api/submit', start: 51, end: 62, line: 1, column: 52 }]
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
            name: 'remove',
            args: [{ type: 'selector', value: '.loading' }]
          },
          else: {
            type: 'command',
            name: 'put',
            args: [{ type: 'literal', value: 'Error occurred' }]
          }
        }
      ]
    },
    {
      type: 'eventHandler',
      event: 'input',
      selector: 'input[type="email"]',
      start: 105,
      end: 200,
      line: 3,
      column: 1,
      commands: [
        {
          type: 'conditional',
          start: 125,
          end: 180,
          line: 3,
          column: 21,
          condition: {
            type: 'callExpression',
            callee: { type: 'memberExpression', property: { type: 'identifier', name: 'matches' } },
            arguments: [{ type: 'literal', value: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/' }]
          },
          then: {
            type: 'command',
            name: 'remove',
            args: [{ type: 'selector', value: '.invalid' }]
          },
          else: {
            type: 'command',
            name: 'add',
            args: [{ type: 'selector', value: '.invalid' }]
          }
        }
      ]
    }
  ]
} as any;

// ============================================================================
// Direct Server Usage Example
// ============================================================================

async function directServerExample() {
  console.log('🚀 Direct Server Usage Example');
  console.log('==============================\n');

  // Create server instance
  const server = createASTToolkitMCPServer();

  // Initialize the server
  const initRequest: InitializeRequest = {
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {
        tools: { listChanged: true }
      },
      clientInfo: { name: 'example-client', version: '1.0.0' }
    }
  };

  const initResult = await server.initialize(initRequest);
  console.log('✅ Server initialized successfully');
  console.log(`   Protocol version: ${initResult.protocolVersion}`);
  console.log(`   Server: ${initResult.serverInfo.name} v${initResult.serverInfo.version}`);
  console.log(`   Capabilities: Tools=${!!initResult.capabilities.tools}, Resources=${!!initResult.capabilities.resources}\n`);

  // List available tools
  const toolsRequest: ListToolsRequest = { method: 'tools/list' };
  const toolsResult = await server.listTools(toolsRequest);
  
  console.log(`📊 Available Tools (${toolsResult.tools.length}):`);
  toolsResult.tools.forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
  });
  console.log();

  // List available resources
  const resourcesRequest: ListResourcesRequest = { method: 'resources/list' };
  const resourcesResult = await server.listResources(resourcesRequest);
  
  console.log(`📚 Available Resources (${resourcesResult.resources.length}):`);
  resourcesResult.resources.forEach((resource, index) => {
    console.log(`   ${index + 1}. ${resource.name} (${resource.uri})`);
  });
  console.log();

  return server;
}

// ============================================================================
// Tool Usage Examples
// ============================================================================

async function toolUsageExamples(server: any) {
  console.log('🔧 Tool Usage Examples');
  console.log('======================\n');

  // Example 1: Analyze Code Complexity
  console.log('1. Analyzing Code Complexity...');
  const complexityRequest: CallToolRequest = {
    method: 'tools/call',
    params: {
      name: 'analyze_complexity',
      arguments: { ast: sampleAST }
    }
  };

  const complexityResult = await server.callTool(complexityRequest);
  const complexityData = JSON.parse(complexityResult.content[0].text);
  console.log(`   ✅ Cyclomatic complexity: ${complexityData.cyclomatic}`);
  console.log(`   ✅ Cognitive complexity: ${complexityData.cognitive}`);
  console.log(`   ✅ Halstead difficulty: ${complexityData.halstead.difficulty}\n`);

  // Example 2: Generate Code Explanation
  console.log('2. Generating Code Explanation...');
  const explainRequest: CallToolRequest = {
    method: 'tools/call',
    params: {
      name: 'explain_code',
      arguments: { 
        ast: sampleAST,
        audience: 'intermediate',
        detail: 'brief'
      }
    }
  };

  const explainResult = await server.callTool(explainRequest);
  const explanation = JSON.parse(explainResult.content[0].text);
  console.log(`   ✅ Overview: ${explanation.overview}`);
  console.log(`   ✅ Structure: ${explanation.structure}`);
  console.log(`   ✅ Found ${explanation.patterns.length} patterns\n`);

  // Example 3: Find Specific Nodes
  console.log('3. Finding Event Handlers...');
  const findRequest: CallToolRequest = {
    method: 'tools/call',
    params: {
      name: 'find_nodes',
      arguments: { 
        ast: sampleAST,
        nodeType: 'eventHandler'
      }
    }
  };

  const findResult = await server.callTool(findRequest);
  const findData = JSON.parse(findResult.content[0].text);
  console.log(`   ✅ Found ${findData.count} event handlers`);
  console.log(`   ✅ Events: ${findData.nodes.map((n: any) => n.event).join(', ')}\n`);

  // Example 4: Generate Code Template
  console.log('4. Generating Code Template...');
  const templateRequest: CallToolRequest = {
    method: 'tools/call',
    params: {
      name: 'generate_template',
      arguments: { 
        intent: 'Create a modal dialog handler with close functionality',
        style: 'comprehensive'
      }
    }
  };

  const templateResult = await server.callTool(templateRequest);
  const template = JSON.parse(templateResult.content[0].text);
  console.log(`   ✅ Template generated for: ${template.intent}`);
  console.log(`   ✅ Template type: ${template.template.type}`);
  console.log(`   ✅ Includes ${template.template.examples.length} examples\n`);

  // Example 5: Performance Benchmarking
  console.log('5. Running Performance Benchmark...');
  const benchmarkRequest: CallToolRequest = {
    method: 'tools/call',
    params: {
      name: 'benchmark_performance',
      arguments: { ast: sampleAST }
    }
  };

  const benchmarkResult = await server.callTool(benchmarkRequest);
  const benchmarkData = JSON.parse(benchmarkResult.content[0].text);
  console.log(`   ✅ Benchmarked ${benchmarkData.benchmarks.length} operations`);
  console.log(`   ✅ Average complexity analysis time: ${benchmarkData.benchmarks.find((b: any) => b.operation.includes('Complexity'))?.averageTime.toFixed(3)}ms`);
  console.log(`   ✅ Generated ${benchmarkData.analysis.length} optimization suggestions\n`);

  // Example 6: Quality Insights
  console.log('6. Generating Quality Insights...');
  const qualityRequest: CallToolRequest = {
    method: 'tools/call',
    params: {
      name: 'quality_insights',
      arguments: { ast: sampleAST }
    }
  };

  const qualityResult = await server.callTool(qualityRequest);
  const qualityData = JSON.parse(qualityResult.content[0].text);
  console.log(`   ✅ Code quality score: ${qualityData.overallScore}/10`);
  console.log(`   ✅ Strengths: ${qualityData.strengths.slice(0, 2).join(', ')}`);
  console.log(`   ✅ Improvement areas: ${qualityData.improvements.slice(0, 2).join(', ')}\n`);
}

// ============================================================================
// Resource Usage Examples
// ============================================================================

async function resourceUsageExamples(server: any) {
  console.log('📖 Resource Usage Examples');
  console.log('==========================\n');

  // Example 1: Read API Documentation
  console.log('1. Reading API Documentation...');
  const docRequest: ReadResourceRequest = {
    method: 'resources/read',
    params: { uri: 'ast://documentation/api' }
  };

  const docResult = await server.readResource(docRequest);
  const docContent = docResult.contents[0].text;
  console.log(`   ✅ Documentation loaded (${docContent.length} characters)`);
  console.log(`   ✅ Contains API reference for core functions\n`);

  // Example 2: Load Complex AST Example
  console.log('2. Loading Complex AST Example...');
  const exampleRequest: ReadResourceRequest = {
    method: 'resources/read',
    params: { uri: 'ast://examples/complex' }
  };

  const exampleResult = await server.readResource(exampleRequest);
  const exampleAST = JSON.parse(exampleResult.contents[0].text);
  console.log(`   ✅ Complex AST loaded`);
  console.log(`   ✅ Type: ${exampleAST.type}, Features: ${exampleAST.features.length}`);
  console.log(`   ✅ Range: ${exampleAST.start}-${exampleAST.end}\n`);

  // Example 3: Load Usage Examples
  console.log('3. Loading Usage Examples...');
  const usageRequest: ReadResourceRequest = {
    method: 'resources/read',
    params: { uri: 'ast://documentation/examples' }
  };

  const usageResult = await server.readResource(usageRequest);
  const usageContent = usageResult.contents[0].text;
  console.log(`   ✅ Usage examples loaded (${usageContent.length} characters)`);
  console.log(`   ✅ Contains TypeScript code examples\n`);
}

// ============================================================================
// Message Handler Example
// ============================================================================

async function messageHandlerExample() {
  console.log('🔌 Message Handler Example');
  console.log('==========================\n');

  const { server, handleMessage } = createMCPServerWithHandlers();

  // Simulate JSON-RPC message handling
  const messages = [
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'example-client', version: '1.0.0' }
      }
    },
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    },
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'find_nodes',
        arguments: { 
          ast: sampleAST,
          nodeType: 'command'
        }
      }
    }
  ];

  for (const message of messages) {
    console.log(`📤 Sending: ${message.method}`);
    const response = await handleMessage(message);
    
    if (response.error) {
      console.log(`   ❌ Error: ${response.error.message}`);
    } else {
      console.log(`   ✅ Success: ${response.result ? 'Data received' : 'OK'}`);
      
      if (message.method === 'tools/list') {
        console.log(`   📊 Found ${response.result.tools.length} tools`);
      } else if (message.method === 'tools/call' && message.params.name === 'find_nodes') {
        const data = JSON.parse(response.result.content[0].text);
        console.log(`   🔍 Found ${data.count} nodes`);
      }
    }
    console.log();
  }
}

// ============================================================================
// Error Handling Example
// ============================================================================

async function errorHandlingExample(server: any) {
  console.log('⚠️  Error Handling Example');
  console.log('==========================\n');

  // Example 1: Invalid tool name
  console.log('1. Testing invalid tool name...');
  try {
    const invalidRequest: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'nonexistent_tool',
        arguments: {}
      }
    };

    const result = await server.callTool(invalidRequest);
    console.log(`   ✅ Graceful error handling: ${result.isError ? 'Error flagged' : 'No error flag'}`);
    console.log(`   📝 Error message: ${result.content[0].text}\n`);
  } catch (error) {
    console.log(`   ❌ Unexpected error: ${error}\n`);
  }

  // Example 2: Invalid AST structure
  console.log('2. Testing invalid AST structure...');
  try {
    const invalidASTRequest: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'analyze_complexity',
        arguments: { ast: null }
      }
    };

    const result = await server.callTool(invalidASTRequest);
    console.log(`   ✅ Graceful error handling: ${result.isError ? 'Error flagged' : 'No error flag'}`);
    console.log(`   📝 Error type: Tool execution error\n`);
  } catch (error) {
    console.log(`   ❌ Unexpected error: ${error}\n`);
  }

  // Example 3: Invalid resource URI
  console.log('3. Testing invalid resource URI...');
  try {
    const invalidResourceRequest: ReadResourceRequest = {
      method: 'resources/read',
      params: { uri: 'ast://invalid/resource' }
    };

    await server.readResource(invalidResourceRequest);
    console.log(`   ❌ Should have thrown an error\n`);
  } catch (error) {
    console.log(`   ✅ Proper error thrown: ${error}\n`);
  }
}

// ============================================================================
// Main Example Runner
// ============================================================================

async function main() {
  console.log('🌟 AST Toolkit MCP Server Examples');
  console.log('===================================\n');

  try {
    // Run direct server examples
    const server = await directServerExample();
    
    // Demonstrate tool usage
    await toolUsageExamples(server);
    
    // Demonstrate resource usage
    await resourceUsageExamples(server);
    
    // Demonstrate message handler
    await messageHandlerExample();
    
    // Demonstrate error handling
    await errorHandlingExample(server);
    
    console.log('🎉 All examples completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Try running the standalone server: npx tsx src/mcp/server.ts');
    console.log('2. Integrate with your MCP client');
    console.log('3. Explore all available tools and resources');
    console.log('4. Build custom applications using the MCP interface');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main();
}

export {
  directServerExample,
  toolUsageExamples,
  resourceUsageExamples,
  messageHandlerExample,
  errorHandlingExample,
  sampleAST
};