# Code Review

Runs a code review. Analyzes only changed code and reviews it from the perspectives of quality, logic, security, and performance.

## User Input
$ARGUMENTS

## Execution Procedure

### Step 1: Determine Review Mode

Determine the review mode based on user input:
- `quick`, `fast`, `simple` → Quick mode (`.claude/agents/code-review/review-quick.md`)
- `deep`, `thorough`, `architecture` → Deep mode (`.claude/agents/code-review/review-deep.md`)
- Other → Full mode (`.claude/agents/code-review/review-full.md`)

**Automatic Full → Deep upgrade conditions** (auto-upgrade without explicit instruction):
- 8 or more changed files
- Simultaneous changes across 3 or more layers: Controller / Service / Repository

### Step 1.5: Language Detection and Routing

1. Use subagent language-router to detect language at [project_path] on base branch [base_branch]
2. Parse the `[LANGUAGE_DETECTION]` block from the result
3. Select the reviewer agent based on `route_to`:
   - `java-code-reviewer` → proceed with java-code-reviewer for Step 2 onward
   - `js-code-reviewer` → proceed with js-code-reviewer for Step 2 onward
   - `both` → invoke java-code-reviewer and js-code-reviewer in parallel; merge results before Step 4
   - `code-reviewer` → proceed with existing generic code-reviewer (no change)
4. If language-router fails: fall back to code-reviewer, add note `[Language detection failed — generic review applied]` to report header

Log the detected language and selected agent in the review report header.

### Step 2: Load Guidelines

Read the guidelines file for the selected mode and proceed accordingly.

### Step 3: Execute Review

Perform the review according to the guidelines:
1. Determine base-branch (use develop if present, otherwise main)
2. Collect changes with `git diff {base-branch}`
3. Review from 4 perspectives (Full) or scan Critical only (Quick)
4. Issue verdict and generate report

### Step 4: Save Results

Save review results to `.claude/agents/code-review/reviews/YYYYMMDD_HHMMSS.log`.

### Step 5: Judge Evaluation

After code-reviewer completes and saves review.md:

Use subagent code-review-judge to evaluate [review.md가 저장된 경로]

Judge 완료 후 결과를 사용자에게 출력:
- action이 AUTO_APPROVED: `✅ Judge 자동 승인 (score: N) — {reason}`
- action이 NEEDS_REVIEW: `⚠️ Judge 검토 필요 (score: N) — {reason}`

## Usage Examples

```
/code-review              # Full review (Full mode)
/code-review quick        # Quick review (Critical only)
/code-review deep         # Deep review (Sequential Thinking based)
/code-review src/Main.java # Review specific file
```