---
description: "Generates a session handoff document. Saves current work state as HANDOFF.md for the next session when context is saturated or upon request."
---

# Session Handoff (Manual Trigger)

Invoke the session-handoff skill via **Manual Trigger** path.

Read `~/.claude/skills/session-handoff/SKILL.md` using the Read tool, then execute the **Manual Trigger** branch of the skill's Execution Procedure.

Input (optional): $ARGUMENTS
- If provided, treat as additional context/notes to include in the handoff document.
- If empty, infer the current work state from the conversation history.

## Execution

Follow the steps in `~/.claude/skills/session-handoff/SKILL.md`:

1. **Step 1**: Check for existing `HANDOFF.md` in the project root and read it if present.
2. **Step 2**: Read `~/.claude/skills/session-handoff/references/template.md` and write the handoff document.
   - Filename: `HANDOFF_{YYYYMMDD_HHmm}.md`
   - Also save a copy as `HANDOFF.md`
3. **Step 3**: Reset the context monitor state.
4. **Step 4**: Notify the user using the **Manual trigger** format.

## Usage Examples

```
/session-handoff
/session-handoff ITSM-1234 로그인 기능 구현 중단점
```