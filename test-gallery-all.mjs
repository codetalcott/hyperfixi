import { spawn } from 'child_process';

function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${testFile}`);
    console.log('='.repeat(60));

    const child = spawn('node', [testFile], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', (error) => {
      console.error(`Failed to start ${testFile}:`, error);
      resolve(false);
    });
  });
}

(async () => {
  console.log('\n' + '█'.repeat(60));
  console.log('  HYPERFIXI GALLERY EXAMPLES - COMPREHENSIVE TEST SUITE');
  console.log('█'.repeat(60));

  const tests = [
    { name: 'Basics', file: 'test-gallery-basics.mjs' },
    { name: 'Intermediate', file: 'test-gallery-intermediate.mjs' },
    { name: 'Advanced', file: 'test-gallery-advanced.mjs' }
  ];

  const results = [];

  for (const test of tests) {
    const passed = await runTest(test.file);
    results.push({ ...test, passed });
  }

  // Print final summary
  console.log('\n' + '█'.repeat(60));
  console.log('  FINAL TEST SUMMARY');
  console.log('█'.repeat(60));

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${result.name.padEnd(20)} ${status}`);
  });

  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;

  console.log('─'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passedCount} | Failed: ${results.length - passedCount}`);
  console.log('█'.repeat(60));

  if (allPassed) {
    console.log('\n🎉 All gallery examples are working correctly!\n');
  } else {
    console.log('\n⚠️  Some gallery examples have issues. Please review the failures above.\n');
  }

  process.exit(allPassed ? 0 : 1);
})();
