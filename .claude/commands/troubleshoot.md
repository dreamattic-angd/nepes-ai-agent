---
description: "Automated troubleshooting pipeline: log analysis -> issue diagnosis -> code fix. Minimizes user intervention."
---

**First, read `.claude/workflow-rules.md` using the Read tool and internalize the rules.**

Input: $ARGUMENTS

You are the **orchestrator**. You do not directly analyze logs, diagnose issues, or write code.
At each phase you invoke specialized sub-agents and present results to the user.

---

## Recurring Failure Pattern Check

Before Phase 0, query recent recurring failure patterns:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const ctx=fr.getContextForWorkflow('troubleshoot'); if(ctx) console.log(ctx); else console.log('__NO_PATTERNS__');"
```

- **`__NO_PATTERNS__`** → Proceed as-is
- **If patterns are output** → Display the recurring patterns to the user and use as reference during analysis

---

## Phase 0: Problem Parsing

Parse `$ARGUMENTS` (natural language) to extract:

| Input Pattern | Extracted Fields |
|--------------|-----------------|
| Equipment ID format (e.g., PRS-04, BGP04) without server keywords | target_type=equipment, target={EQP_ID} |
| Server keywords: rms, framework, amq, das, fdc12, fdc8 | target_type=server, target={keyword} |
| "yesterday" | date=yesterday YYYYMMDD |
| "today" or no date mention | date=today YYYYMMDD |
| Specific date ("July 10th", etc.) | date=resolved YYYYMMDD |
| Time range hint ("this morning", "since 9am") | note as period hint |

If target cannot be determined: ask user "Please specify the target (equipment ID or server name)."
If input matches both equipment and server patterns: ask user to clarify which target to analyze.

Infer defaults:
- `inferred_log_path`: `/logs/{EQP_ID}/` for equipment, `/var/log/{target}/` for server
- `inferred_period`: `{inferred_date} 00:00 ~ {inferred_date} 23:59`

Internal state after Phase 0:
```
{ target, target_type, symptoms, inferred_date, inferred_log_path, inferred_period_start, inferred_period_end }
```

---

## User Input Gate (mandatory — Phase 1 must NOT start before this completes)

Display the following prompt exactly:

```
[INPUT REQUIRED] Log analysis parameters

Target: {target} ({target_type})
Inferred period: {inferred_date}

Please confirm or provide:
  FTP/log path: [Enter for default: {inferred_log_path}]
  Analysis period: [start] ~ [end] (format: YYYYMMDD HH:MM)
                   [Enter for default: {inferred_date} 00:00 ~ {inferred_date} 23:59]
```

**Parse user response:**

| User Input | Result |
|-----------|--------|
| Empty (Enter only) | log_path = inferred_log_path, period = inferred full day |
| Path only (starts with `/` or drive letter) | log_path = provided, period = inferred full day |
| Period only (matches `YYYYMMDD HH:MM ~ YYYYMMDD HH:MM`) | log_path = inferred, period = provided |
| Both provided | log_path = provided, period = provided |

**Validation (retry up to 3 times on failure):**

| Check | Failure message |
|-------|----------------|
| Path is non-empty string after trim | `[ERROR] Log path cannot be empty. Please provide a valid path.` |
| Period format: YYYYMMDD HH:MM ~ YYYYMMDD HH:MM or YYYYMMDD | `[ERROR] Cannot parse period format. Expected: YYYYMMDD HH:MM ~ YYYYMMDD HH:MM` |
| period_start <= period_end | `[ERROR] Invalid analysis period: end time ({end}) is before start time ({start}).` |

If validation fails 3 consecutive times:
```
[ERROR] Log path and period could not be confirmed after 3 attempts.
Please verify your inputs and retry /troubleshoot.
```
Then terminate pipeline.

Output: `{ log_path, period_start, period_end }` (confirmed values)

---

## Phase 1: Log Analysis

Invoke `log-analyzer` as a sub-agent using the Agent tool with this prompt:

```
Analyze logs for the following target. Return results in structured [LOG_ANALYSIS_RESULT] format.

Target: {target}
Target type: {target_type} (equipment / server)
Log path: {log_path}
Analysis period: {period_start} ~ {period_end}
Symptoms: {symptoms}

