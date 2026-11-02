'use strict';
/**
 * Makes the workflow scripts loadable from any project (no model calls).
 *
 * The Workflow tool only accepts a scriptPath it can read, and a session that was opened in some project cannot read files
 * in the engine's own folder (~/.agents, ~/.software-engineer, a plugin cache). So the skill copies the scripts once into a
 * folder the session can read (its scratchpad) with this, then launches them from there and passes that folder to
 * orchestrate.js as `workflowsDir`, which it uses for the sub-workflows it starts.
 *
 * Usage:
 *   node shared/lib/stage-workflows.js <destination folder>
 *
 * Creates <destination>/software-engineer-workflows/ (replacing an older copy) and prints { dir, files } as JSON.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', '.claude', 'workflows');
const NAME = 'software-engineer-workflows';
const CR = String.fromCharCode(13);

/** Copies every workflow script, with plain LF line endings (a carriage return makes a script un-launchable). */
function stage(destination, src = SRC) {
  if (!destination) throw new Error('usage: stage-workflows.js <destination folder>');
  const dir = path.join(path.resolve(destination), NAME);
  const scripts = fs.readdirSync(src).filter((f) => f.endsWith('.js'));
  if (!scripts.length) throw new Error(`no workflow scripts found in ${src}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const f of scripts) {
    fs.writeFileSync(path.join(dir, f), fs.readFileSync(path.join(src, f), 'utf8').split(CR + '\n').join('\n'));
  }
  return { dir: dir.split(path.sep).join('/'), files: scripts.length };
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(stage(process.argv[2])));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

module.exports = { stage };
