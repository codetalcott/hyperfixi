const fs = require('fs');
const dist = fs.readFileSync('./dist/hyperfixi-browser.js', 'utf8');
eval(dist);

// Test the specific cases that were failing
try {
  console.log('Testing `$1`:', hyperscriptFixi.run('`$1`'));
} catch (e) {
  console.log('Error with `$1`:', e.message);
}

try {
  window.foo = 'bar';
  console.log('Testing `$window.foo`:', hyperscriptFixi.run('`$window.foo`'));
} catch (e) {
  console.log('Error with `$window.foo`:', e.message);
}
