/**
 * AI-Powered Analysis Example
 * Demonstrates natural language interfaces for AST analysis
 */

import {
  explainCode,
  generateCodeTemplate,
  recognizeIntent,
  generateQualityInsights,
  createAIAssistant
} from '@hyperfixi/ast-toolkit';
import { sampleInteractiveAST, sampleFormAST } from './sample-data.js';

console.log('🤖 HyperFixi AST Toolkit - AI-Powered Analysis Example');
console.log('====================================================\n');

// Create AI Assistant instance
const assistant = createAIAssistant();

console.log('📖 NATURAL LANGUAGE CODE EXPLANATION');
console.log('------------------------------------');

const interactiveAST = sampleInteractiveAST();

// Generate explanations for different audiences
const audiences = ['beginner', 'developer', 'expert'] as const;

for (const audience of audiences) {
  console.log(`\n🎯 Explanation for ${audience.toUpperCase()}:`);
  console.log('═'.repeat(40));
  
  const explanation = explainCode(interactiveAST, {
    audience,
    detail: 'detailed',
    includeComplexity: true,
    includePatterns: true,
    includeSmells: true
  });
  
  console.log(`📋 Overview:`);
  console.log(explanation.overview);
  
  console.log(`\n🏗️  Structure:`);
  console.log(explanation.structure);
  
  console.log(`\n⚙️  Behavior:`);
  console.log(explanation.behavior);
  
  if (explanation.complexity) {
    console.log(`\n📊 Complexity:`);
    console.log(explanation.complexity);
  }
  
  if (explanation.patterns && explanation.patterns.length > 0) {
    console.log(`\n🎨 Patterns Identified:`);
    explanation.patterns.forEach((pattern, i) => {
      console.log(`  ${i + 1}. ${pattern}`);
    });
  }
  
  if (explanation.suggestions && explanation.suggestions.length > 0) {
    console.log(`\n💡 Suggestions:`);
    explanation.suggestions.forEach((suggestion, i) => {
      console.log(`  ${i + 1}. ${suggestion}`);
    });
  }
}

console.log('\n\n🎯 INTENT RECOGNITION');
console.log('---------------------');

// Sample user intents to recognize
const userIntents = [
  "toggle class active on button click",
  "fetch data from /api/users endpoint",
  "submit form and show success message",
  "validate email input as user types",
  "open modal dialog when clicking trigger",
  "add loading spinner during AJAX request"
];

console.log('Recognizing intents from natural language descriptions:\n');

userIntents.forEach((description, index) => {
  console.log(`${index + 1}. User says: "${description}"`);
  
  const intent = recognizeIntent(description);
  
  console.log(`   🎯 Intent: ${intent.intent}`);
  console.log(`   🎲 Confidence: ${(intent.confidence * 100).toFixed(1)}%`);
  
  if (Object.keys(intent.parameters).length > 0) {
    console.log(`   📋 Parameters:`, intent.parameters);
  }
  
  if (intent.suggestions.length > 0) {
    console.log(`   💭 Suggestions:`);
    intent.suggestions.forEach(suggestion => {
      console.log(`      • ${suggestion}`);
    });
  }
  
  console.log('');
});

console.log('\n🛠️  CODE GENERATION FROM INTENT');
console.log('-------------------------------');

// Generate code templates from recognized intents
const generationExamples = [
  { intent: "toggle class active", style: 'minimal' as const },
  { intent: "fetch data from API", style: 'documented' as const },
  { intent: "validate input field", style: 'verbose' as const },
  { intent: "submit form data", style: 'documented' as const }
];

generationExamples.forEach((example, index) => {
  console.log(`\n${index + 1}. Generating code for: "${example.intent}"`);
  console.log('─'.repeat(50));
  
  const template = generateCodeTemplate(example.intent, {
    style: example.style,
    includeComments: true,
    targetAudience: 'intermediate'
  });
  
  console.log(`📝 Pattern: ${template.pattern}`);
  console.log(`📖 Description: ${template.description}`);
  console.log(`\n💻 Generated Code:`);
  console.log(template.code);
  console.log(`\n📚 Explanation:`);
  console.log(template.explanation);
  
  if (template.variations && template.variations.length > 0) {
    console.log(`\n🔀 Variations Available:`);
    template.variations.forEach((variation, i) => {
      console.log(`  ${i + 1}. ${variation.description}`);
      console.log(`     Code: ${variation.code}`);
    });
  }
});

