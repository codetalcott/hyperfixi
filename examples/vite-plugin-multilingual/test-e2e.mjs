import { chromium } from 'playwright';

// Support both dev (5173) and preview (4173) ports
const DEV_URL = 'http://localhost:5173/';
const PREVIEW_URL = 'http://localhost:4173/';

async function findServer() {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    await execAsync('curl -s http://localhost:4173/ > /dev/null');
    return PREVIEW_URL;
  } catch {
    try {
      await execAsync('curl -s http://localhost:5173/ > /dev/null');
      return DEV_URL;
    } catch {
      return null;
    }
  }
}

async function test() {
  const serverUrl = await findServer();
  if (!serverUrl) {
    console.log('No server running. Start with: npm run dev OR npm run preview');
    process.exit(1);
  }
  console.log('Testing:', serverUrl);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console logs
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto(serverUrl);
  await page.waitForLoadState('networkidle');
  
  console.log('=== Console logs ===');
  logs.forEach(log => console.log(log));
  
  // Test English toggle
  console.log('\n=== Testing English Toggle ===');
  const enButton = page.locator('button:has-text("Toggle Active")');
  const enHasActiveBefore = await enButton.evaluate(el => el.classList.contains('active'));
  console.log('Before click, has .active:', enHasActiveBefore);
  await enButton.click();
  const enHasActiveAfter = await enButton.evaluate(el => el.classList.contains('active'));
  console.log('After click, has .active:', enHasActiveAfter);
  
  // Test Japanese toggle
  console.log('\n=== Testing Japanese Toggle ===');
  const jaButton = page.locator('button:has-text("アクティブ切り替え")');
  await jaButton.click();
  const jaHasActive = await jaButton.evaluate(el => el.classList.contains('active'));
  console.log('Japanese button after click, has .active:', jaHasActive);
  
  // Test Spanish toggle
  console.log('\n=== Testing Spanish Toggle ===');
  const esButton = page.locator('button:has-text("Alternar Activo")');
  await esButton.click();
  const esHasActive = await esButton.evaluate(el => el.classList.contains('active'));
  console.log('Spanish button after click, has .active:', esHasActive);
  
  // Test Korean toggle
  console.log('\n=== Testing Korean Toggle ===');
  const koButton = page.locator('button:has-text("활성 전환")');
  await koButton.click();
  const koHasActive = await koButton.evaluate(el => el.classList.contains('active'));
  console.log('Korean button after click, has .active:', koHasActive);
  
  console.log('\n=== Test Results ===');
  console.log('English toggle works:', enHasActiveAfter === true);
  console.log('Japanese toggle works:', jaHasActive === true);
  console.log('Spanish toggle works:', esHasActive === true);
  console.log('Korean toggle works:', koHasActive === true);
  
  await browser.close();
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
