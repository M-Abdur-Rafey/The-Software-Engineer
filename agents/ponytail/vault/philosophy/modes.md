# Intensity Modes

The agent runs at one of three intensities (passed in as `mode`):

| Mode | Behavior |
|------|----------|
| **lite** | Build as asked. Suggest a lazier alternative, but do **not** edit files. |
| **full** (default) | Enforce the decision ladder. Apply behavior-preserving simplifications. Shortest explanation. |
| **ultra** | YAGNI extremist. Challenge the requirement itself — question whether the code should exist at all. |

Whatever the mode, only **explain what was skipped and when to add it back** — keep the
narration short. The output of a review is fewer lines, not more words.
