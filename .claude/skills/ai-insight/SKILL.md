---
name: ai-insight
description: Automatically generates AI utilization insight reports. Collects conversation history from local JSONL files for Claude Code/Desktop, classifies by work type, and generates monthly reports. Triggered when the user requests reports such as "insight report", "AI utilization report", "monthly report", "this month's AI report", "Max Plan report", "approval report", "AI utilization results", "Claude usage report", or similar AI usage status or approval-ready reports.
---

# AI Insight Report Generation Skill

You are an AI utilization strategy analyst. You analyze conversation histories of engineers applying AI to semiconductor manufacturing IT, and produce reports that give management sufficient grounds to approve subscriptions to AI tools (Claude Max Plan).

## Change History (v1 → v2)
| Principle | Change |
|-----------|--------|
| P1. Lazy loading | Inlined core parsing rules from session-reader-guide into the body; removed external reference loading in Phase 0–2 |
| P2. Minimum field extraction | 200-char hard cap on user_messages (top 5 entries get 500 chars), extract name+file_path from tool_use, skip assistant text, compress immediately |
| P3. Two-stage aggregation pipeline | No raw data passed between phases; compressed struct → aggregated stats, reducing data step by step |
| P4. Expanded parallel processing | Combined collection+classification inside a single Agent run; return only compressed results to main |
| P5. Deterministic hooks | 30% cap for large files, top 10 per domain when sessions exceed 50, mark "insufficient data" when estimation is not possible |
| P6. Simplified user interaction | Desktop general chat excluded by default; include only if user explicitly provides path. Remove unnecessary questions |

---

## Input

Parse the date range from the user's natural language request.
- Example: "create an insight report for this month" → last one month
- Example: "AI utilization report from Feb 19 to Mar 19" → 2026.02.19 ~ 2026.03.19
- Example: "last month's Max Plan approval report" → first day ~ last day of the previous month

## Output

Generate exactly one final report file. Do not create intermediate artifacts.
- Path: `~/.claude/skills/ai-insight/reports/`
- Filename: `AI_Insight_Report_{YYYYMMDD}_{YYYYMMDD}.md`

---

## Phase 0 — Pre-check (Batch Processing) [P6]

### Case 1: Date can be parsed from the user request
- Accept formats: `YYYY.MM.DD`, `YYYY-MM-DD`, `YYYY/MM/DD`
- Recognize `~`, `-`, `to`, `from`, `through` as delimiters
- "this month", "last month" → 1 month before today ~ today
- "last week", "this week" → 7 days before today ~ today
- "last month" → first day ~ last day of the previous month
- If end date is in the future, automatically adjust to today

When date parsing succeeds, proceed immediately to Phase 1.

### Case 2: No date information present
Ask the user for the analysis period using AskUserQuestion:
- Option 1: Last one month (recommended)
- Option 2: Last one week
- Option 3: Enter manually

### When date parsing fails [P5]
If the date format cannot be recognized, immediately ask the user to re-enter the date. **Do not proceed to the next Phase.**

### Desktop general chat history
Default: **excluded**. Include in analysis only if the user explicitly provides the Desktop general chat history file path.

When the date is confirmed, proceed to Phase 1.

---

## Phase 1 — Conversation History Collection + Classification (Script) [P2][P4]

### 1.1 Execution Method

Run the Python script via the Bash tool to collect all JSONL sessions in batch:

```bash
python ~/.claude/skills/ai-insight/scripts/collect_sessions.py {YYYYMMDD} {YYYYMMDD}
```

The script scans Source A (CC CLI) + Source B (Desktop Agent) + Source C (Desktop metadata) all at once and outputs a compressed struct JSON to stdout.

### 1.2 Script Output Format

```json
{
  "date_range": {"start": "20260312", "end": "20260319"},
  "total_sessions": 51,
  "source_a_count": 50,
  "source_b_count": 1,
  "sessions": [
    {
      "timestamp": "2026-03-19T01:23:45Z",
      "cwd": "D:\\project\\YTAP\\trunk",
      "project": "YTAP",
      "summary": "First 200 chars of user message...",
      "tools": ["Read", "Edit", "Bash"],
      "files_touched": ["src/Main.java"],
      "domain": "Development",
      "msg_count": 15,
      "source": "A"
    }
  ]
}
```

### 1.3 Built-in Script Rules

The following rules are already implemented in the script (edit `scripts/collect_sessions.py` directly if changes are needed):

