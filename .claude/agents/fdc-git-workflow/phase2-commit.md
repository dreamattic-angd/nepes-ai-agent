# Phase 2 — Commit

## Role
Generate the commit message, stage changed files, and create the commit.

## Safety Gates
- ⛔ Validate Phase 1 output before proceeding
- ⛔ Never modify VERSION file
- ⛔ Never run `git push` — user does this manually

---

## Step 0: Validate Phase 1 Output

Required fields from Phase 1:
- Commit Type (one of: feat/fix/docs/dispatch/chore/ui/perf/refactor/wip)
- ITSM Number (number or none)
- Changed Files (at least 1)
- Test Result (passed / skipped)

If any field is missing, stop and instruct user to restart from Phase 1:
```
⚠️ Phase 1 데이터가 불완전합니다. /fdc-git-workflow를 처음부터 다시 실행해주세요.
```

---

## Step 1: Generate Commit Message

Use the commit type and changed files from Phase 1 to generate the message.

**Message format:**
```
{type}: {description} (#ITSM-{number})

{body — always required for all types}
```

If `ITSM_NUMBER` is `none`, omit the ITSM reference:
```
{type}: {description}
```

**Generation rules:**
- English only, all lowercase (except proper nouns, file names, error messages)
- Present tense, imperative mood ("add", "fix", "update" — not "added", "fixing")
- Be specific: mention what changed and where
- Use ` + ` to join multiple related changes: `feat: A + B`
- Use ` — ` (space + em dash + space) for additional context
- ITSM reference always goes at the end of the subject line: `feat: ... (#ITSM-3207)`
- Subject line: keep under 72 characters

**Body (always required for all types):**

The body explains *why* the change was made and *how* it works. Include:
- Root cause of the bug (for `fix`) or motivation for the change (for all types)
- What the old behavior was vs. the new behavior
- Key implementation decisions and alternatives considered
- Impact or affected scope (which files, functions, services)
- Leave one blank line between subject and body

Example:
```
fix: update watermark per-batch in extract_date (H-26)

Root cause: watermark was updated once after the full blob loop, so a
mid-loop exception left watermark behind the actual DB state. On restart,
already-committed blobs were re-fetched → duplicate rows in TimescaleDB.

Fix: call update_watermark() immediately after each successful insert_rows()
so the watermark always reflects committed state. Crash exposure bounded to
at most one batch_size of blobs instead of the entire date's worth.
```

**Type-specific guidance:**

| type | Focus of description |
|------|----------------------|
| feat | What capability was added and where |
| fix | What was broken and how it was fixed |
| docs | Which documents were updated and why |
| dispatch | Which study/task phase was completed or started |
| chore | What was configured or updated |
| ui | Which component and what visual change |
| perf | What was optimized and the mechanism |
| refactor | What was restructured without behavior change |
| wip | What is in progress (mark clearly as incomplete) |

**Self-check before proceeding:**
- [ ] Format is `{type}: {description}` with no capital letters in description
- [ ] Type is one of the valid 9 types
- [ ] Description is specific (not generic like "update code" or "fix bug")
- [ ] Subject line is under 72 characters
- [ ] ITSM number present → subject ends with `(#ITSM-{number})`; ITSM_NUMBER=none → no ITSM reference
- [ ] Body is present for all types (explains motivation + impact)

---

## Step 2: Stage + Commit

Execute immediately without further user confirmation:

```bash
# Stage all changed files
git add -A

# Commit with generated message — use HEREDOC to preserve body newlines
git commit -m "$(cat <<'EOF'
{subject line}

{body — blank line between subject and body}
EOF
)"
```

**Multi-line message rule:** Always use HEREDOC (`$(cat <<'EOF' ... EOF)`) when the commit message includes a body. Never pass a multi-line message with `-m "..."` directly — shell escaping will collapse newlines and lose the body.

**If commit fails due to pre-commit hook:**
1. Show the hook output
2. Fix the issue if it is automatically fixable (lint, formatting)
3. Retry once
4. If still failing → show error and stop:
   ```
   ❌ Pre-commit hook 실패:
   {hook output}

   문제를 수정한 후 다시 실행해주세요.
   ```

**If nothing to commit:**
```
⚠️ 스테이징할 변경 사항이 없습니다. Phase 1 분석과 실제 상태가 다릅니다.
git status를 확인하고 다시 시도해주세요.
```
→ Stop workflow.

---

## Step 3: Commit Complete Output

```
✅ 커밋 완료

Hash   : {first 7 chars of commit hash}
Message: {commit message}

다음 단계로 진행합니다 (main 머지 + 브랜치 정리).
```