IMPORTANT: Only analyze log entries within the specified analysis period. Skip entries outside this range.
```

**Parse the `[LOG_ANALYSIS_RESULT]` block from the agent response by key prefix matching.**

**Auto-advance decision:**

| Condition | Action |
|-----------|--------|
| `log_access_failed: true` | Display FTP failure guidance (see analyze-log.md pattern). Ask user to retry when resolved. On user retry, re-invoke log-analyzer. |
| `severity: low` AND `note:` value contains "No log files" | Display "No log files found for {inferred_date}." Terminate pipeline. |
| `severity: low` AND `note:` value contains "No log entries" | Display "No log entries found within {period_start} ~ {period_end}. Consider expanding the analysis period." Terminate pipeline. |
| `requires_deep_analysis: false` (error_count < 5 AND fatal_count == 0) | Display result summary. Terminate pipeline. |
| `requires_deep_analysis: true` (error_count >= 5 OR fatal_count >= 1) | Display "Severity: {severity} — auto-advancing to Phase 2 deep analysis." Proceed to Phase 2. |

Display progress: `[Phase 1 complete] severity={severity}, error_count={N}, fatal_count={N}`

---

## Phase 2: Issue Analysis

Read and execute the issue-analysis phase files in order (lazy loading — read each file only when entering that phase):

1. Read `.claude/agents/issue-analysis/phase0-log-scan.md` → execute Phase 0
   - Pass log download path from Phase 1: `$USERPROFILE/.claude/logs/{target}/{date}/`
   - Pass symptoms as issue description
2. Read `.claude/agents/issue-analysis/phase1-triage.md` → execute Phase 1
3. Read `.claude/agents/issue-analysis/phase2-analysis.md` → execute Phase 2
4. Read `.claude/agents/issue-analysis/phase3-verification.md` → execute Phase 3
5. Read `.claude/agents/issue-analysis/phase4-report.md` → execute Phase 4

If any phase file is missing: display "Error: phase file not found at {path}" and terminate.

**Context saturation check after Phase 2:** If context is heavily used, display:
```
> Current session context is heavily used.
> Recommended: run /handoff then continue with /troubleshoot in a new session.
> Log path: {log_path} | Analysis report: {report_path}
```

After Phase 2 completes, extract from the Phase 4 report:
- `root_causes[]` (list of root causes with confidence %)
- `fix_suggestions[]` (list of fix suggestions per cause)
- `report_path` (saved .md file path)

**Always proceed to CHECKPOINT regardless of analysis outcome.**

Display progress: `[Phase 2 complete] Report saved: {report_path}`

---

## CHECKPOINT (unconditional — always displayed after Phase 2)

Display one of the following formats based on analysis results:

**Single cause identified:**
```
[CHECKPOINT] Phase 2 analysis complete.

Root cause (confidence {N}%):
  {root cause summary in 1-2 sentences}

Fix suggestion:
  {file}: {change description}

Proceed with code fix? (y/n)
```

**Multiple causes identified:**
```
[CHECKPOINT] Phase 2 analysis complete.

Multiple potential root causes identified:

1. {Cause 1 title} (confidence {N}%)
   Fix: {file} - {change}

2. {Cause 2 title} (confidence {N}%)
   Fix: {file} - {change}

Select which cause to fix (1/2/n to decline):
```

**No code fix identified:**
```
[CHECKPOINT] Phase 2 analysis complete.

Analysis summary:
  {root cause or issue description in 1-3 sentences}

No specific code fix was identified for this issue.
The issue may require configuration change, environment adjustment, or further investigation.

Proceed with code fix attempt anyway? (y/n, recommended: n)
```

**Wait for user response.**

| Response | Action |
|----------|--------|
| `y` | Proceed to Phase 3 |
| Cause number (1, 2, …N) | Set selected cause as target, proceed to Phase 3 |
| `n` | Display analysis report summary, terminate pipeline |
| `s` | Display status table, then re-display CHECKPOINT prompt |

On `n`: Display final message:
```
Analysis report: {report_path}
Pipeline terminated. No code fix performed.
```

---

## Phase 3: Code Fix

Read `.claude/commands/workflow-automate.md` using the Read tool.

Execute workflow-automate in bugfix mode, setting $ARGUMENTS equivalent to:
```
{symptoms description from Phase 0} — analysis reference: {report_path}
```

Follow workflow-automate's own CHECKPOINTs (design, review, test) as defined in that file.

Display on completion:
```
[Pipeline complete] Code fix workflow finished.
Refer to workflow-automate output for implementation details.
```

---

## Status (s) Command

When the user inputs `s` at any point, display the pipeline state table and resume current operation:

```
Pipeline Status: troubleshoot {target}

| Phase        | Description         | Status              | Output                        |
|--------------|---------------------|---------------------|-------------------------------|
| Phase 0      | Problem Parsing     | done/in-progress/pending | {target, date}           |
| Input Gate   | Log Path & Period   | done/in-progress/pending | {log_path, period}       |
| Phase 1      | Log Analysis        | done/in-progress/pending | {severity, error_count}  |
| Phase 2      | Issue Analysis      | done/in-progress/pending/skipped | {report path}  |
| CHECKPOINT   | User Decision       | done/waiting/pending | {user response}              |
| Phase 3      | Code Fix            | done/in-progress/pending/skipped | {workflow status} |
```

Synonyms accepted per workflow-rules.md: "status" → s, "계속"/"yes"/"ㅇ" → y, "다시"/"no"/"ㄴ" → n
