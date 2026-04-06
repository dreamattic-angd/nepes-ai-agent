# Monitoring Report

Generates a harness workflow execution status and failure analysis report.

## User Input

$ARGUMENTS

## Execution Procedure

### Step 1: Parse Period

Parse the period from $ARGUMENTS.

| Input | Days |
|-------|------|
| "this month", "last month", no input | 30 |
| "this week" | 7 |
| "90 days", "3 months", etc. | corresponding days |
| number only | corresponding days |

Default: 30 days

### Step 2: Collect Workflow Statistics

```bash
node "%USERPROFILE%/.claude/scripts/workflow-stats.js" --days {DAYS} --json
```

Parse the output JSON to obtain stats and failures data.

### Step 3: Analyze Failure Patterns

```bash
node -e "
  const fr = require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js');
  const patterns = fr.getRecurringPatterns({ sinceDays: {DAYS} });
  console.log(JSON.stringify(patterns));
"
```

### Step 4: Collect Eval Results

```bash
node "%USERPROFILE%/.claude/scripts/eval-runner.js"
```

### Step 5: Generate Report

Write the collected data as a markdown report in the following format.

**Output path**: `~/.claude/logs/reports/monitoring-report-{YYYYMMDD}.md`

Create the directory if it does not exist.

```markdown
# Harness Monitoring Report

Generated: {today's date}
Period: {start date} ~ {end date} ({DAYS} days)

---

## 1. Execution Summary

| Workflow | Runs | Success | Failure | Aborted | Success Rate | Avg Duration |
|----------|------|---------|---------|---------|-------------|-------------|
| {row per workflow} |

### Overall
- Total runs: {total}
- Overall success rate: {weighted average}%

## 2. Failure Type Analysis

| Type | Count | Workflow |
|------|-------|---------|
| {row per failureType/subType} |

## 3. Recurring Failure Patterns

{failure-registry output. If no patterns, display "No recurring failure patterns"}

## 4. Duration Analysis

- Average duration: {avgDurationMs formatted}
- If insufficient data: "Insufficient duration data. (Recording started: v1.33.0)"

## 5. Eval Results

- Total cases: {N}
- PASS: {N}
- FAIL: {N}
- Last run: {today's date}

## 6. Recommendations

Write recommendations based on data from the following perspectives:
- If any workflow has a success rate below 80% → recommend root cause analysis
- If recurring failure patterns exist → recommend resolving root cause of those patterns
- If eval failure cases exist → recommend logic fix
- If data is insufficient → "Recommend re-analysis after accumulating more monitoring data"
```

### Completion Report

```
📊 Monitoring report generated.

File: {output path}
Period: {DAYS} days ({start date} ~ {end date})
Workflows: {N}
Overall success rate: {N}%
```

## Usage Examples

```
/monitoring-report
/monitoring-report this week
/monitoring-report 90 days
/monitoring-report last month
```