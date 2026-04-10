/**
 * LLM-Native UI validation test — all three JSON forms.
 *
 * Exercises the three protocol JSON forms that can embed an event handler,
 * confirming that the Option A + event-handler unwrap fix (commit landed
 * 2026-04-10) makes them ALL execute correctly at runtime:
 *
 * 1. **bare command** — `{action, roles}` with no event wrapper. The element's
 *    own `trigger="click"` attribute provides the wiring. This form already
 *    worked before the fix.
 * 2. **verbose event-handler** — `{kind:"event-handler", action:"on", body:[...]}`.
 *    The original compilation service output shape. Failed before the fix
 *    because `evalLSENode` on an event-handler node tried to re-wire a
 *    listener instead of executing the body.
 * 3. **compact trigger sugar** — `{action, roles, trigger:{event:"click"}}`.
 *    The new compilation service output shape (post-Option A in
 *    @lokascript/intent's toProtocolJSON). Same runtime failure mode as
 *    verbose before the unwrap fix — both ended up as event-handler
 *    SemanticNodes after `fromProtocolJSON`.
 *
 * Run from the repo root via `npx http-server -p 3000` + `npx playwright test`
 * with the baseURL set to `http://localhost:3000`, OR copy this file into
 * `packages/core/src/compatibility/browser-tests/` which uses that config.
 */
import { test, expect } from '@playwright/test';

const CASES: Array<{ name: string; url: string }> = [
  {
    name: 'bare command (no trigger sugar)',
    url: '/examples/llm-native-todo-demo/toggle-sidebar-bare-command.html',
  },
  {
    name: 'verbose event-handler form',
    url: '/examples/llm-native-todo-demo/toggle-sidebar-verbose-form.html',
  },
  {
    name: 'compact form with trigger sugar',
    url: '/examples/llm-native-todo-demo/toggle-sidebar-compact-trigger.html',
  },
];

for (const { name, url } of CASES) {
  test(`${name}: destination role honored, toggles #sidebar not host`, async ({ page }) => {
    await page.goto(url);
    await page.waitForTimeout(200);

    const sidebar = page.locator('#sidebar');
    const host = page.locator('#button-host');

    await expect(sidebar).not.toHaveClass(/active/);
    await expect(host).not.toHaveClass(/active/);

    await host.locator('button').click();
    await page.waitForTimeout(200);

    await expect(sidebar).toHaveClass(/active/);
    await expect(host).not.toHaveClass(/active/);

    // Click again — should toggle off.
    await host.locator('button').click();
    await page.waitForTimeout(200);

    await expect(sidebar).not.toHaveClass(/active/);
    await expect(host).not.toHaveClass(/active/);
  });
}
