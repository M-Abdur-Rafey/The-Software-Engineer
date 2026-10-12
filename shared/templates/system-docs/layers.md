---
status: draft
approved_by:
approved_at:
---

# Build layers

Modules are built one layer at a time, foundation first, so each layer can call real, tested functions from the layers below. Inside a layer: database, then backend, then frontend and tests. Modules in the same layer build in parallel, so they must not depend on each other. Approve this plan before building starts.

| Layer | Name | Modules | Why this order |
|---|---|---|---|
| 1 | Foundation | | Config, DB connection, app shell: everything else needs these |
| 2 | Authentication | | Users and login, needed before anything is per-user |
| 3 | Core data | | Create/read/update/delete for the main records |
| 4 | Access control | | Roles and permissions on top of working features |
