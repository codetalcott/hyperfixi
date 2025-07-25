/**
 * Semantic Analysis Example
 * Demonstrates intent extraction, similarity detection, and semantic understanding
 */

import {
  extractIntents,
  calculateSimilarity,
  generateVariations,
  extractSemanticPatterns,
  analyzeSemantics
} from '@hyperfixi/ast-toolkit';
import { 
  sampleModalAST, 
  sampleFormAST, 
  sampleDashboardAST,
  sampleTodoAST,
  sampleEcommerceAST 
} from './sample-data.js';

console.log('🧠 HyperFixi AST Toolkit - Semantic Analysis Example');
console.log('==================================================\n');

console.log('🎯 INTENT EXTRACTION');
console.log('--------------------');

// Analyze different types of code to extract intents
const codeExamples = [
  { name: "Modal Dialog System", ast: sampleModalAST() },
  { name: "Contact Form", ast: sampleFormAST() },
  { name: "Dashboard Interface", ast: sampleDashboardAST() },
  { name: "Todo Application", ast: sampleTodoAST() }
];

codeExamples.forEach((example, index) => {
  console.log(`\n${index + 1}. Analyzing: ${example.name}`);
  console.log('═'.repeat(50));
  
  const intents = extractIntents(example.ast);
  
  if (intents.length === 0) {
    console.log('   No clear intents detected.');
    return;
  }
  
  // Group intents by type
  const intentGroups = intents.reduce((groups, intent) => {
    if (!groups[intent.type]) groups[intent.type] = [];
    groups[intent.type].push(intent);
    return groups;
  }, {} as Record<string, typeof intents>);
  
  Object.entries(intentGroups).forEach(([type, typeIntents]) => {
    console.log(`\n   📋 ${type.toUpperCase()} INTENTS:`);
    
    typeIntents.forEach((intent, i) => {
      console.log(`     ${i + 1}. ${intent.description}`);
      console.log(`        Confidence: ${(intent.confidence * 100).toFixed(1)}%`);
      console.log(`        Patterns: ${intent.patterns.join(', ')}`);
      console.log(`        Examples: ${intent.examples.slice(0, 2).join(', ')}`);
      console.log('');
    });
  });
});

console.log('\n🔍 SIMILARITY ANALYSIS');
console.log('----------------------');

// Compare different implementations for similarity
const comparisons = [
  { 
    name: "Modal vs Form (Different UIs)", 
    ast1: sampleModalAST(), 
    ast2: sampleFormAST() 
  },
  { 
    name: "Dashboard vs Todo (Different Apps)", 
    ast1: sampleDashboardAST(), 
    ast2: sampleTodoAST() 
  },
  { 
    name: "Form vs Todo (Similar Patterns)", 
    ast1: sampleFormAST(), 
    ast2: sampleTodoAST() 
  }
];

comparisons.forEach((comparison, index) => {
  console.log(`\n${index + 1}. ${comparison.name}`);
  console.log('─'.repeat(40));
  
  const similarity = calculateSimilarity(comparison.ast1, comparison.ast2);
  
  console.log(`📊 Overall Similarity: ${(similarity.similarity * 100).toFixed(1)}%`);
  console.log(`🏗️  Structural Similarity: ${(similarity.structuralSimilarity * 100).toFixed(1)}%`);
  console.log(`⚙️  Behavioral Similarity: ${(similarity.behavioralSimilarity * 100).toFixed(1)}%`);
  
  if (similarity.commonPatterns.length > 0) {
    console.log(`\n🎨 Common Patterns:`);
    similarity.commonPatterns.forEach(pattern => {
      console.log(`   • ${pattern}`);
    });
  }
  
  if (similarity.differences.length > 0) {
    console.log(`\n⚡ Key Differences:`);
    similarity.differences.slice(0, 3).forEach(diff => {
      console.log(`   • ${diff}`);
    });
  }
  
  // Interpretation
  let interpretation = '';
  if (similarity.similarity > 0.8) {
    interpretation = 'Very similar implementations - likely solving the same problem';
  } else if (similarity.similarity > 0.6) {
    interpretation = 'Moderately similar - some shared patterns and approaches';
  } else if (similarity.similarity > 0.4) {
    interpretation = 'Some similarities - possibly in the same domain';
  } else {
    interpretation = 'Quite different - likely addressing different use cases';
  }
  
  console.log(`\n💭 Interpretation: ${interpretation}`);
});

console.log('\n\n🔀 CODE VARIATION GENERATION');
console.log('----------------------------');

// Generate variations for different types of improvements
const variationExamples = [
  { name: "Simple Modal", ast: sampleModalAST(), types: ['syntactic', 'semantic'] },
  { name: "Contact Form", ast: sampleFormAST(), types: ['structural', 'semantic'] },
  { name: "Dashboard", ast: sampleDashboardAST(), types: ['syntactic', 'structural'] }
];

variationExamples.forEach((example, index) => {
  console.log(`\n${index + 1}. Generating variations for: ${example.name}`);
  console.log('═'.repeat(45));
  
  const variations = generateVariations(example.ast, {
    types: example.types as any,
    maxVariations: 6,
    preserveSemantics: true
  });
  
  if (variations.length === 0) {
    console.log('   No variations generated for this code structure.');
    return;
  }
  
  // Group by variation type
  const variationGroups = variations.reduce((groups, variation) => {
    if (!groups[variation.type]) groups[variation.type] = [];
    groups[variation.type].push(variation);
    return groups;
  }, {} as Record<string, typeof variations>);
  
  Object.entries(variationGroups).forEach(([type, typeVariations]) => {
    console.log(`\n   🔧 ${type.toUpperCase()} VARIATIONS:`);
    
    typeVariations.forEach((variation, i) => {
      console.log(`     ${i + 1}. ${variation.description}`);
      console.log(`        Original: ${variation.original}`);
      console.log(`        Variation: ${variation.variation}`);
      console.log(`        Preserves Meaning: ${variation.preservesMeaning ? '✅' : '❌'}`);
      console.log('');
    });
  });
});

