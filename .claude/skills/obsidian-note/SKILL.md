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

## Execution Phases

### Phase 0: 요청 유형 판별

사용자 메시지 및 사용 MCP 도구를 분석하여 Task Branch(1/2/3)를 결정한다.

### Phase 1: 참조 파일 로드

Branch 1/2: design-guide.md (및 migration-guide.md) Read. Branch 3: 참조 파일 로드 없이 진행.

### Phase 2: 작업 실행

결정된 Branch에 따라 노트 작성/편집/마이그레이션/조회를 수행한다.

## Output Format

- Note Write/Edit: 노트가 Obsidian vault에 design-guide.md 규칙에 따라 저장된다.
- Migration: 변환된 노트가 Obsidian vault에 저장되며, 변환 요약이 출력된다.
- Simple Query: MCP 도구 결과가 직접 출력된다.

## Uncertainty Handling

- 요청 유형 판별 불가 시: Branch 1(Note Write/Edit)로 fallback하여 design-guide.md를 로드하고 진행한다.
- design-guide.md 읽기 실패 시: 사용자에게 파일 읽기 실패를 안내하고 기본 Markdown 형식으로 노트를 작성한다.
- 마이그레이션 원본 형식 불명확 시: migration-guide.md에서 가장 유사한 규칙을 적용하고 변환 요약에 불확실 항목을 명시한다.