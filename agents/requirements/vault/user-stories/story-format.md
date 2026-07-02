# User Story Format

```markdown
## <STORY-ID>: <title>
**As a** <role>
**I want** <capability>
**So that** <benefit>

### Acceptance criteria
- [ ] Given <context>, when <action>, then <observable outcome>
- [ ] ...

**Priority:** must | should | could
```

## Rules
- Acceptance criteria must be testable — the testing agent generates test cases and
  test data directly from them.
- Each criterion is a Given/When/Then with an observable outcome (a status code, a
  visible UI state, a row in a table) — never "works correctly".
- A story too big to describe in 5 criteria gets split.
