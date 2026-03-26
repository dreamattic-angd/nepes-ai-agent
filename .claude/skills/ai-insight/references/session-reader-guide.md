# 세션 파일 읽기 가이드

Claude Code/Desktop 대화 이력은 로컬 JSONL 파일로 저장된다. 이 가이드는 파일 위치, 구조, 파싱 방법을 정의한다.

---

## 1. 데이터 소스 경로

### 소스 A: Claude Code CLI 세션
```
경로: ~/.claude/projects/
구조: {프로젝트-경로-인코딩}/*.jsonl
예시: D--lgw-01-Source-01-Git-trunk/abc123.jsonl
```
- 디렉토리명은 원래 경로의 `/`, `\`, `:`를 `-`로 치환한 형태
- 각 `.jsonl` 파일이 하나의 대화 세션
- `subagents/` 하위 폴더의 파일은 서브에이전트이므로 **제외**
- `memory/` 폴더도 제외

### 소스 B: Claude Desktop 에이전트 모드 세션
```
경로: %LOCALAPPDATA%/Packages/Claude_pzs8sxrjxfjjc/LocalCache/Roaming/Claude/local-agent-mode-sessions/
구조: {org-id}/{user-id}/{session-id}/.claude/projects/{session-name}/*.jsonl
```
- 재귀 탐색 필요 (깊은 중첩 구조)
- `subagents/` 하위 파일 제외
- `audit.jsonl`은 감사 로그이므로 제외

### 소스 C: Claude Desktop Code 메타데이터 (보조)
```
경로: %LOCALAPPDATA%/Packages/Claude_pzs8sxrjxfjjc/LocalCache/Roaming/Claude/claude-code-sessions/
구조: {org-id}/{user-id}/local_{session-id}.json
```
- JSON 형식 (JSONL 아님)
- 세션 메타정보만 포함: sessionId, cliSessionId, title, createdAt, cwd, model
- `cliSessionId`를 통해 소스 A의 JSONL 파일과 연결 가능

---

## 2. JSONL 파일 구조

각 줄이 하나의 JSON 객체. 주요 타입:

### 사용자 메시지 (type: "user")
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "사용자가 입력한 텍스트"
  },
  "timestamp": "2026-03-19T01:23:45.678Z",
  "cwd": "D:\\project\\01-Source\\01-Git\\trunk",
  "sessionId": "ba6f04c1-...",
  "version": "2.1.40",
  "uuid": "afeb1917-..."
}
```

### 어시스턴트 메시지 (type: "assistant")
```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [
      {"type": "text", "text": "응답 텍스트"},
      {"type": "tool_use", "name": "Read", "input": {"file_path": "..."}}
    ]
  },
  "timestamp": "2026-03-19T01:24:00.000Z"
}
```

### 도구 결과 (type: "tool_result") — 스킵 가능

### 큐 오퍼레이션 (type: "queue-operation") — 스킵

---

## 3. 파싱 절차

### Step 1: 파일 목록 수집
1. 소스 A: `~/.claude/projects/*/` 하위 `*.jsonl` 파일 Glob
   - 제외 패턴: `*/subagents/*`, `*/memory/*`
2. 소스 B: Desktop agent-mode 경로 재귀 탐색
   - 제외 패턴: `*/subagents/*`, `audit.jsonl`
3. 소스 C: Desktop code-session 메타 JSON 파일 Glob

### Step 2: 날짜 범위 필터링 (빠른 필터)
각 JSONL 파일의 **첫 2~3줄**만 읽어서 `timestamp` 확인:
- ISO 8601 형식: `2026-03-19T01:23:45.678Z`
- 날짜 범위 밖이면 파일 전체를 스킵 (성능 최적화)
- 소스 C의 JSON 파일은 `createdAt` (Unix ms) 또는 `lastActivityAt` 필드 사용

### Step 3: 세션 정보 추출
날짜 범위 내 파일을 전체 읽어서 추출:

| 필드 | 추출 위치 | 용도 |
|------|----------|------|
| timestamp | 첫 user 메시지의 `timestamp` | 세션 날짜 |
| cwd | 첫 user 메시지의 `cwd` | 프로젝트 식별 |
| user_messages | `type: "user"` → `message.content` | 업무 내용 파악 |
| tools_used | `type: "assistant"` → `tool_use.name` | 업무 유형 분류 |
| files_touched | Write/Edit 도구의 `input.file_path` | 작업 범위 파악 |
| title | 소스 C 메타의 `title` (있으면) | 세션 제목 |

### Step 4: 필터링
아래 세션은 제외:
- user_messages가 0건인 세션
- `<command-name>` 태그만 포함된 시스템 호출 세션
- content 길이가 매우 짧은 (10자 미만) 단발성 세션

---

## 4. 프로젝트 식별 규칙

cwd 경로 또는 프로젝트 디렉토리명에서 프로젝트를 매핑:

| 패턴 (cwd 또는 디렉토리명) | 프로젝트 |
|--------------------------|---------|
| `YTAP` (경로에 포함) | YTAP |
| `YTAP-MANAGER` 또는 `YTAP_MANAGER` | YTAP_MANAGER |
| `APP-RMSPAGE` 또는 `APP_RMSPAGE` | APP_RMSPAGE |
| `RMSServer` 또는 `RMSSERVER` | RMSSERVER |
| `01-claude-workspace` 또는 `nepes-ai-agent` | nepes-ai-agents |
| `C--Users-{username}` (HOME 디렉토리, 동적 감지) | Claude Code 환경설정 |
| Desktop agent-mode 세션 (소스 B) | Claude Desktop 작업 |
| 그 외 | 기타 |

---

## 5. 업무 영역 분류 규칙

세션의 user_messages 키워드 + tools_used 조합으로 판단:

| 영역 | 판단 기준 |
|------|----------|
| **개발** | Write/Edit 도구 사용 + 코드 파일(.java/.py/.js/.ts/.bat/.sh) 수정 |
| **분석·디버깅** | 로그 파일 읽기, "에러"/"오류"/"분석"/"로그" 키워드, DB 조회 |
| **자동화·워크플로우** | git-workflow 관련, SKILL.md/commands 수정, install.bat, hook 설정 |
| **설계·아키텍처** | EnterPlanMode 사용, "설계"/"아키텍처"/"MCP"/"구조" 키워드 |
| **문서·보고서** | .md/.docx/.pptx 파일 생성, "문서"/"보고서"/"보고" 키워드 |
| **학습·역량강화** | 질문형 메시지("어떻게"/"뭐야"/"알려줘"), 개념 설명 요청, 기능 탐색 |

하나의 세션이 여러 영역에 해당하면 **가장 비중이 높은 영역** 1개로 분류.

---

## 6. 성능 고려사항

- JSONL 파일은 크기가 수 MB~수십 MB까지 될 수 있음
- **Agent 도구로 병렬 처리** 권장: 소스 A와 소스 B를 별도 Agent에서 동시 스캔
- 날짜 필터링은 반드시 파일 앞부분만 읽어서 판단 (전체 파일을 다 읽지 않음)
- user_messages는 첫 200자만 추출해도 업무 파악에 충분
