# SECS/GEM Specification Analysis Agent — Installation Guide

## Installation

Copy the `.claude/` folder to the project root and you're done.

```bash
# Example: applying to another project
cp -r .claude/ /path/to/other-project/.claude/
```

**No changes needed to CLAUDE.md.** Each project's CLAUDE.md should contain only that project's own content.

## Usage

Call from Claude Code as follows:

```
/project:analyze-secsgem {analysis target}
```

### Examples

```
/project:analyze-secsgem .claude/agents/secsgem-analysis/secsgem-specs/
```
Scans all PDFs/Excel files in the folder, groups by equipment, then analyzes.

```
/project:analyze-secsgem .claude/agents/secsgem-analysis/secsgem-specs/SECS_SPEC_PRS04.pdf .claude/agents/secsgem-analysis/secsgem-specs/VID_LIST_PRS04.xls
```
Analyzes a specific PDF and Excel file as a pair.

```
/project:analyze-secsgem PRS-03/ PRS-04/ compare
```
Comparative analysis of SECS/GEM Specs for two pieces of equipment.

## File Structure

```
.claude/
├── commands/
│   └── analyze-secsgem.md              <- Slash command (orchestrator)
└── agents/
    └── secsgem-analysis/
        ├── README.txt                  <- Installation guide (this file)
        ├── guide.md                    <- Analysis guidelines
        ├── secsgem-specs/              <- Source documents (input)
        └── analysis-reports/           <- Analysis reports (output)
```

## Workflow

```
User call: /project:analyze-secsgem {analysis target}
    |
    v
Step 0: Load guidelines (.claude/agents/secsgem-analysis/guide.md)
    |
    v
Step 1: Parse input and determine mode
    |-- Folder specified  → scan folder & group by equipment
    |-- File specified    → analyze directly
    |-- 2+ equipment      → comparative analysis mode
    |
    v
Step 2-3: Process PDF/Excel
    |
    v
Step 4: Integrated analysis + cross-check
    |
    v
Step 5: Generate report → .claude/agents/secsgem-analysis/analysis-reports/
    |
    v
Step 6: (Comparison mode) Generate comparative report
```

## Extending with New Agents

To add another agent, follow the same pattern:

```
.claude/
├── commands/
│   ├── analyze-secsgem.md
│   ├── issue-analyze.md                <- Add new command
│   └── code-review.md                  <- Add new command
└── agents/
    ├── secsgem-analysis/
    │   ├── guide.md
    │   ├── secsgem-specs/              <- Input for this agent
    │   └── analysis-reports/           <- Output for this agent
    ├── issue-analysis/                 <- Add new agent
    │   └── reports/                    <- Output for this agent
    └── code-review/                    <- Add new agent
        └── reports/                    <- Output for this agent
```

Each agent has its own input/output folders and is managed independently.

## Customization

You can modify `guide.md` to fit your project's characteristics:

- **Change analysis checklist**: Modify the checklist items in Step 4
- **Change report format**: Modify the report structure in Step 5
- **Add error handling**: Add situation-specific handling in Step 6
