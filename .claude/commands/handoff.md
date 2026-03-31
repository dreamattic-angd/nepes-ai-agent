# Task Handoff Document (HANDOFF)

Documents the current task state before context saturation to hand off to the next session.

## Execution Procedure

### Step 1: Check for Existing HANDOFF.md

If `HANDOFF.md` already exists in the project root, read it to understand the previous handoff content.

### Step 2: Write Handoff Document

Write the handoff document to the project root in the following format.

**Filename convention**: `HANDOFF_{YYYYMMDD_HHmm}.md` (timestamp-based)
- Coexists with previous handoff files to preserve history
- Also copy the latest handoff file as `HANDOFF.md` (for compatibility)

```markdown
# HANDOFF - Task Handoff

**Created**: {YYYY-MM-DD HH:mm}
**Project**: {project name}

## Goal
Describe the final goal of the task currently in progress.

## Progress
- [x] Completed task items
- [ ] Incomplete task items

## Successful Approaches
Record effective methods, discovered patterns, useful commands, etc.
(Prevents wasting time in the next session)

## Failed Approaches
Record things tried but failed, things to avoid.
(To prevent repeating the same mistakes)

## Key Context
Information the next session must know:
- Relevant file paths
- Important variables/configuration values
- Discovered issues

## Next Steps
List specific next actions in priority order:
1. {first thing to do}
2. {second thing to do}
```

### Step 3: Notify User

After the document is written, output the following message:

```
✅ HANDOFF_{timestamp}.md has been saved.
   The latest copy has also been saved as HANDOFF.md.

To continue work in the next session:
1. Enter /clear to reset the context
2. Enter "Read HANDOFF.md and continue"

Previous handoff history: ls HANDOFF_*.md
```

## Notes

- HANDOFF*.md files are **temporary working files** (register `HANDOFF*.md` in `.gitignore`)
- May be deleted after work is complete if no longer needed
- Previous handoff history is automatically preserved through timestamp-based filenames
- `HANDOFF.md` is always a copy of the most recent handoff
