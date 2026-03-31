# Phase 4 — Final Report

> `Phase 4: Writing final report...`

## Role
Consolidate the results of Phase 2 (analysis) and Phase 3 (verification) to produce a report that developers can act on immediately.

## Report Principles
1. **State the conclusion first** — present the root cause in the first sentence.
2. **Distinguish confirmed facts from estimates** — specify confidence levels.
3. **Fix suggestions must be concrete** — specify the files to modify and how.
4. **Do not omit log details** — always include the exhaustive error list and pattern statistics.

---

## Report Format

### Issue Analysis Report

**Root Cause (Confidence {N}%)**

{state the root cause in 1–2 clear sentences}

---

**Evidence**

| # | Type | Location | Content |
|---|------|----------|---------|
| 1 | Code | {file:line} | {one line} |
| 2 | Log | {time/location} | {one line} |
| 3 | Build | {config file} | {one line} |

---

**Exhaustive Error List**

Based on Phase 0's exhaustive list, organize all errors in a table. Do not omit any.

| # | Timestamp | Error Class/Message | Call Location | Related Entity |
|---|-----------|---------------------|--------------|----------------|

---

**Pattern Analysis**

| Pattern | Repeat Count | Characteristic |
|---------|-------------|----------------|
| {error/anomaly pattern} | {N} times | {one failure → continuous failure, intermittent, etc.} |

Anomalies:
- {what is abnormal despite not being an error, and its significance}

---

**Root Cause Analysis Path**

1. Direct cause: {error/symptom}
2. → Why? {cause level 1}
3. → Why? {cause level 2}
4. → Root cause: {final}

---

**Fix Suggestions**

*Immediate Action (Hotfix):*
- {file}: {specific change content}

*Fundamental Fix (Long-term):*
- {architecture/design-level improvement}

---

**Verification Notes** *(key findings from Phase 3)*

- {additional risks or cautions found during verification}
- {areas where analysis and verification views diverged, and why}

---

**Further Investigation Recommended** *(when confidence < 80%)*

- {investigation items that would increase confidence}

---

## Report Quality Self-Check

```
□ Is the root cause clearly presented in the first sentence?
□ Is there code/log evidence for every claim?
□ Is the exhaustive error list included? (full list, not a summary)
□ Is pattern analysis (repeat counts, anomalies) included?
□ Are fix suggestions concrete? (filename, direction of change)
□ Are uncertain parts honestly stated?
```

## File Save

- Path: `.claude/agents/issue-analysis/reports/{YYYYMMDD}-{issue_type}-{one_line_summary}.md`
- After saving, output: `Report saved at {save path}.`

## Follow-up Conversation with User

- Request for code from fix suggestions → immediately write/modify the code
- Questions about other hypotheses → provide information about hypotheses rejected in Phases 2–3
- Request for additional investigation → extend from Phase 1 while preserving existing analysis
- "The analysis is wrong" → generate postmortem (`reports/{YYYYMMDD}-{issue_type}-postmortem.md`)
