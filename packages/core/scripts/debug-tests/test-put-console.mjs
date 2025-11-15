import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

// Capture console messages
const messages = [];
page.on('console', msg => {
    messages.push({ type: msg.type(), text: msg.text() });
    console.log(`[${msg.type()}]`, msg.text());
});

// Load the test page
await page.goto('http://127.0.0.1:3000/test-put-debug.html');

// Wait for page to load
await page.waitForTimeout(1000);

// Run test 1
console.log('\n=== Running Test 1 ===');
await page.click('button:has-text("Run Test 1")');

// Wait for execution
await page.waitForTimeout(2000);

// Get the result
const result1 = await page.locator('#result1').textContent();
console.log('\nTest 1 Result:', result1);

// Get element content
const test1Content = await page.locator('#test1').textContent();
console.log('Test 1 Element Content:', test1Content);

await browser.close();
