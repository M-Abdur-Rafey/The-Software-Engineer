# Outcome Metrics — measure outcomes, not lines of code

Lines of code generated is NOT a success metric. Per session, report:

| Metric | Source |
|--------|--------|
| filesChangedCount | union of all domain `filesChanged[]` |
| routesAdded | `BackendOutput.routes[]` length |
| testCoveragePercent | `TestingOutput.coverage.percentCovered` |
| contractViolations | `MCPBridgeOutput.contractValidation.violations[]` length |
| securityBlocks | gitdevops `blockedBy[]` length |
| simplificationsApplied | `PonytailOutput.metrics.simplificationsApplied` |

Trends across sessions (query the decisions table) matter more than any single value:
are contract violations going down? Is coverage staying at 100%? Is ponytail finding
less over-engineering over time?
