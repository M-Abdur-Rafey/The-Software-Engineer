// Copied into <project>/tests/ui/ by the uitest workflow. Run from the project root:
//   npx playwright test -c tests/ui/playwright.config.ts [specs...]
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  // Half the CPU cores, capped at 8 (set by the uitest workflow); override with UITEST_WORKERS.
  workers: Number(process.env.UITEST_WORKERS) || undefined,
  fullyParallel: true,
  retries: 0,                       // failures go to triage, which tells flaky from real
  timeout: 30_000,
  reporter: [['json', { outputFile: '.results/results.json' }], ['list']],
  outputDir: '.results/artifacts',  // git-ignored: traces, screenshots
  use: {
    baseURL: process.env.UITEST_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
