# Third-party notices

This project adapts work from the following projects.

## ponytail

The ponytail agent (`agents/ponytail/`, `.claude/workflows/ponytail.js`) is vendored from [ponytail](https://github.com/DietrichGebert/ponytail) by Dietrich Gebert, under the MIT License.

## Harness²

The lesson library (`shared/lib/lessons.js`, `.claude/workflows/curate.js`, the evidence guard in the workflow prompts, and the offline tuning loop in `tests/ab/tune.mjs` and `tests/ab/tune-propose.js`) adapts ideas, the `EXPERIENCE.md` lesson format and prompt wording from [Harness²: Recursive Agent Harnessing for an Open World](https://arxiv.org/abs/2610.14224) ([google-research/harness2](https://github.com/google-research/harness2), `core/prompts.py` and `core/library.py`).

Copyright 2026 Google LLC. Licensed under the Apache License, Version 2.0 (the "License"); you may not use those files except in compliance with the License. You may obtain a copy of the License at https://www.apache.org/licenses/LICENSE-2.0. Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

The adapted text was modified: it judges lessons recorded from this pipeline's own reviewer, bridge and scan results, rather than candidate harness edits.

## UI Style Guide

The UI style catalog (`agents/frontend/vault/design-system/ui-style-guide.md` and `ui-style-prompts.md`) reproduces data and the AI prompts for 67 UI styles from [UI Style Guide](https://www.uistyleguide.com) by Farad Labs, collected on 2026-11-02 from each style's page (`https://www.uistyleguide.com/style/<slug>`).

The site states no license of its own (no terms page, no copyright notice, no statement about reuse); it calls itself a free reference. Its footer says: "Style definitions adapted from [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT)." The upstream project's license, copied from its repository (`LICENSE`, checked 2026-11-02), is:

> MIT License
>
> Copyright (c) 2024 Next Level Builder
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

What that covers is only the style definitions the site took from that project. The site's own wording of the prompts, its CSS and its page content are Farad Labs' work, with no license stated, so they are reproduced here on the basis of the site presenting them as a free reference for pasting into coding agents. If the owner objects, remove the two files. The goal tables and the selection guidance in the guide are this project's own.
