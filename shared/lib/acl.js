'use strict';
/**
 * Vault / knowledge service authorization.
 *
 * Policy: an agent may WRITE only its own knowledge, and READ its own plus the
 * upstream agents whose output it legitimately consumes (derived from the
 * pipeline contract flow). The orchestrator and onboard agents are privileged
 * provisioners and may touch any vault.
 *
 * IMPORTANT — this is a guardrail, not isolation. All agents share the
 * filesystem and call the same CLI, so a caller could spoof its `--as` identity.
 * This enforces the intended access policy and stops accidental/hallucinated
 * cross-agent writes; it is not OS-level multi-tenant security.
 */

const PRIVILEGED = new Set(['orchestrator', 'onboard']);

// Read scope per agent. '*' = may read any agent's knowledge.
const READ = {
  orchestrator: '*',
  onboard: '*',
  mcpbridge: '*',   // validates every domain's contracts
  gitdevops: '*',   // scans everything before committing
  database: ['database'],
  backend: ['backend', 'database'],
  frontend: ['frontend', 'backend'],
  testing: ['testing', 'backend'],
  calls: ['calls', 'backend', 'database'],
  ponytail: ['ponytail', 'backend', 'frontend', 'calls'],  // reviews the code these agents generate
};

function canWrite(caller, target) {
  if (!caller) return true;                 // no identity asserted → legacy allow
  if (PRIVILEGED.has(caller)) return true;
  return caller === target;                 // write own knowledge only
}

function canRead(caller, target) {
  if (!caller) return true;
  if (PRIVILEGED.has(caller)) return true;
  const scope = READ[caller];
  if (scope === '*') return true;
  return Array.isArray(scope) ? scope.includes(target) : caller === target;
}

function assertWrite(caller, target) {
  if (!canWrite(caller, target)) {
    throw new Error(`ACL: agent '${caller}' may not write to '${target}' (write own knowledge only)`);
  }
}

function assertRead(caller, target) {
  if (!canRead(caller, target)) {
    const allowed = READ[caller] || caller;
    throw new Error(`ACL: agent '${caller}' may not read '${target}' (allowed: ${JSON.stringify(allowed)})`);
  }
}

module.exports = { canWrite, canRead, assertWrite, assertRead, READ, PRIVILEGED };
