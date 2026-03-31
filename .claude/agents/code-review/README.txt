# Code Review Agent

An agent that automates code review before merging.

## Prerequisites
- Claude Code
- Node.js v18 or higher (required for Sequential Thinking MCP auto-install in Deep mode)

## Usage

```
/project:code-review
/project:code-review quick        # Quick review (Critical only)
/project:code-review deep         # Multi-layer architecture review
```

## Review Modes

| Mode  | File             | Purpose                          | Duration |
|-------|------------------|----------------------------------|----------|
| Full  | review-full.md   | Full review (4 perspectives)     | ~15 min  |
| Quick | review-quick.md  | Critical scan only               | ~5 min   |
| Deep  | review-deep.md   | Multi-layer architecture review  | ~25 min  |

## Workflow

```
/project:code-review
    │
    ▼
[Step 1] Determine base branch
    │  Use develop if available, otherwise main
    │
    ▼
[Step 2] Collect diff-based changes
    │  git diff {base-branch} --name-only
    │  Review only changed code
    │
    ▼
[Step 3] Review from 4 perspectives
    │  Quality / Logic / Security / Performance
    │
    ▼
[Step 4] Verdict
    │  PASS / REVIEW_NEEDED / REJECT
    │
    ▼
[Step 5] Generate report
    │  reviews/YYYYMMDD_HHMMSS.log
    │
    ▼
    Done
```

## Verdict Criteria

| Verdict       | Condition                              | Mergeable         |
|---------------|----------------------------------------|-------------------|
| PASS          | Critical 0 AND Warning 3 or fewer      | Auto-merge        |
| REVIEW_NEEDED | Critical 0 AND Warning 4 or more       | Merge after review|
| REJECT        | Critical 1 or more                     | Fix then re-review|

## Severity Levels

| Level      | Icon | Meaning                                   |
|------------|------|-------------------------------------------|
| Critical   | 🔴   | Bug, security vulnerability, must fix now |
| Warning    | 🟡   | Potential issue, fix recommended          |
| Suggestion | 🟢   | Improvement possible, optional            |

## File Structure

```
nepes-ai-agent/
├── .mcp.json                          ← Sequential Thinking MCP (team shared)
└── .claude/agents/code-review/
    ├── README.txt
    ├── review-full.md
    ├── review-quick.md
    ├── review-deep.md
    ├── review-summary.md
    └── reviews/
```

## Log Management

- **Auto cleanup**: Delete logs older than 30 days or when count exceeds 10
- **Recurring issues**: Top 3 automatically aggregated in `review-summary.md`
