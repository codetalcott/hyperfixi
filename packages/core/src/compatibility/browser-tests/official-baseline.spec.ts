/**
 * Official _hyperscript Test Suite - Full Baseline Assessment
 * Tests HyperFixi against all 83 official _hyperscript test files
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Official _hyperscript Test Suite - Complete Baseline', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000/official-full-baseline.html');
    await page.waitForTimeout(1000);
  });

  test('Complete Baseline Assessment - All 83 Test Files', async () => {
    console.log('🎯 Starting complete baseline assessment of official _hyperscript test suite...');

    // Run the full baseline test
    await page.click('button[onclick="runBaselineTest()"]');
    
    // Wait for tests to complete (give it time to process all 83 files)
    await page.waitForTimeout(10000);
    
    // Get the results
    const results = await page.evaluate(() => {
      return {
        total: parseInt(document.getElementById('total-pass')?.textContent || '0') +
               parseInt(document.getElementById('total-fail')?.textContent || '0') +
               parseInt(document.getElementById('total-skip')?.textContent || '0'),
        passed: parseInt(document.getElementById('total-pass')?.textContent || '0'),
        failed: parseInt(document.getElementById('total-fail')?.textContent || '0'),
        skipped: parseInt(document.getElementById('total-skip')?.textContent || '0'),
        percent: document.getElementById('total-percent')?.textContent || '0%'
      };
    });

    console.log('📊 Official Test Suite Results:');
    console.log(`   Total Files Tested: ${results.total}`);
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    console.log(`   📈 Success Rate: ${results.percent}`);

    // Assertions
    expect(results.total).toBeGreaterThan(70); // Should test most of the 83 files
    
    // Log detailed breakdown
    await page.waitForTimeout(1000);
    console.log('\n🔍 Detailed Category Breakdown:');
    
    // Check if we have results for each category
    const categories = ['expressions', 'commands', 'features', 'core', 'ext', 'templates'];
    for (const category of categories) {
      const categoryStats = await page.textContent(`#${category}-stats`);
      if (categoryStats) {
        console.log(`   ${category.toUpperCase()}: ${categoryStats}`);
      }
    }

    // Report final assessment
    const successRate = parseInt(results.percent.replace('%', ''));
    
    if (successRate >= 80) {
      console.log('\n🎉 EXCELLENT: High compatibility with _hyperscript!');
    } else if (successRate >= 60) {
      console.log('\n✅ GOOD: Solid compatibility with _hyperscript!');
    } else if (successRate >= 40) {
      console.log('\n⚠️  MODERATE: Partial compatibility - significant gaps remain');
    } else if (successRate >= 20) {
      console.log('\n⚠️  LOW: Limited compatibility - major development needed');
    } else {
      console.log('\n❌ VERY LOW: Minimal compatibility - extensive work required');
    }

    console.log('\n📋 Next Steps Based on Results:');
    if (results.failed > results.passed) {
      console.log('   1. Focus on implementing missing expression features');
      console.log('   2. Implement core command functionality');
      console.log('   3. Add missing feature support');
    } else {
      console.log('   1. Polish existing implementations');
      console.log('   2. Add advanced features and edge cases');
      console.log('   3. Optimize for full parity');
    }
  });

  test('Expression Tests Only - Detailed Assessment', async () => {
    console.log('🔍 Testing expressions category in detail...');

    // Clear and run expressions only
    await page.click('button[onclick="clearResults()"]');
    await page.waitForTimeout(500);
    await page.click('button[onclick="runExpressionsOnly()"]');
    await page.waitForTimeout(5000);

    const results = await page.evaluate(() => {
      return {
        passed: parseInt(document.getElementById('total-pass')?.textContent || '0'),
        failed: parseInt(document.getElementById('total-fail')?.textContent || '0'),
        skipped: parseInt(document.getElementById('total-skip')?.textContent || '0'),
        percent: document.getElementById('total-percent')?.textContent || '0%'
      };
    });

    console.log('📝 Expression Tests Results (33 files):');
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    console.log(`   📈 Success Rate: ${results.percent}`);

    // Expressions should be our strongest area
    expect(parseInt(results.percent.replace('%', ''))).toBeGreaterThan(20);
  });

  test('Command Tests Only - Detailed Assessment', async () => {
    console.log('⚙️ Testing commands category in detail...');

    // Clear and run commands only
    await page.click('button[onclick="clearResults()"]');
    await page.waitForTimeout(500);
    await page.click('button[onclick="runCommandsOnly()"]');
    await page.waitForTimeout(5000);

    const results = await page.evaluate(() => {
      return {
        passed: parseInt(document.getElementById('total-pass')?.textContent || '0'),
        failed: parseInt(document.getElementById('total-fail')?.textContent || '0'),
        skipped: parseInt(document.getElementById('total-skip')?.textContent || '0'),
        percent: document.getElementById('total-percent')?.textContent || '0%'
      };
    });

    console.log('⚙️ Command Tests Results (30 files):');
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    console.log(`   📈 Success Rate: ${results.percent}`);

    // Commands are our implemented area, should show some success
    expect(results.passed).toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    console.log('\n🎯 Official _hyperscript Test Suite Baseline Complete');
    console.log('This establishes our true compatibility level for development planning.');
  });
});