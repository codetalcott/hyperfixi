#!/usr/bin/env bash
#
# Run vitest with a timeout, but decide pass/fail from the REPORTER SUMMARY
# rather than the raw exit code.
#
# Why: vitest's esbuild daemon can keep the Node process alive AFTER all tests
# have completed, so the run gets killed by `timeout` and exits 124 even though
# every test passed. The old scripts handled this with `|| [ $? -eq 124 ]`,
# which treats *any* 124 as success — including a genuine mid-run hang, which
# then silently masks real failures (a hung test file made CI report green
# while hiding the whole suite's results).
#
# This wrapper distinguishes the two:
#   - summary shows "N failed"        -> FAIL (real test failures)
#   - summary shows "Test Files ... passed" with no failures -> PASS
#     (a trailing 124 here is just the benign post-completion daemon hang)
#   - no summary at all               -> FAIL (the run hung/crashed before
#                                        finishing; never report this green)
#
# Env:
#   VITEST_TIMEOUT  seconds before the run is killed (default 120)
#   VITEST_QUIET    "1" to suppress streaming output (used by test:check)
#
# All extra args are forwarded to `vitest run`.
set -uo pipefail

TIMEOUT="${VITEST_TIMEOUT:-120}"
LOG="$(mktemp -t vitest-run.XXXXXX)"
trap 'rm -f "$LOG"' EXIT

if [ "${VITEST_QUIET:-0}" = "1" ]; then
  timeout "$TIMEOUT" vitest run "$@" >"$LOG" 2>&1
  rc=$?
else
  timeout "$TIMEOUT" vitest run "$@" 2>&1 | tee "$LOG"
  rc="${PIPESTATUS[0]}"
fi

summary="$(grep -aE 'Test Files|Tests ' "$LOG" | tail -2)"

# 1. Explicit test failures in the summary -> FAIL.
if grep -qaE '[0-9]+ failed' "$LOG"; then
  echo "vitest-run: FAIL — failing tests reported (exit=$rc)"
  [ -n "$summary" ] && echo "$summary"
  exit 1
fi

# 2. Clean exit -> PASS.
if [ "$rc" -eq 0 ]; then
  [ -n "$summary" ] && echo "$summary"
  exit 0
fi

# 3. Benign post-run esbuild daemon hang: killed by `timeout` (124) only AFTER
#    the run completed (a reporter summary is present). Tests passed; the daemon
#    just kept the event loop alive. -> PASS.
if [ "$rc" -eq 124 ] && grep -qaE 'Test Files .*passed' "$LOG"; then
  echo "vitest-run: PASS — tests completed; process killed by post-run esbuild daemon hang (benign)"
  [ -n "$summary" ] && echo "$summary"
  exit 0
fi

# 4. Any other non-zero exit -> FAIL. Covers: a mid-run hang (124 with no
#    summary; results untrustworthy) AND non-test failures that still print a
#    passing test summary, e.g. a coverage-threshold miss (`vitest --coverage`
#    exits non-zero while "Test Files N passed" is shown). Never mask these.
echo "vitest-run: FAIL — non-zero exit ($rc) not attributable to a benign post-run hang."
echo "  (mid-run hang with no summary, coverage-threshold miss, or a crash.)"
[ -n "$summary" ] && echo "$summary"
exit 1
