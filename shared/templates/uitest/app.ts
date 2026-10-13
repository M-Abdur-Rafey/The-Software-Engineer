// App adapter: the only app-specific code the generated tests share. Written once per
// project by the uitest workflow from the System Docs (auth module APIs and flows, the
// foundation module's DB decision), then kept and reused. Replace every TODO.
import type { Page } from '@playwright/test';
import type { TestUser } from './fixtures';

/** Log in through the real UI (login page, form fields, submit, wait for the signed-in state). */
export async function loginUi(page: Page, user: TestUser): Promise<void> {
  // TODO from the auth module's login flow, e.g.:
  // await page.goto('/login');
  // await page.getByLabel('Email').fill(user.email);
  // await page.getByLabel('Password').fill(user.password);
  // await page.getByRole('button', { name: 'Sign in' }).click();
  // await page.waitForURL('**/projects');
  throw new Error('uitest: loginUi not implemented');
}

/** Log in through the API and return the bearer token (or '' for cookie-based auth). */
export async function loginApi(request: import('@playwright/test').APIRequestContext, apiUrl: string, user: TestUser): Promise<string> {
  // TODO from the auth module's login API, e.g.:
  // const res = await request.post(new URL('/api/auth/login', apiUrl).toString(), { data: { email: user.email, password: user.password } });
  // return (await res.json()).token;
  throw new Error('uitest: loginApi not implemented');
}

/**
 * Read-only query against the throwaway test database, for UI-vs-DB consistency checks.
 * Must reject anything but a single SELECT. Pick the variant for the project's database:
 *
 *   SQLite (better-sqlite3):
 *     const db = new Database(process.env.UITEST_DB!, { readonly: true, fileMustExist: true });
 *     return db.prepare(sql).all(...params);
 *
 *   PostgreSQL (pg):
 *     const client = new Client({ connectionString: process.env.UITEST_DB });
 *     await client.connect(); await client.query('BEGIN READ ONLY');
 *     try { return (await client.query(sql, params)).rows; } finally { await client.query('ROLLBACK'); await client.end(); }
 */
export async function dbQuery(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  if (!/^\s*select\b/i.test(sql) || sql.includes(';')) throw new Error('uitest: dbQuery accepts a single SELECT only');
  // TODO: database-specific read-only implementation (see above).
  throw new Error('uitest: dbQuery not implemented');
}
