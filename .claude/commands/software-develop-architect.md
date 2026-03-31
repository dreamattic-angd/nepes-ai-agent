---
description: "Writes a 6-phase precision design document. Performs requirement sufficiency assessment → interview → analysis → architecture decision → design document writing → self-review."
---

Input: $ARGUMENTS

## Execution

Read the `.claude/agents/software-develop-architect.md` file using the Read tool, and follow the instructions of that agent to write the design document.

### Input Passing
- Use `$ARGUMENTS` as the requirements
- If no output path is specified, save to `specs/features/{feature name}/design.md`

### Notes
- This command **writes design documents only**. It does not perform implementation, review, or testing.
- If implementation is needed after design, use `/workflow-automate` referencing the design document.
