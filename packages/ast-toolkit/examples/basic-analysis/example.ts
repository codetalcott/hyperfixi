/**
 * Basic Analysis Example
 * Demonstrates fundamental AST analysis capabilities
 */

import {
  visit,
  findNodes,
  calculateComplexity,
  analyzeMetrics,
  detectCodeSmells,
  countNodeTypes
} from '@hyperfixi/ast-toolkit';
import { sampleComplexAST } from './sample-data.js';

console.log('🔍 HyperFixi AST Toolkit - Basic Analysis Example');
console.log('================================================\n');

// Sample AST for analysis
const ast = sampleComplexAST();

console.log('📊 BASIC STATISTICS');
console.log('-------------------');

// Count different types of nodes
const nodeCounts = countNodeTypes(ast);
console.log('Node type distribution:');
for (const [type, count] of Object.entries(nodeCounts)) {
  console.log(`  ${type}: ${count}`);
}

// Find specific node types
const eventHandlers = findNodes(ast, node => node.type === 'eventHandler');
const commands = findNodes(ast, node => node.type === 'command');
const conditionals = findNodes(ast, node => node.type === 'conditional');

console.log(`\nStructural overview:`);
console.log(`  Event handlers: ${eventHandlers.length}`);
console.log(`  Commands: ${commands.length}`);
console.log(`  Conditionals: ${conditionals.length}`);

console.log('\n📏 COMPLEXITY METRICS');
console.log('---------------------');

// Calculate complexity metrics
const complexity = calculateComplexity(ast);
console.log(`Cyclomatic complexity: ${complexity.cyclomatic}`);
console.log(`Cognitive complexity: ${complexity.cognitive}`);
console.log(`Halstead metrics:`);
console.log(`  Vocabulary: ${complexity.halstead.vocabulary}`);
console.log(`  Length: ${complexity.halstead.length}`);
console.log(`  Difficulty: ${complexity.halstead.difficulty.toFixed(2)}`);
console.log(`  Effort: ${complexity.halstead.effort.toFixed(2)}`);

console.log('\n🔍 COMPREHENSIVE ANALYSIS');
console.log('-------------------------');

// Perform comprehensive analysis
const analysis = analyzeMetrics(ast);
console.log(`Maintainability Index: ${analysis.maintainabilityIndex.toFixed(1)}/100`);

// Interpret maintainability score
let maintainabilityLevel = 'Poor';
if (analysis.maintainabilityIndex >= 80) maintainabilityLevel = 'Excellent';
else if (analysis.maintainabilityIndex >= 70) maintainabilityLevel = 'Good';
else if (analysis.maintainabilityIndex >= 50) maintainabilityLevel = 'Fair';

console.log(`Maintainability Level: ${maintainabilityLevel}`);

console.log('\n⚠️  CODE SMELLS DETECTED');
console.log('------------------------');

// Detect and display code smells
const smells = detectCodeSmells(ast);
if (smells.length === 0) {
  console.log('✅ No code smells detected!');
} else {
  smells.forEach((smell, index) => {
    console.log(`${index + 1}. ${smell.type.toUpperCase()}`);
    console.log(`   Message: ${smell.message}`);
    console.log(`   Severity: ${smell.severity}`);
    console.log(`   Location: Line ${smell.location.line}, Column ${smell.location.column}`);
    if (smell.suggestion) {
      console.log(`   Suggestion: ${smell.suggestion}`);
    }
    console.log('');
  });
}

console.log('🎯 PATTERN ANALYSIS');
console.log('-------------------');

// Analyze event handler patterns
const eventTypes = eventHandlers.map(h => (h as any).event).filter(Boolean);
const eventCounts = eventTypes.reduce((acc, event) => {
  acc[event] = (acc[event] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('Event handler patterns:');
for (const [event, count] of Object.entries(eventCounts)) {
  console.log(`  ${event}: ${count} handler${count > 1 ? 's' : ''}`);
}

// Analyze command patterns
const commandTypes = commands.map(c => (c as any).name).filter(Boolean);
const commandCounts = commandTypes.reduce((acc, command) => {
  acc[command] = (acc[command] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('\nCommand usage patterns:');
for (const [command, count] of Object.entries(commandCounts)) {
  console.log(`  ${command}: ${count} occurrence${count > 1 ? 's' : ''}`);
}

console.log('\n🚨 RECOMMENDATIONS');
console.log('------------------');

// Generate recommendations based on analysis
const recommendations: string[] = [];

if (complexity.cyclomatic > 10) {
  recommendations.push('Consider breaking down complex functions (high cyclomatic complexity)');
}

if (complexity.cognitive > 15) {
  recommendations.push('Simplify conditional logic to reduce cognitive load');
}

if (analysis.maintainabilityIndex < 70) {
  recommendations.push('Improve code maintainability through refactoring');
}

if (eventHandlers.length > 5) {
  recommendations.push('Consider using behavior definitions for repeated patterns');
}

if (commands.filter(c => (c as any).name === 'fetch').length > 2) {
  recommendations.push('Consider abstracting AJAX requests into reusable functions');
}

if (smells.some(s => s.type === 'long-command-chain')) {
  recommendations.push('Break down long command chains into smaller, focused handlers');
}

if (recommendations.length === 0) {
  console.log('✅ Code quality looks good! No specific recommendations.');
} else {
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
}

console.log('\n📈 ADVANCED TRAVERSAL EXAMPLE');
console.log('-----------------------------');

// Demonstrate custom visitor pattern usage
let depth = 0;
let maxDepth = 0;
const nodesByDepth: { [key: number]: string[] } = {};

visit(ast, {
  enter: (node) => {
    depth++;
    maxDepth = Math.max(maxDepth, depth);
    
    if (!nodesByDepth[depth]) {
      nodesByDepth[depth] = [];
    }
    nodesByDepth[depth].push(node.type);
  },
  exit: (node) => {
    depth--;
  }
});

console.log(`Maximum nesting depth: ${maxDepth}`);
console.log('Nodes by depth level:');
for (let i = 1; i <= maxDepth; i++) {
  if (nodesByDepth[i]) {
    const types = [...new Set(nodesByDepth[i])];
    console.log(`  Level ${i}: ${types.join(', ')}`);
  }
}

console.log('\n✨ Analysis Complete!');
console.log('This example demonstrated basic AST analysis capabilities.');
console.log('Try modifying the sample AST in sample-data.ts to see different results.');