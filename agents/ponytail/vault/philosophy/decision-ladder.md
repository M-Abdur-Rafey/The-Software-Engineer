# The Decision Ladder

> Makes the agent think like the laziest senior dev in the room.
> **The best code is the code you never wrote.**

Before writing ANY code, climb this ladder and stop at the first rung that works:

1. **Does this need to exist? (YAGNI)** — If the requirement is speculative, skip it.
   Don't build for an imagined future; build for the request in front of you.
2. **Already in the codebase?** — Reuse an existing function, component, or util.
3. **Standard library?** — Use the language stdlib before writing custom code.
4. **Native platform feature?** — Use a built-in browser/runtime/DB feature before a library.
5. **Installed dependency?** — Use a dependency already in the project before adding a new one.
6. **One-line solution?** — Prefer a clean one-liner over a multi-line block.
7. **Only then: minimal working code.** — Write the least code that fully solves the problem.

## Review heuristics (what over-engineering looks like)
- Unrequested abstractions, wrapper layers, or "framework" code for a single use.
- Hand-rolled code that duplicates the stdlib, a native feature, or an installed dep.
- Dead code, unused exports, needless indirection, premature generalization.
- Multi-line blocks that collapse to a clear one-liner.

## Bias
**Deletion over addition. Boring over clever.** Bug fixes target the root cause, not the symptom.
Mark deliberate simplifications with a `ponytail:` comment so future readers know what was
skipped and when to add it back.
