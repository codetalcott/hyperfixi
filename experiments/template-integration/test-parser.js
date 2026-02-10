// Quick test of parser functionality
const { TemplateParser } = require('./dist/index.js');

const parser = new TemplateParser();

// Test 1: Basic template variable
console.log('Test 1: Template variables');
const nodes1 = parser.parse('Hello, {{name}}!');
console.log('Nodes:', nodes1);
console.log('Content:', nodes1[0]?.content);

// Test 2: Self-closing tag
console.log('\nTest 2: Self-closing tag');
const nodes2 = parser.parse('<br/>');
console.log('Nodes count:', nodes2.length);
console.log('Tag name:', nodes2[0]?.tagName);

// Test 3: Whitespace preservation
console.log('\nTest 3: Whitespace');
const nodes3 = parser.parse('<pre>  Formatted   text  </pre>');
console.log('Content:', nodes3[0]?.children?.[0]?.content);