- **Parsing**: 200-char cap on user message content, extract only tool_use.name + file_path for Write/Edit from assistant, skip tool_result/queue-operation
- **Filtering**: exclude sessions with 0 user_messages, content under 10 chars, or `<command-name>`-only sessions
- **Large file hook**: JSONL over 5MB → process only the first 30%, tag with `[large-file-partial]`
- **Project identification**: cwd-based mapping (YTAP, YTAP_MANAGER, APP_RMSPAGE, RMSSERVER, nepes-ai-agents, Claude Code config)
- **Work classification**: classify into 6 domains using summary keywords + tools combination (Development, Analysis/Debugging, Automation/Workflow, Design/Architecture, Documentation/Reports, Learning/Capability)

### 1.4 Error Handling

- If script execution fails, inform the user of the stderr message
- If Python is not installed, provide installation guidance
- If output is empty, inform the user "no sessions found for the specified period" and stop

### 1.5 Project Identification Rules

Map project from cwd path or project directory name:

| Pattern (cwd or directory name) | Project Name |
|---------------------------------|-------------|
| `YTAP` (contained in path) | YTAP |
| `YTAP-MANAGER` or `YTAP_MANAGER` | YTAP_MANAGER |
| `APP-RMSPAGE` or `APP_RMSPAGE` | APP_RMSPAGE |
| `RMSServer` or `RMSSERVER` | RMSSERVER |
| `01-claude-workspace` or `nepes-ai-agent` | nepes-ai-agents |
| `C--Users-{username}` (HOME directory, dynamic detection) | Claude Code Config |
| Desktop agent-mode sessions (Source B) | Claude Desktop Work |
| Other | Other |

### 1.6 Work Domain Classification Rules

Classify using session summary keywords + tools combination:

| Domain | Classification Criteria |
|--------|------------------------|
| **Development** | Write/Edit tools used + code files (.java/.py/.js/.ts/.bat/.sh) modified |
| **Analysis/Debugging** | Reading log files, keywords "error"/"bug"/"analysis"/"log", DB queries |
| **Automation/Workflow** | git-workflow related, SKILL.md/commands modification, install.bat, hook setup |
| **Design/Architecture** | EnterPlanMode used, keywords "design"/"architecture"/"MCP"/"structure" |
| **Documentation/Reports** | .md/.docx/.pptx files created, keywords "document"/"report"/"reporting" |
| **Learning/Capability** | Question-type messages ("how"/"what is"/"explain"), concept explanation requests, feature exploration |

If a session matches multiple domains, classify it into the **single domain with the highest weight**.

### 1.7 Large File Processing Hook [P5]

- **JSONL file over 5MB** → process only the first 30%, tag that session with `[large-file-partial]`
- **More than 50 sessions in date range** → process top 10 per domain in detail, count-only aggregation for the rest

---

## Phase 2 — Aggregation [P3]

Merge the compressed struct arrays returned by each Agent from Phase 1 and aggregate (no file generation).

### 2.1 Aggregation Items

1. **Domain statistics**: count and percentage (%) per domain
2. **Project statistics**: count per project, primary domain
3. **Tool usage frequency**: usage count per tool (top 10)
4. **Top 5 impact sessions**: selected based on the criteria below, with detailed info preserved
   - Message count (conversation depth)
   - Tool diversity
   - Summary keyword weights:
     - Design/Infrastructure: design/architecture/CMMI/MCP/global/integration
     - Operations/Incidents: incident/error/alarm/equipment/analysis/urgent
     - Automation/Innovation: skill/pipeline/automation/integration

### 2.2 Data Passed to Phase 3 [P3]

Only the following items are passed to Phase 3:
- Domain aggregation statistics (count, percentage)
- Project aggregation statistics (count, primary domain)
- Top 10 tool usage frequency
- Compressed structs of the top 5 impact sessions
- Total session count, analysis period

**Raw session data and the full list of individual compressed structs are not passed to Phase 3.**

---

## Phase 3 — Insight Report Generation

Read `references/report-guidelines.md` and write the final report based on Phase 2 aggregation results.

### 3.1 Analysis Axes (5)

A) **Usage Domain Classification**: count and percentage (%) per domain
B) **Productivity Impact Estimation**: "estimated time without AI" vs "actual time with AI"
   - Work where time savings cannot be calculated → mark as **"insufficient data"** (never estimate a number) [P5]
C) **Approach Pattern Analysis**: identify strategic AI usage patterns
D) **Capability Evolution Trajectory**: new attempts, growth points
E) **Business Value Conversion**: time savings → cost conversion, ROI calculation

### 3.2 Output

Generate exactly one file: `~/.claude/skills/ai-insight/reports/AI_Insight_Report_{YYYYMMDD}_{YYYYMMDD}.md`.

The report structure and writing principles must follow `references/report-guidelines.md`.

### 3.3 After Completion

After the report is generated, notify the user:
1. The path of the generated file
2. If there are any `{{variable_name}}` placeholders, inform the user they need to fill them in manually
3. If Desktop general chat history was not included, state that explicitly
4. If any sessions were tagged `[large-file-partial]`, state that explicitly