console.log('\n🎨 SEMANTIC PATTERN RECOGNITION');
console.log('-------------------------------');

// Extract and analyze semantic patterns from complex code
const complexExample = sampleEcommerceAST();
console.log('Analyzing E-commerce Product Page for semantic patterns...\n');

const patterns = extractSemanticPatterns(complexExample);

if (patterns.length === 0) {
  console.log('No semantic patterns detected.');
} else {
  // Group patterns by category
  const patternCategories = patterns.reduce((categories, pattern) => {
    if (!categories[pattern.category]) categories[pattern.category] = [];
    categories[pattern.category].push(pattern);
    return categories;
  }, {} as Record<string, typeof patterns>);
  
  Object.entries(patternCategories).forEach(([category, categoryPatterns]) => {
    console.log(`📊 ${category.toUpperCase().replace('-', ' ')} PATTERNS:`);
    
    categoryPatterns.forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern.name}`);
      console.log(`     Description: ${pattern.description}`);
      console.log(`     Frequency: ${pattern.frequency} occurrence${pattern.frequency > 1 ? 's' : ''}`);
      console.log(`     Nodes: ${pattern.nodes.length} AST node${pattern.nodes.length > 1 ? 's' : ''}`);
      console.log('');
    });
  });
}

console.log('\n🧩 COMPREHENSIVE SEMANTIC ANALYSIS');
console.log('----------------------------------');

// Perform complete semantic analysis on a complex example
const dashboardAST = sampleDashboardAST();
console.log('Performing comprehensive semantic analysis on Dashboard Interface...\n');

const semanticAnalysis = analyzeSemantics(dashboardAST);

console.log('📋 ANALYSIS SUMMARY:');
console.log(`   Intents Identified: ${semanticAnalysis.intents.length}`);
console.log(`   Patterns Found: ${semanticAnalysis.patterns.length}`);
console.log(`   Concepts Extracted: ${semanticAnalysis.concepts.length}`);
console.log(`   Relationships Mapped: ${semanticAnalysis.relationships.length}`);

console.log('\n🎯 TOP INTENTS BY CONFIDENCE:');
const topIntents = semanticAnalysis.intents
  .sort((a, b) => b.confidence - a.confidence)
  .slice(0, 3);

topIntents.forEach((intent, i) => {
  console.log(`  ${i + 1}. ${intent.description} (${(intent.confidence * 100).toFixed(1)}%)`);
  console.log(`     Type: ${intent.type}`);
  console.log(`     Key Pattern: ${intent.patterns[0] || 'N/A'}`);
});

console.log('\n🏗️ CONCEPTUAL ANALYSIS:');
console.log('Core Concepts:');
semanticAnalysis.concepts.slice(0, 6).forEach((concept, i) => {
  console.log(`  ${i + 1}. ${concept}`);
});

console.log('\n🔗 RELATIONSHIP ANALYSIS:');
if (semanticAnalysis.relationships.length > 0) {
  const strongRelationships = semanticAnalysis.relationships
    .filter(rel => rel.strength > 0.7)
    .slice(0, 3);
  
  if (strongRelationships.length > 0) {
    console.log('Strong Relationships:');
    strongRelationships.forEach((rel, i) => {
      console.log(`  ${i + 1}. ${rel.type} relationship (strength: ${(rel.strength * 100).toFixed(1)}%)`);
      console.log(`     Between: ${rel.from.type} → ${rel.to.type}`);
    });
  } else {
    console.log('No strong relationships detected.');
  }
} else {
  console.log('No relationships identified.');
}

console.log('\n📊 SEMANTIC COMPLEXITY METRICS:');
const complexity = semanticAnalysis.complexity;
console.log(`   Conceptual Complexity: ${(complexity.conceptualComplexity * 100).toFixed(1)}%`);
console.log(`   Interaction Complexity: ${(complexity.interactionComplexity * 100).toFixed(1)}%`);
console.log(`   Data Flow Complexity: ${(complexity.dataFlowComplexity * 100).toFixed(1)}%`);
console.log(`   Overall Cognitive Load: ${(complexity.cognitiveLoad * 100).toFixed(1)}%`);

// Interpret complexity levels
const interpretComplexity = (value: number) => {
  if (value < 0.3) return 'Low - Easy to understand';
  if (value < 0.6) return 'Moderate - Some mental effort required';
  if (value < 0.8) return 'High - Requires significant mental effort';
  return 'Very High - May benefit from simplification';
};

console.log(`\n💭 Cognitive Load Assessment: ${interpretComplexity(complexity.cognitiveLoad)}`);

console.log('\n✨ SEMANTIC ANALYSIS COMPLETE!');
console.log('==============================');
console.log('This example demonstrated how semantic analysis can:');
console.log('• Extract high-level intents from code structures');
console.log('• Compare code similarity beyond syntax');
console.log('• Identify meaningful patterns in code behavior');
console.log('• Generate alternative implementations');
console.log('• Map relationships between code components');
console.log('• Assess cognitive complexity of code');

console.log('\n🚀 Advanced Applications:');
console.log('• Code recommendation systems');
console.log('• Intelligent refactoring suggestions');
console.log('• Automated documentation generation');
console.log('• Educational code explanation tools');
console.log('• Code quality assessment frameworks');