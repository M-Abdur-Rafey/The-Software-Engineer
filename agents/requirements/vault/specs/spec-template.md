# Specification Template

Spec-driven development: the intent behind a task is turned into a specification a model
can read and follow, BEFORE any domain agent writes code. Big ambiguous asks
("build me an e-commerce platform") are full of unstated decisions — payments, auth,
shipping. The spec surfaces those decisions explicitly so they are made once, up front,
not improvised mid-generation across thousands of unread lines.

## Required sections
```markdown
# Spec: <feature name>

## Summary
One paragraph: what we are building and why.

## In scope
- Bullet list of concrete capabilities this session WILL deliver.

## Out of scope
- Explicitly excluded items (prevents scope creep inside code generation).

## Decisions
| Topic | Decision | Rationale |
|-------|----------|-----------|
| e.g. auth | JWT bearer | matches existing backend middleware |

## Open questions
- Anything that could not be decided from available signals. These go back to the
  user — never silently guessed at inside a domain agent.

## User stories
See linked story files.
```

## Rules
- Every decision that a domain agent would otherwise have to guess MUST appear in
  the Decisions table.
- Keep tasks small and well-defined — one story maps to a handful of routes/components,
  never "the whole system".
- Out-of-scope is as important as in-scope.
