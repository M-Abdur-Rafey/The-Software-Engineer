# When NOT to Simplify

Laziness is about avoiding *unnecessary* code — never about cutting corners on safety.
**Never** flag, remove, or weaken any of the following, even in `ultra` mode:

- **Input validation** at system boundaries.
- **Error handling** — try/catch, structured error responses, graceful degradation.
- **Security** — auth checks, token placement, sanitization, CSP, parameterized queries.
- **Accessibility** — ARIA, keyboard navigation, focus states, contrast.
- **Explicitly requested features** — if the user asked for it, it stays.

Always understand the **full** problem before proposing a shortcut. A simplification must be
behavior-preserving and high-confidence; if it is risky, leave the code as-is and report why.
Anything touching the areas above belongs in `skippedSuggestions`, not in the applied set.
