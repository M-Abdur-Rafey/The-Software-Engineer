# Security Scan Checklist

Runs before every commit, on the lines the session adds. Implemented exactly by `shared/lib/scan.js` (deterministic, no model, no override): change the script and its tests in `tests/scan.test.js` together with this table. Example env files (`.env.example` etc.), placeholder values and environment-variable reads are not treated as secrets; test and documentation files are exempt from the localhost check.

| Severity | Check | Pattern |
|----------|-------|---------|
| blocking | No .env files staged | filename: `.env`, `.env.*` |
| blocking | No hardcoded secrets | `API_KEY=`, `SECRET=`, `PASSWORD=`, `PRIVATE_KEY=` |
| blocking | No raw bearer tokens in source | `Bearer [A-Za-z0-9._-]{20,}` |
| blocking | No localhost URLs in non-test files | `localhost`, `127\.0\.0\.1` |
| blocking | No Authorization header from localStorage | `localStorage.*Authorization`, `Authorization.*localStorage` |
| blocking | No database credentials in .js/.json | `DB_PASSWORD`, `DATABASE_URL.*password` |
| blocking | CSP headers defined if frontend files changed | Check backend headers middleware |
| warning | No console.log in production paths | `console\.log` outside test files |
| warning | No commented-out credential strings | `//.*password`, `//.*secret` |
| info | All new files have README or JSDoc | Check for new files missing header |
