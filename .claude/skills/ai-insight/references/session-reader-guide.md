# Session File Reading Guide

Claude Code/Desktop conversation history is stored as local JSONL files. This guide defines file locations, structure, and parsing methods.

---

## 1. Data Source Paths

### Source A: Claude Code CLI Sessions
```
Path: ~/.claude/projects/
Structure: {project-path-encoded}/*.jsonl
Example: D--lgw-01-Source-01-Git-trunk/abc123.jsonl
```
- Directory names are the original paths with `/`, `\`, `:` replaced by `-`
- Each `.jsonl` file is one conversation session
- Files under `subagents/` subdirectories are sub-agents — **exclude**
- Also exclude the `memory/` folder

### Source B: Claude Desktop Agent Mode Sessions
```
Path: %LOCALAPPDATA%/Packages/Claude_pzs8sxrjxfjjc/LocalCache/Roaming/Claude/local-agent-mode-sessions/
Structure: {org-id}/{user-id}/{session-id}/.claude/projects/{session-name}/*.jsonl
```
- Requires recursive traversal (deeply nested structure)
- Exclude files under `subagents/`
- Exclude `audit.jsonl` (audit log)

### Source C: Claude Desktop Code Metadata (Supplementary)
```
Path: %LOCALAPPDATA%/Packages/Claude_pzs8sxrjxfjjc/LocalCache/Roaming/Claude/claude-code-sessions/
Structure: {org-id}/{user-id}/local_{session-id}.json
```
- JSON format (not JSONL)
- Contains session metadata only: sessionId, cliSessionId, title, createdAt, cwd, model
- `cliSessionId` can be used to link to Source A JSONL files

---

## 2. JSONL File Structure

Each line is one JSON object. Key types:

### User Message (type: "user")
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "Text entered by the user"
  },
  "timestamp": "2026-03-19T01:23:45.678Z",
  "cwd": "D:\\project\\01-Source\\01-Git\\trunk",
  "sessionId": "ba6f04c1-...",
  "version": "2.1.40",
  "uuid": "afeb1917-..."
}
```

### Assistant Message (type: "assistant")
```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [
      {"type": "text", "text": "Response text"},
      {"type": "tool_use", "name": "Read", "input": {"file_path": "..."}}
    ]
  },
  "timestamp": "2026-03-19T01:24:00.000Z"
}
```

### Tool Result (type: "tool_result") — can be skipped

### Queue Operation (type: "queue-operation") — skip

---

## 3. Parsing Procedure

### Step 1: Collect File List
1. Source A: Glob `*.jsonl` files under `~/.claude/projects/*/`
   - Exclude patterns: `*/subagents/*`, `*/memory/*`
2. Source B: Recursively traverse Desktop agent-mode path
   - Exclude patterns: `*/subagents/*`, `audit.jsonl`
3. Source C: Glob Desktop code-session metadata JSON files

### Step 2: Date Range Filtering (Fast Filter)
Read only the **first 2–3 lines** of each JSONL file and check `timestamp`:
- ISO 8601 format: `2026-03-19T01:23:45.678Z`
- If outside the date range, skip the entire file (performance optimization)
- For Source C JSON files, use `createdAt` (Unix ms) or `lastActivityAt` field

### Step 3: Session Information Extraction
Read the full file for files within the date range and extract:

| Field | Source | Purpose |
|-------|--------|---------|
| timestamp | `timestamp` of the first user message | Session date |
| cwd | `cwd` of the first user message | Project identification |
| user_messages | `type: "user"` → `message.content` | Understanding work content |
| tools_used | `type: "assistant"` → `tool_use.name` | Work type classification |
| files_touched | `input.file_path` of Write/Edit tools | Work scope |
| title | `title` from Source C metadata (if available) | Session title |

### Step 4: Filtering
Exclude the following sessions:
- Sessions with 0 user_messages
- System-call sessions containing only `<command-name>` tags
- One-off sessions with very short content (under 10 characters)

---

## 4. Project Identification Rules

Map project from cwd path or project directory name:

| Pattern (cwd or directory name) | Project |
|---------------------------------|---------|
| `YTAP` (contained in path) | YTAP |
| `YTAP-MANAGER` or `YTAP_MANAGER` | YTAP_MANAGER |
| `APP-RMSPAGE` or `APP_RMSPAGE` | APP_RMSPAGE |
| `RMSServer` or `RMSSERVER` | RMSSERVER |
| `01-claude-workspace` or `nepes-ai-agent` | nepes-ai-agents |
| `C--Users-{username}` (HOME directory, dynamic detection) | Claude Code Config |
| Desktop agent-mode sessions (Source B) | Claude Desktop Work |
| Other | Other |

---

## 5. Work Domain Classification Rules

Classify using session user_messages keywords + tools_used combination:

| Domain | Classification Criteria |
|--------|------------------------|
| **Development** | Write/Edit tools used + code files (.java/.py/.js/.ts/.bat/.sh) modified |
| **Analysis/Debugging** | Reading log files, keywords "error"/"bug"/"analysis"/"log", DB queries |
| **Automation/Workflow** | git-workflow related, SKILL.md/commands modification, install.bat, hook setup |
| **Design/Architecture** | EnterPlanMode used, keywords "design"/"architecture"/"MCP"/"structure" |
| **Documentation/Reports** | .md/.docx/.pptx files created, keywords "document"/"report"/"reporting" |
| **Learning/Capability** | Question-type messages ("how"/"what is"/"explain"), concept explanation requests, feature exploration |

If a session matches multiple domains, classify it into the **single domain with the highest weight**.

---

## 6. Performance Considerations

- JSONL files can range from a few MB to tens of MB
- **Parallel processing with Agent tool is recommended**: scan Source A and Source B in separate Agents simultaneously
- Always determine date filtering by reading only the beginning of the file (do not read the entire file)
- Extracting the first 200 characters of user_messages is sufficient for understanding work content
