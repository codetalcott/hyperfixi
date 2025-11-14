#!/usr/bin/env node
import { chromium } from 'playwright';

async function testTokenizer() {
  console.log('🧪 Testing tokenizer with `:idx` syntax...\\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('  ', text);
  });

  page.on('pageerror', err => console.error('  ❌ Error:', err.message));

  try {
    await page.goto('http://127.0.0.1:3000/test-tokenizer.html', { waitUntil: 'load', timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('\\n📊 Test Complete');

  } catch (error) {
    console.error('\\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testTokenizer();
