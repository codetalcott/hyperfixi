/**
 * Test setup for Vitest with Happy-DOM
 */

import { beforeEach } from 'vitest';

beforeEach(() => {
  // Clear DOM before each test
  document.body.innerHTML = '';

  // Reset any global state
  if (typeof window !== 'undefined') {
    // Clear any event listeners or global variables
    window.dispatchEvent(new Event('beforeunload'));
  }
});
