import { hyperscript } from './dist/index.mjs';

// Test direct command (this works)
console.log('=== Direct command compilation ===');
const directResult = hyperscript.compile("set #output's textContent to new Date()");
console.log('Direct success:', directResult.success);
if (!directResult.success) {
  console.log('Direct errors:', directResult.errors?.map(e => e.message));
}

// Test event handler (this fails)
console.log('\n=== Event handler compilation ===');
const eventResult = hyperscript.compile("on click set #output's textContent to new Date()");
console.log('Event success:', eventResult.success);
if (!eventResult.success) {
  console.log('Event errors:', eventResult.errors?.map(e => e.message));
}

// Test simpler event handler
console.log('\n=== Simple event handler ===');
const simpleResult = hyperscript.compile("on click set #output's textContent to 'test'");
console.log('Simple success:', simpleResult.success);
if (!simpleResult.success) {
  console.log('Simple errors:', simpleResult.errors?.map(e => e.message));
}