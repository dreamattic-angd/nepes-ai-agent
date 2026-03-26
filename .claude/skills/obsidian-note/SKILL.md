---
name: obsidian-note
description: Obsidian vault에 노트를 작성, 수정, 이전할 때 자동으로 디자인 가이드를 적용합니다. 사용자가 "옵시디언", "vault", "노트 작성", "SCM 페이지", "Loop에서 옮겨" 등 Obsidian 관련 작업을 요청하거나, Obsidian MCP 도구(write_note, patch_note, read_note, search_notes)를 사용할 때 트리거됩니다.
---

# Obsidian Note Skill

Obsidian vault 관련 작업이 감지되면 자동으로 활성화되어 디자인 가이드를 적용합니다.

## When to Activate

- 사용자가 "옵시디언", "obsidian", "vault", "노트 작성", "노트 수정", "페이지 만들어" 등을 요청할 때
- Obsidian MCP 도구(`write_note`, `patch_note`, `read_note`, `search_notes`)를 사용할 때
- vault 내 폴더명(SCM, EES, FDC, RMS, YTAP, MES) 언급하며 문서 작업 요청 시
- "Loop에서 옮겨", "마이그레이션", "변환해줘" 등 콘텐츠 이전 요청 시

## When NOT to Activate

- vault 구조 조회만 할 때 (`list_directory`, `read_note`로 내용 확인만)
- Obsidian 설정/플러그인 관련 질문일 때
- MCP 연결 테스트일 때

## 작업 분기

### 1. 노트 작성/수정 요청

디자인 가이드를 로드하고 적용합니다:

```
참조 파일: ~/.claude/skills/obsidian-note/references/design-guide.md
```

이 파일을 읽고 모든 노트 작성/수정에 적용합니다.

### 2. 콘텐츠 이전 요청 (Loop → Obsidian 등)

디자인 가이드 + 마이그레이션 가이드를 모두 로드합니다:

```
참조 파일 1: ~/.claude/skills/obsidian-note/references/design-guide.md
참조 파일 2: ~/.claude/skills/obsidian-note/references/migration-guide.md
```

두 파일을 읽고 변환 규칙에 따라 마이그레이션합니다.

### 3. 단순 조회/탐색

추가 파일 로드 없이 MCP 도구로 직접 처리합니다.
