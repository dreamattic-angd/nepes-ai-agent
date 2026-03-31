# Issue Analysis Agent

An agent that analyzes the root cause of issues based on logs, error messages, and symptom descriptions.

## Usage

```
/project:issue-analyze {issue description}
```

### Examples

```
/project:issue-analyze
Intermittent 5+ second delays occur on specific API calls in production.
Please refer to logs at .claude/agents/issue-analysis/logs/error-20250205.log

/project:issue-analyze PRS-04 error occurred around 2pm yesterday
(If no logs found, auto-downloads and analyzes)
```

## Workflow

```
/project:issue-analyze {issue description}
    │
    ▼
Phase -1: Log Acquisition (conditional — only when logs are unavailable)
    │  Check logs from download path or manual placement path
    │  If missing: confirm target/date/scope → auto-download via fetch_log.py
    │
    ▼
Phase 0: Log Pre-scan (when log files are available)
    │  Full grep-based scan for error/exception/warning patterns
    │  Complete error list + anomaly detection
    │  Create scan index file (reports/{YYYYMMDD}-log-scan-index.md)
    │
    ▼
Phase 1: Issue Intake and Triage
    │  Classify issue type, check information sufficiency
    │  Ask user if insufficient
    │
    ▼
Phase 2: Deep Analysis
    │  [Required] Complete log analysis (index-based)
    │  [Required] Anomaly detection (non-error abnormalities)
    │  [Required] Code/build evidence collection
    │  5-Why analysis, derive minimum 2 hypotheses
    │
    ▼
Phase 3: Independent Verification (always run)
    │  Verify analysis completeness
    │  Attempt hypothesis refutation (Devil's Advocate)
    │  Explore missed paths, calculate confidence score
    │
    ▼
Phase 4: Final Report
    │  Root cause + complete error list + pattern analysis + remediation
    │  Save report file
    │
    ▼
    Done
```

**Design Principle**: Analysis completeness is the top priority. Depth over process efficiency.
No SIMPLE path — always run the full Phase sequence.

## Log Sources

Phase 0 scans logs from two paths:

1. **Auto-download path**: `$USERPROFILE/.claude/logs/{target}/{YYYYMMDD}/` (downloaded by analyze-log or Phase -1)
2. **Manual placement path**: place files directly in the `logs/` folder

**Large logs:**
- Place log files as-is without size limits.
- Phase 0 (Log Pre-scan) automatically scans with grep and extracts all key events.

## File Structure

```
.claude/agents/issue-analysis/
├── README.txt                 ← This file
├── phase0-log-scan.md         ← Log Pre-scan (complete error extraction)
├── phase1-triage.md           ← Issue intake and triage
├── phase2-analysis.md         ← Deep analysis (full log + anomalies + code/build)
├── phase3-verification.md     ← Independent verification (Devil's Advocate)
├── phase4-report.md           ← Final report generation
├── logs/                      ← Analysis log storage (input)
└── reports/                   ← Analysis reports and intermediate results (output)
```
