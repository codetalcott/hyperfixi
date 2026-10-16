/**
 * @lokascript/framework/testing/gate — the round-trip gate kit and the grammar linter
 * (domains rethink Phase 4.6). No test runner needed: a grammar's gate test or regen
 * tool calls `runRoundTrip` and `compare`, its lint test `lintDomain`.
 */

export * from './round-trip';
export * from './lint';
