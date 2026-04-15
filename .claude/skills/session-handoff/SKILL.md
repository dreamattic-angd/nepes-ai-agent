---
name: session-handoff
description: Automatically generates session handoff documents. Documents the current work state as HANDOFF.md for handoff to the next session when context is saturated, when a compact occurs, or upon user request. Triggered when the user requests "handoff", "next session", "pass work", "save progress", "wrap up session", "clean up context", "save work", "finish session", or similar.
---

# Session Handoff Skill

Documents the current session's work state and hands it off to the next session.

## Trigger Branches

This skill is activated via three paths:

### 1. Manual Trigger (User Request)
When the user requests "create a handoff", "handoff", "pass the work", etc.
→ Write the handoff document in conversation with the user.

### 2. Context Monitor Trigger (Hook Warning)
When a `[CONTEXT MONITOR - CRITICAL]` message is detected.
→ Notify the user of the context saturation situation and automatically write the handoff document.
→ Finish the current in-progress work at the safest possible stopping point before handing off.

### 3. Post-Compact Trigger (Notification Hook)
When a `[POST-COMPACT]` message is detected.
→ Restore as much context lost from the compact as possible and write the handoff document.
→ Write using only information remembered after the compact; mark uncertain parts with `[possibly lost in compact]`.

## Execution Procedure

### Step 1: Check for Existing HANDOFF.md

If `HANDOFF.md` already exists at the project root, read it to understand the previous handoff content.

### Step 2: Write the Handoff Document

Read `references/template.md` and write the handoff document according to that template.

```
Reference file: ~/.claude/skills/session-handoff/references/template.md
```

**Filename rule**: `HANDOFF_{YYYYMMDD_HHmm}.md` (timestamp-based)
- Coexists with previous handoff files to preserve history
- Also copy the latest handoff file as `HANDOFF.md` (for compatibility)

### Step 3: Reset Context Monitor State

After the handoff document is written, reset the context monitor state:

```bash
rm -f "$USERPROFILE/.claude/state/context-monitor.json" 2>/dev/null || rm -f "$HOME/.claude/state/context-monitor.json" 2>/dev/null
```

(Resets the counter for cases where the session continues after handoff)

### Step 4: Notify the User

Notification differs by trigger type:

**Manual trigger**:
```
HANDOFF_{timestamp}.md has been saved.
The latest copy has also been saved as HANDOFF.md.

To continue work in the next session:
1. Enter /clear to reset the context
2. Enter "Read HANDOFF.md and continue"

Previous handoff history: ls HANDOFF_*.md
```

**Hook trigger** (Context Monitor or Post-Compact):
```
[Auto Handoff] HANDOFF_{timestamp}.md has been saved.

Context is saturated/compacted. The following actions are recommended:
1. Enter /clear to reset the context
2. Enter "Read HANDOFF.md and continue"
```

## Uncertainty Handling

- 트리거 유형 판별 불가 시: Manual Trigger 분기로 fallback하여 진행한다.
- `references/template.md` 읽기 실패 시: 기본 형식(작업 요약/중단점/다음 단계)으로 핸드오프 문서를 작성한다.
- 현재 작업 상태 추론 불가 시: 대화 히스토리에서 최근 파일 변경/명령 실행 기록을 기준으로 작성하고, 불확실한 항목에 `[possibly lost in compact]` 표시를 붙인다.

## Notes

- HANDOFF*.md files are **temporary work files** (register `HANDOFF*.md` in `.gitignore`)
- They can be deleted after work is complete if no longer needed
- Timestamp-based filenames automatically preserve previous handoff history
- `HANDOFF.md` is always a copy of the most recent handoff