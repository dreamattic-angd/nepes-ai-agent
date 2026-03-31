# HANDOFF Document Template

Write the handoff document in the format below. Each section must be filled with the actual work content from the current session.

---

```markdown
# HANDOFF - Work Handoff

**Written**: {YYYY-MM-DD HH:mm}
**Project**: {project name}
**Trigger**: {Manual | Context Monitor (N tool calls) | Post-Compact}

## Goal
Describe the final goal of the work currently being performed.

## Progress
- [x] Completed task items
- [ ] Incomplete task items

## Successful Approaches
Record effective methods, discovered patterns, and useful commands.
(Prevents wasted time in the next session)

## Failed Approaches
Record what was tried but failed, and what to avoid.
(To prevent repeating the same mistakes)

## Key Context
Information the next session must know:
- Related file paths
- Important variables / configuration values
- Discovered issues

## Next Steps
List specific next actions in priority order:
1. {First thing to do}
2. {Second thing to do}
```

## Writing Principles

1. **Specificity**: instead of "modified code", write "added null check to parseConfig method at src/Main.java:145"
2. **Reproducibility**: the next session must be able to restore the same working environment
3. **Failures first**: failed approaches are more valuable than successes (saves time)
4. **File paths required**: include absolute paths for relevant files in the key context
5. **Post-Compact**: add `[possibly lost in compact]` tag to uncertain information
