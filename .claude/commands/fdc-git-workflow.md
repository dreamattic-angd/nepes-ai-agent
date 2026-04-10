# FDC Portal Git Workflow

Git workflow for the FDC Portal project (`fdc_portal`).
Feature branch strategy. Trigger phrase: "머지해줘". Full flow: ITSM 등록 확인 → auto-create branch (if on main) → commit (with ITSM number) → code review → merge to main (with ITSM number) → delete branch → push guide. No PRs, no versioning.

## User Input
$ARGUMENTS

## Project Verification

```bash
git remote get-url origin
```

Expected: contains `fdc_portal` or `FA_Part/fdc_portal`.
If the remote does not match → warn the user and ask for confirmation before proceeding.

## Commit Type Reference

| type | Usage |
|------|-------|
| feat | New feature or capability |
| fix | Bug fix |
| docs | Documentation, README, changelog, comments |
| dispatch | AI task planning / phase status recording |
| chore | Build, config, dependencies, test count updates |
| ui | UI-only changes (layout, styling, accessibility) |
| perf | Performance improvement |
| refactor | Code restructuring without behavior change |
| wip | Work in progress (incomplete, pre-review) |

## Commit Message Style

- English, lowercase start, present tense
- Format: `{type}: {brief description}`
- Multiple related changes: `{type}: {A} + {B}`
- With additional context: `{type}: {description} — {context}`
- Examples from this project:
  - `feat: PVD chamber extraction + EES-driven chamber mapping`
  - `fix: use MES terminology in chat AI chamber prompt, not CCUBE`
  - `dispatch: CCUBE sequence recipe study — ADM_EQUIP_RECIPE discovery`
  - `docs: sync README, changelog, CLAUDE.md with April 4-6 changes`

## Core Principles

1. **Auto-create feature branch if on `main`** — branch name is derived from commit type + changed files (e.g., `fix/api-exception-lock`); never commit directly to `main`
2. **Full merge flow on "머지해줘"** — ITSM 확인 → commit (with ITSM number) → code review → merge to main (with ITSM number) → branch deletion, all in one command
3. **Tests must pass before committing** — for `feat` and `fix` types only
4. **Claude never executes `git push`** — the user runs it manually
5. **`dispatch:` type skips code review and tests** — it records task state, not code changes

## Workflow Execution Order

Agent folder: `.claude/agents/fdc-git-workflow/`
Execute in order: Phase 1 (`phase1-analyze.md`) → Phase 2 (`phase2-commit.md`) → Phase 3 (`phase3-push-deploy.md`).
Read each phase file only when starting that phase.

## Usage Examples

```
/fdc-git-workflow
/fdc-git-workflow "add chamber mapping for CVD tools"
```
