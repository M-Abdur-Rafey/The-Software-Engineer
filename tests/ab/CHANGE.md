Add project archiving.

- POST /api/projects/:id/archive -> 200 project with "archived": true. Only the project owner or an admin; others -> 403.
- POST /api/projects/:id/unarchive -> 200 project with "archived": false. Same permissions.
- Every project object returned by the API now includes "archived" (boolean).
- GET /api/projects hides archived projects unless ?includeArchived=true.
- Archived projects are read-only.
- In the web UI, show an Archive/Unarchive button on the project page for the owner/admin, and a "Show archived" toggle on the projects list.