console.log('\n\n🔍 AI-POWERED QUALITY INSIGHTS');
console.log('------------------------------');

// Analyze different types of code for quality insights
const codeExamples = [
  { name: "Interactive Dashboard", ast: sampleInteractiveAST() },
  { name: "Contact Form", ast: sampleFormAST() }
];

codeExamples.forEach((example, index) => {
  console.log(`\n${index + 1}. Analyzing: ${example.name}`);
  console.log('═'.repeat(40));
  
  const insights = generateQualityInsights(example.ast);
  
  if (insights.length === 0) {
    console.log('✅ No quality issues detected - code looks great!');
    return;
  }
  
  // Group insights by category
  const categories = ['performance', 'maintainability', 'readability', 'best-practice'] as const;
  
  categories.forEach(category => {
    const categoryInsights = insights.filter(i => i.category === category);
    if (categoryInsights.length === 0) return;
    
    console.log(`\n📊 ${category.toUpperCase()} INSIGHTS:`);
    
    categoryInsights.forEach((insight, i) => {
      const levelIcon = insight.level === 'error' ? '🚨' : 
                       insight.level === 'warning' ? '⚠️' : 
                       insight.level === 'info' ? 'ℹ️' : '💡';
      
      console.log(`  ${levelIcon} ${insight.message}`);
      console.log(`     💡 ${insight.suggestion}`);
      
      if (insight.automated) {
        console.log(`     🤖 This can be auto-fixed`);
      }
      
      console.log('');
    });
  });
});

console.log('\n🚀 COMPREHENSIVE AI ASSISTANT DEMO');
console.log('----------------------------------');

// Demonstrate the full AI assistant capabilities
const demoAST = sampleFormAST();

console.log('Using the AI Assistant to provide comprehensive analysis:\n');

// 1. Explain the code
console.log('1️⃣ Code Explanation:');
const aiExplanation = assistant.explainCode(demoAST, { audience: 'developer' });
console.log(`   ${aiExplanation.overview}\n`);

// 2. Recognize intent from a user query
const userQuery = "I want to add real-time validation to this form";
console.log(`2️⃣ User Query: "${userQuery}"`);
const recognizedIntent = assistant.recognizeIntent(userQuery);
console.log(`   Intent: ${recognizedIntent.intent} (${(recognizedIntent.confidence * 100).toFixed(1)}% confidence)\n`);

// 3. Generate appropriate code template
console.log('3️⃣ Generated Solution:');
const solution = assistant.generateCodeTemplate(userQuery);
console.log(`   ${solution.description}`);
console.log(`   Code: ${solution.code}\n`);

// 4. Provide quality insights
console.log('4️⃣ Quality Assessment:');
const qualityInsights = assistant.generateQualityInsights(demoAST);
if (qualityInsights.length > 0) {
  const priorityInsight = qualityInsights.find(i => i.level === 'warning') || qualityInsights[0];
  console.log(`   ${priorityInsight.message}`);
  console.log(`   Recommendation: ${priorityInsight.suggestion}`);
} else {
  console.log('   Code quality looks excellent!');
}

console.log('\n✨ AI ANALYSIS COMPLETE!');
console.log('========================');
console.log('This example demonstrated how AI-powered analysis can:');
console.log('• Make complex code accessible through natural language');
console.log('• Understand user intentions and provide relevant solutions');
console.log('• Generate code templates with best practices');
console.log('• Provide actionable quality improvements');
console.log('• Create a conversational interface for code analysis');

console.log('\n🎯 Next Steps:');
console.log('• Try modifying the sample ASTs to see different explanations');
console.log('• Experiment with different user intent descriptions');
console.log('• Adjust explanation audiences and detail levels');
console.log('• Integrate these APIs into your own development tools');