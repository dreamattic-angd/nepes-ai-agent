# Git Workflow (Unified)

Shared Git workflow for all projects. Uses a Git Flow-based strategy (develop branch) and a 3-level versioning scheme (MAJOR.MINOR.PATCH).
feature/bugfix branches are created from develop and merged into develop. main is used only for releases and is merged only when the user explicitly requests it.

## User Input
$ARGUMENTS

## Project Auto-detection

Extract the repo name from `git remote get-url origin` and match it against the configuration table below.
If matching fails, ask the user to confirm the project before proceeding.

## Project Configuration Table

| Repo Name | Project Name | Main Branch | Source Version File | Deep Review Layers | diff Source Path | Version File | CLAUDE.md Sync | README Auto-update | Draft PR |
|-----------|-------------|------------|--------------------|--------------------|-----------------|--------------|---------------|--------------------|----------|
| APP_RMSPAGE | APP_RMSPAGE | main | src/common/Version.java | Controller/Service/Repository | src/ | ./VERSION | N | N | N |
| Web_rmspage | WEB_RMSPAGE | main | (none) | View/Composable/Store | src/ | ./VERSION | N | N | N |
| YTAP | YTAP | master | src/Common/Version/YTAPVersion.java | Controller/Service/Repository | src/ | ./VERSION | N | N | N |
| RMSSERVER | RMSSERVER | master | (none) | Controller/Service/Repository | RMSWorkflow/ RMSScenario/ RMSRDL/ RMS2.1.16/ RMSConnectivity/ DCP_Base/ | ./VERSION | N | N | N |
| YTAP_MANAGER | YTAP_MANAGER | master | (none) | Controller/Servlet/Service/Manager/Repository/DAO | src/ | ./VERSION | N | N | N |
| nepes-ai-agents | NEPES_AI_AGENTS | main | (none) | (none) | .claude/ | .claude/version.txt | Y | Y | Y |

## User Input Parsing

Check whether a version is specified in $ARGUMENTS.
- If version is explicitly specified → `USER_VERSION={specified value}` (skip auto-calculation in Phase 3)
- If version is not specified → `USER_VERSION=none` (auto-calculate in Phase 3)

**Even if a version is specified, all Phases must be executed.** Version specification only overrides version calculation in Phase 3.

## Core Principles
1. **Phase 1 change analysis results must always be confirmed by the user** — the user must review the list of changed files.
2. **Version updates only on the feature branch immediately before merging** — do not touch version files at the commit stage.
3. **If there are no changes, abort immediately** — do not create unnecessary empty commits.
4. **Push is never performed directly by Claude** — the user performs it directly.
5. **Version increment is based on commit type** — feat → MINOR, others (fix/docs/refactor/chore/improve) → PATCH.
6. **develop branch is the default working branch** — feature/bugfix branches are created from develop and merged into develop. main is merged only when the user explicitly requests it.

## Workflow Resume Check

Before executing Phases, check whether a previous checkpoint exists:

```bash
node -e "const cp=require(process.env.USERPROFILE+'/.claude/hooks/checkpoint.js').loadCheckpoint('git-workflow'); console.log(cp ? JSON.stringify(cp) : 'null')"
```

- **null** → Start from the beginning (Phase 1)
- **Checkpoint exists** → Ask the user:
  ```
  ℹ️ A previous workflow was recorded up to {phase}. ({timestamp})
  Project: {data.project}, ITSM: {data.itsm}

  1. Resume (continue from the next phase)
  2. Start over from the beginning

  Select (1/2):
  ```
  - **1** → Use the checkpoint's data as the previous phase output and resume from the next phase
  - **2** → Run `clearCheckpoint('git-workflow')` and start from Phase 1

## Recurring Failure Pattern Check

Before executing Phases, query recent recurring failure patterns:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const ctx=fr.getContextForWorkflow('git-workflow'); if(ctx) console.log(ctx); else console.log('__NO_PATTERNS__');"
```

- **`__NO_PATTERNS__`** → Proceed as-is
- **If patterns are output** → Use the content as reference to prevent the same failures

## 14-Day Automatic Distillation Check

Before executing Phases, check the last distillation run date:

```bash
node -e "
  const fs=require('fs'),p=require('path');
  const f=p.join(process.env.USERPROFILE||process.env.HOME,'.claude','logs','distill-last-run.json');
  if(!fs.existsSync(f)){console.log('__DISTILL_NEEDED__');process.exit(0);}
  const d=JSON.parse(fs.readFileSync(f,'utf8'));
  const origin=require('child_process').execSync('git remote get-url origin',{encoding:'utf8'}).trim();
  const repo=origin.split('/').pop().replace('.git','');
  const map={'APP_RMSPAGE':'APP_RMSPAGE','Web_rmspage':'WEB_RMSPAGE','YTAP':'YTAP','RMSSERVER':'RMSSERVER','YTAP_MANAGER':'YTAP_MANAGER','nepes-ai-agents':'NEPES_AI_AGENTS'};
  const proj=map[repo]||null;
  const last=proj&&d[proj];
  if(!last){console.log('__DISTILL_NEEDED__');process.exit(0);}
  const days=Math.floor((Date.now()-new Date(last))/(86400000));
  if(days>=14){console.log('__DISTILL_NEEDED__');}else{console.log('__DISTILL_OK__:'+days);}
"
```

- **`__DISTILL_NEEDED__`** → Automatically run `/distill-failures`, then continue the workflow
- **`__DISTILL_OK__:{N}days`** → Proceed as-is

## Workflow Execution Order

Agent folder: `.claude/agents/git-workflow/`
Execute in order: Phase 1(phase1-change-analysis.md) → 2(phase2-branch-commit.md) → 3(phase3-review-merge.md) → 4(phase4-cleanup.md).
Read each phase file only when starting that step. Do not skip steps.

## Usage Examples

```
/git-workflow
/git-workflow v1.5.0
/git-workflow ITSM-3421
```