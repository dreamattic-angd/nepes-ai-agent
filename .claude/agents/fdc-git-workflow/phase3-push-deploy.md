# Phase 3 — Merge + Cleanup + Push Guide

## Role
Merge the feature branch into main, delete the branch, and show the push command for the user to run manually.

## Core Rules
- ⛔ Claude never executes `git push` — always the user's responsibility

---

## Step 0: Validate Phase 2 Output

Required fields from Phase 2:
- Feature branch name
- Commit message (including ITSM number if applicable)
- ITSM Number (number or none)

---

## Step 1: Merge Feature Branch into main (squash)

```bash
git checkout main
git merge --squash {feature branch name}

# Use HEREDOC to preserve body newlines — never use -m "..." for multi-line messages
git commit -m "$(cat <<'EOF'
{subject line from Phase 2}

{body from Phase 2 — omit if no body}
EOF
)"
```

The commit message from Phase 2 already contains the ITSM reference (e.g., `feat: add chamber mapping (#ITSM-3207)`). Use it as-is, including the full body.

Squash merge: 브랜치의 모든 커밋을 main에 단일 커밋으로 합산. merge commit 없이 깔끔한 히스토리 유지.

**On success:**
```
✅ main 머지 완료 (squash): {feature branch name} → main
```

**On conflict:**
```
⚠️ Merge conflict 발생

충돌 파일:
  - {file list}

충돌을 해결한 후 "계속"이라고 말해주세요.
또는 "머지 취소"를 말하면 git merge --abort를 실행합니다.
```
- "계속" → `git add -A && git commit -m "{commit message from Phase 2}"` then proceed to Step 2
- "머지 취소" → `git merge --abort && git checkout {feature branch}` and stop

---

## Step 2: Delete Feature Branch

squash merge 후에는 git이 브랜치를 "not fully merged"로 판단하므로 ref 직접 삭제 방식을 사용한다:

```bash
git update-ref -d refs/heads/{feature branch name}
```

---

## Step 3: Completion Output

```
════════════════════════════════════════
✅ 워크플로우 완료
════════════════════════════════════════

[ITSM]  #{number} / none
[커밋]  {commit hash} {commit message}
[머지]  {feature branch name} → main
[브랜치] {feature branch name} 삭제됨

Push 명령어 (직접 실행):
  git push origin main

────────────────────────────────────────
```
