# Phase 1 — Change Analysis

## Role
Verify the working state, classify the commit type, auto-create branch if needed, run tests if required, and get user confirmation before committing.

## Safety Gates (never skip)
- ⛔ Stop immediately if there are no changes
- ⛔ Stop immediately if tests fail (for `feat`/`fix` types)
- ⛔ Always wait for user confirmation (Y) after displaying the change summary

---

## Step 1: Check Changed Files

```bash
git status
```

If there are no changes → output the following and **stop immediately**:
```
변경된 파일이 없습니다. 워크플로우를 종료합니다.
```

---

## Step 2: Classify Commit Type

Analyze the changed files and their content to determine the commit type.

**Primary classification rules (apply in order):**

| Condition | type |
|-----------|------|
| Files in `.dispatch/` only, or task status/planning notes | dispatch |
| New API endpoint, new page, new component, new feature | feat |
| Error fix, incorrect behavior corrected | fix |
| README.org, docs/, CLAUDE.md, changelog only | docs |
| package.json, next.config.ts, tsconfig, vitest.config, .gitignore, test counts | chore |
| CSS, Tailwind classes, layout-only changes | ui |
| Performance optimization (query, caching, rendering) | perf |
| Code restructuring with no behavior change | refactor |

**When uncertain:** default to `feat` for additions, `fix` for corrections.

---

## Step 3: Check Current Branch + Auto-create if Needed

```bash
git branch --show-current
```

If on a **feature branch** → proceed normally.

If on **`main`** → auto-create a feature branch based on the commit type determined in Step 2:

```bash
# Branch naming rule: {type}/{brief-slug-from-changed-files}
# Examples:
#   fix/api-exception-lock
#   feat/chamber-mapping
#   docs/readme-update

git checkout -b {type}/{slug}
```

**Slug generation rule:** derive a short (2–4 word) kebab-case slug from the most significant changed file or the nature of the changes. Do not ask the user — generate automatically.

Output after branch creation:
```
🌿 feature 브랜치 자동 생성: {branch name}
```

---

## Step 4: Run Tests (Conditional)

**Run only for `feat` and `fix` commit types. Skip all other types.**

### 4-A. Determine Which Tests to Run

| Changed file pattern | Test to run |
|---------------------|------------|
| `tooling/` or `app/api/` (Python/backend) | pytest |
| `app/`, `lib/`, `__tests__/` (frontend) | vitest |
| Both | pytest + vitest |
| `docs/`, `.dispatch/`, config only | Skip tests |

### 4-B. Run Tests

**pytest (if applicable):**
```bash
cd {project_root}/tooling && uv run --project extractor pytest -x -q --ignore=extractor/tests/test_config.py
```

**vitest (if applicable):**
```bash
cd {project_root} && npx vitest run
```

Replace `{project_root}` with the actual project directory.

### 4-C. Handle Test Results

**All tests pass:**
```
✅ Tests passed — proceeding to commit.
```

**Any test fails:**
```
❌ 테스트 실패 — 커밋을 중단합니다.

{test output}

테스트를 수정한 후 다시 실행해주세요.
```
→ Stop workflow.

**Test command not found / environment error:**
```
⚠️ 테스트 실행 환경을 찾을 수 없습니다:
{error}

테스트를 건너뛰고 계속 진행하시겠습니까? (Y/N)
```
- Y → proceed
- N → stop workflow

---

## Step 5: Code Review (Conditional)

**Run only for `feat` and `fix` commit types. Skip all other types.**

Get the diff to review:
```bash
git diff
git diff --cached
```

Load and execute `.claude/agents/code-review/review-full.md` with the combined diff as input.

**Verdict handling:**

| Verdict | Condition | Action |
|---------|-----------|--------|
| ✅ PASS | 0 Critical, Warning ≤ 3 | Proceed |
| ⚠️ REVIEW_NEEDED | 0 Critical, Warning ≥ 4 | Ask user: proceed anyway? (Y/N) |
| ❌ REJECT | Critical ≥ 1 | Stop — list issues, request fixes |

**Skip message (for non-feat/fix):**
```
ℹ️ 코드 리뷰 생략 (commit type: {type})
```

---

## Step 5.5: ITSM 번호 확인

⛔ **이 단계에서 반드시 멈추고 사용자 응답을 기다린다.**

**A. 같은 대화에서 ITSM 등록이 이미 수행된 경우:**

등록 응답의 `requestId`를 제시하고 사용자 확인을 요청한다.

```
이전 ITSM 등록에서 #{requestId} 번호가 확인되었습니다.
이 번호를 사용하시겠습니까? (Y/직접 입력/n)
```

- **Y** → `ITSM_NUMBER={requestId}`
- **직접 입력** → `ITSM_NUMBER={입력값}`
- **"n"** → 아래 B 케이스의 "n" 처리와 동일

**B. 이전에 ITSM 등록이 수행되지 않은 경우:**

사용자에게 ITSM 번호 입력을 요청한다.

```
ITSM 번호를 입력해주세요:
  - 번호 입력 (예: 3207)
  - 없으면 "n" 입력
```

- **번호 입력** → `ITSM_NUMBER={입력값}`으로 설정
- **"n" 입력** → 아래 경고를 표시하고 최종 확인 요청:
  ```
  ⚠️ ITSM 번호 없이 진행하면 추적이 불가능합니다.
  ITSM 번호 없이 진행하시겠습니까? (Y/N)
  ```
  - Y → `ITSM_NUMBER=none` (커밋/머지 메시지에 ITSM 참조 생략)
  - N → 워크플로우 중단 (ITSM 등록 후 재실행)

---

## Step 6: Show Change Summary + Confirm

Display and wait for user response:

```
📋 변경 분석 결과

[commit type] {type}: {brief description of changes}
[ITSM]       #{number} / none
[이유]       {one line explaining the classification}

[변경 파일]
  Modified : {file list}
  Added    : {file list}
  Deleted  : {file list}

[테스트]     {passed / skipped / N/A}
[코드 리뷰]  {PASS / REVIEW_NEEDED / skipped}

계속 진행하시겠습니까? (Y/N)
```

⛔ Stop and wait for user response.

- **Y** → proceed to Phase 1 Output
- **N** → stop workflow

If the user disagrees with the commit type, update to the user's preference before outputting.

---

## Phase 1 Output (passed to Phase 2)

```
[CHANGE ANALYSIS]
Commit Type: {type}
ITSM Number: #ITSM-{number} / none
Changed Files: {file list}
Test Result: {passed / skipped}
Review Result: {PASS / REVIEW_NEEDED / skipped}
Suggested Description: {brief description in English}
```
