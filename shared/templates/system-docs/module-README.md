---
module: {{module}}
layer: {{layer}}
status: draft
owner: {{owner}}
approved_by:
approved_at:
synced_at:
# Files or directories this module owns, e.g. src/routes/auth.js or src/features/auth/
paths: []
# Touchpoints other modules may depend on. Kinds: api:METHOD /path, fn:name,
# table:name or table:name.column, config:KEY, event:name, ui:Component.
# A consumer may use a sub-field: api:GET /api/users/:id#email
provides: []
# One entry per module this one uses, e.g.
#   - module: foundation
#     uses: [fn:db.pool, config:DATABASE_URL]
depends_on: []
---

# {{module}}

## What it does

**Plain language:** _Who uses this and what it lets them do, in one or two sentences a non-developer understands._

**Technical:** _Responsibilities, main entry points, key rules._

## Flows

_One file per flow in `flows/`, created with `sysdocs.js add-flow`. List them here._

## APIs

_For each endpoint: method and path, auth, a request example, a response example, and errors._

## Data

_For each piece of data: where it comes from (DB table, third-party API, user input), the stored format with a real example record, and how it is created, edited and deleted._

## Depends on / Used by

_Declared in the frontmatter (`depends_on`, `provides`). "Used by" is generated: see [dependencies](../../dependencies.md)._

## Decisions

_Answered questions from [questions.md](questions.md) that shape this module, one line each with the question id._
