# Command Help

Dynamically generates and displays the list of available commands and their descriptions.

## User Input

$ARGUMENTS (optional — filter keyword; if provided, show only matching commands)

## Execution Procedure

### Step 1: Read Version Information

Extract the current version from `.claude/version.txt`.

### Step 2: Scan Command Files

Use the Glob tool to scan the `.claude/commands/**/*.md` pattern and collect all command files.
**Exclude this file (help-cmd.md) from the list.**

### Step 3: Extract Description for Each Command

Read only the **first 3 lines** of each collected `.md` file using Read(limit=3) to extract the title and description.
- Line 1: `# Title` → title part of the command description
- Lines 2~3: supplementary description → used as a one-line summary

### Step 4: Generate Command Name

Generate the command name from the file path:
- `commands/analyze-log.md` → `/analyze-log`
- `commands/sub-folder/example.md` → `/sub-folder:example` (subfolders separated by `:`)

### Step 5: Categorize and Output

Categorize commands by the following criteria:
- Commands containing `git-workflow` → **Git Workflow** group
- Others → **General** group

Output in the following format:

```
📋 Available Commands ({total count})

Version: {current version} | Path: .claude/commands/

────────────────────────────────────────
🔧 General
────────────────────────────────────────

/{command name}
  {title} — {one-line description}

...

────────────────────────────────────────
🌿 Git Workflow
────────────────────────────────────────

/{command name}
  {project name} exclusive — {one-line description}

...
```

## Usage Examples

```
/help
/help git
/help code-review
```
