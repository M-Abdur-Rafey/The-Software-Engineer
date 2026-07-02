# Infrastructure-as-Code Review

When the session touched deployment artifacts (Dockerfile, compose, Kubernetes YAML,
Ansible, CI pipelines), verify:

- No secrets or credentials inline — env/secret references only.
- Images pinned to versions, not `latest`.
- Health checks / readiness probes declared.
- Resource limits set for containers.
- Migrations run before the service starts, never during requests.

Record each artifact in `iacArtifacts[]`. Do not create infrastructure the task didn't
ask for — report gaps as feedback instead.
