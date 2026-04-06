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

## Usage Examples

```
/code-review              # Full review (Full mode)
/code-review quick        # Quick review (Critical only)
/code-review deep         # Deep review (Sequential Thinking based)
/code-review src/Main.java # Review specific file
```