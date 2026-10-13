// Shared helpers for generated UI tests. Copied into <project>/tests/ui/fixtures.ts by the
// uitest workflow; app-specific details (login, DB queries) live in ./app.ts.
//
// Environment (set by the workflow's Environment phase):
//   UITEST_BASE_URL   frontend URL       UITEST_API_URL  API URL (defaults to UITEST_BASE_URL)
//   UITEST_USERS      JSON [{role,email,password,name}] seeded test users
import { test as base, expect, type APIRequestContext, type Browser, type Page } from '@playwright/test';
import { loginUi, loginApi, dbQuery } from './app';

// Test traffic only ever goes to local dev hosts (design/ui-testing.md). This repeats the
// check the workflow already made, so a misconfigured run can't reach anything else.
export function hostAllowed(url: string): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol)) return false;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost') || h.endsWith('.test');
}

export const BASE_URL = process.env.UITEST_BASE_URL || '';
export const API_URL = process.env.UITEST_API_URL || BASE_URL;
for (const url of [BASE_URL, API_URL]) {
  if (!hostAllowed(url)) throw new Error(`uitest: refusing to run against non-local target "${url}"`);
}

export interface TestUser { role: string; email: string; password: string; name?: string }
export const USERS: TestUser[] = JSON.parse(process.env.UITEST_USERS || '[]');

export function userFor(role: string, index = 0): TestUser {
  const matches = USERS.filter(u => u.role === role);
  if (!matches[index]) throw new Error(`uitest: no seeded user #${index} with role "${role}"`);
  return matches[index];
}

// API calls go through here so every URL is host-checked.
export async function call(
  request: APIRequestContext,
  method: string,
  path: string,
  opts: { token?: string; data?: unknown; headers?: Record<string, string> } = {},
) {
  const url = new URL(path, API_URL).toString();
  if (!hostAllowed(url)) throw new Error(`uitest: blocked request to non-local URL ${url}`);
  const headers = { ...(opts.headers || {}), ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) };
  const res = await request.fetch(url, { method, headers, data: opts.data as never, failOnStatusCode: false });
  let body: unknown = null;
  try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
  return { status: res.status(), headers: res.headers(), body };
}

// One logged-in page per role, each in its own browser context (separate cookies/storage),
// for collaboration tests where several users act at the same time.
export async function asUsers(browser: Browser, roles: string[]): Promise<Page[]> {
  const pages: Page[] = [];
  const seen: Record<string, number> = {};
  for (const role of roles) {
    const index = seen[role] = (seen[role] ?? -1) + 1;
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    await loginUi(page, userFor(role, index));
    pages.push(page);
  }
  return pages;
}

// Fails the test if any script-created dialog opens (used by the xss suite and all flows).
export const test = base.extend<{ guardDialogs: void }>({
  guardDialogs: [async ({ page }, use) => {
    // Errors thrown inside an event listener don't fail the test, so record and assert after.
    const dialogs: string[] = [];
    page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.dismiss().catch(() => {}); });
    await use();
    expect(dialogs, 'unexpected browser dialogs').toEqual([]);
  }, { auto: true }],
});

export { expect, loginUi, loginApi, dbQuery };
