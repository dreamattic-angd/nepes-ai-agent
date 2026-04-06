---
name: obsidian-note
description: Automatically applies design guidelines when writing, editing, or migrating notes in an Obsidian vault. Triggered when the user requests Obsidian-related tasks such as "obsidian", "vault", "write a note", "SCM page", "move from Loop", or when using Obsidian MCP tools (write_note, patch_note, read_note, search_notes).
---

# Obsidian Note Skill

Automatically activates when Obsidian vault-related work is detected and applies design guidelines.

## When to Activate

- When the user requests "obsidian", "vault", "write a note", "edit a note", "create a page", etc.
- When using Obsidian MCP tools (`write_note`, `patch_note`, `read_note`, `search_notes`)
- When the user mentions vault folder names (SCM, EES, FDC, RMS, YTAP, MES) and requests document work
- When the user requests content migration such as "move from Loop", "migration", "convert"

## When NOT to Activate

- When only querying vault structure (`list_directory`, `read_note` for content review only)
- When the question is about Obsidian settings or plugins
- When testing MCP connection

## Task Branches

### 1. Note Write/Edit Request

Load and apply the design guide:

```
Reference file: ~/.claude/skills/obsidian-note/references/design-guide.md
```

Read this file and apply it to all note writing and editing.

### 2. Content Migration Request (Loop → Obsidian, etc.)

Load both the design guide and migration guide:

```
Reference file 1: ~/.claude/skills/obsidian-note/references/design-guide.md
Reference file 2: ~/.claude/skills/obsidian-note/references/migration-guide.md
```

Read both files and migrate according to the conversion rules.

### 3. Simple Query/Browse

Process directly with MCP tools without loading additional files.

## Output Format

- Note Write/Edit: 노트가 Obsidian vault에 design-guide.md 규칙에 따라 저장된다.
- Migration: 변환된 노트가 Obsidian vault에 저장되며, 변환 요약이 출력된다.
- Simple Query: MCP 도구 결과가 직접 출력된다.