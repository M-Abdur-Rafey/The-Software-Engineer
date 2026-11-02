# Third-party notices

This project adapts work from the following projects.

## ponytail

The ponytail agent (`agents/ponytail/`, `.claude/workflows/ponytail.js`) is vendored from [ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert, under the MIT License.

## Harness²

The lesson library (`shared/lib/lessons.js`, `.claude/workflows/curate.js`, the evidence guard in the workflow prompts, and the offline tuning loop in `tests/ab/tune.mjs` and `tests/ab/tune-propose.js`) adapts ideas, the `EXPERIENCE.md` lesson format and prompt wording from [Harness²: Recursive Agent Harnessing for an Open World](https://arxiv.org/abs/2610.14224) ([google-research/harness2](https://github.com/google-research/harness2), `core/prompts.py` and `core/library.py`).

Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0 (the "License"); you may not use those files except in compliance with the License. You may obtain a copy of the License at https://www.apache.org/licenses/LICENSE-2.0. Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

The adapted text was modified: it judges lessons recorded from this pipeline's own reviewer, bridge and scan results, rather than candidate harness edits.

## UI Style Guide

The UI style catalog (`agents/frontend/vault/design-system/ui-style-guide.md` and `ui-style-prompts.md`) reproduces data and the AI prompts for 67 UI styles from [UI Style Guide](https://www.uistyleguide.com), collected on 2026-11-02 from each style's page (`https://www.uistyleguide.com/style/<slug>`). The style names, descriptions, palettes, lists and prompts belong to that site and its authors. The site does not state a license that this project has verified: check its terms before redistributing, and remove those two files if the owner objects. The goal tables and the selection guidance in the guide are this project's own.
