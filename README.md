# nepes-ai-agents

Claude Code 기반의 AI 에이전트 모음입니다. 반복적인 작업을 자동화하고 일관된 품질을 유지합니다.

---

## 개요

### 이 프로젝트는 무엇인가?

[Claude Code](https://docs.anthropic.com/en/docs/claude-code)의 확장 기능(커맨드, 에이전트, Hook)을 모아놓은 저장소입니다.
`install.bat`으로 `~/.claude/`에 배포하면, **어떤 프로젝트에서든** 슬래시 커맨드(`/커맨드명`)로 에이전트를 호출할 수 있습니다.

### 왜 필요한가?

| 문제 | 해결 |
|------|------|
| Git 커밋/브랜치/태그 규칙이 프로젝트마다 다름 | 프로젝트별 Git 워크플로우 에이전트가 자동 처리 |
| 코드 리뷰 품질이 리뷰어마다 다름 | 4관점(품질/로직/보안/성능) 자동 리뷰 |
| 장애 분석 시 로그 수집과 원인 추적이 번거로움 | 5-Why 기반 근본 원인 분석 자동화 |
| Claude Code 설정을 팀원마다 수동으로 맞춰야 함 | 보존형 병합으로 팀 설정 일괄 배포 |

### 동작 구조

```
사용자 입력                     실행 흐름
──────────                     ─────────
  /code-review  ──→  commands/code-review.md (진입점)
                         │
                         ├──→ agents/code-review/phase1-*.md
                         ├──→ agents/code-review/phase2-*.md
                         └──→ agents/code-review/phase3-*.md

  /git-workflow ──→  commands/git-workflow.md (전체 프로젝트 공용, 자동 감지)
                         │
                         └──→ agents/git-workflow/phase1~4-*.md
```

- **commands/**: 슬래시 커맨드 정의 파일. 사용자 진입점이며, 실행할 에이전트 Phase를 지정
- **agents/**: 에이전트 구현 파일. Phase별로 분리되어 단계적으로 실행
- **hooks/**: 보안 Hook. DB write 차단, 위험 명령어 차단 등 자동 실행
- **scripts/**: 유틸리티. 상태 라인 표시 등 보조 기능

### 빠른 시작

```bash
git clone <repository-url>
cd nepes-ai-agents
install.bat                    # ~/.claude/에 배포
```

배포 후 아무 프로젝트에서 Claude Code를 열고:
```
> /help-cmd                    # 사용 가능한 커맨드 목록 확인
> /code-review                 # 코드 리뷰 실행
> /git-workflow                 # Git 워크플로우 실행 (전체 프로젝트 자동 감지)
```

---

## 설치

### 사전 요구사항

- **Node.js**: `install-merge.js` 실행에 필요 (settings.json, .mcp.json, CLAUDE.md 병합)
- **Git**: 프로젝트 클론 및 Git 워크플로우 에이전트 사용
- **Claude Code**: 슬래시 커맨드 및 에이전트 실행 환경

### 설치 방법

```bash
git clone <repository-url>
cd nepes-ai-agents
install.bat
```

### install.bat 동작 상세

`install.bat`은 `.claude/` 디렉토리와 프로젝트 루트의 파일들을 `%USERPROFILE%\.claude\`(= `~/.claude/`)로 배포합니다.

| 단계 | 소스 | 대상 | 동작 |
|------|------|------|------|
| **0/7** 백업 | `~/.claude/` 기존 파일 | `~/.claude/_backup/` | 직전 1세대 백업 (덮어쓰기 전 안전망) |
| **1/7** commands 배포 | `.claude/commands/` | `~/.claude/commands/` | xcopy 덮어쓰기 (전체 복사) |
| **2/7** agents 배포 | `.claude/agents/` | `~/.claude/agents/` | xcopy 덮어쓰기 (전체 복사) |
| **3/7** hooks 배포 | `.claude/hooks/` | `~/.claude/hooks/` | xcopy 덮어쓰기 (전체 복사) |
| **4/7** scripts 배포 | `.claude/scripts/` | `~/.claude/scripts/` | xcopy 덮어쓰기 (전체 복사) |
| **5/7** log-analyzer 배포 | `.claude/log-analyzer/` | `~/.claude/log-analyzer/` | xcopy 덮어쓰기 (전체 복사) |
| **6/7** skills 배포 | `.claude/skills/` | `~/.claude/skills/` | 소스에 있는 skill만 덮어쓰기 (개인 skill 보존) |
| **7/7** 설정 병합 | `.claude/settings.json`, `.claude/.mcp.json`, `CLAUDE.md` | `~/.claude/` | 보존형 병합 (아래 상세) |

### 단계별 상세 설명

#### 0단계: 백업

기존 전역 파일을 `~/.claude/_backup/`에 복사합니다 (직전 1세대만 유지). install 후 문제 발생 시 복구 가능.

#### 1~6단계: 디렉토리 xcopy 배포

각 디렉토리를 통째로 대상에 복사합니다 (`xcopy /E /Y /I`). 기존 파일은 무조건 덮어쓰기됩니다. skills는 소스에 있는 skill 폴더만 개별 복사하여 개인 skill(itsm-register 등)을 보존합니다.

| 디렉토리 | 내용물 | 용도 |
|----------|--------|------|
| `commands/` | 슬래시 커맨드 정의 (`.md`) | `/{command}`로 에이전트 실행 |
| `agents/` | 에이전트 구현 (Phase별 `.md`) | 커맨드에서 참조하는 실행 로직 |
| `hooks/` | PreToolUse 보안 Hook (`.js`) | DB write 차단, 위험 명령어 차단, 컨텍스트 압축 알림 |
| `scripts/` | 유틸리티 스크립트 (`.js`) | 커스텀 상태 라인 등 |
| `log-analyzer/` | 로그 분석 도구 | FTP 로그 수집 스크립트 + 설비 정보 캐시 |

#### 6단계: 보존형 병합 (`install-merge.js`)

Node.js로 실행되며, 기존 사용자 설정을 보존하면서 배포 설정을 적용합니다.

**settings.json**:
- 기존 사용자 설정을 기반으로 보존하고, 배포 키(`statusLine`, `hooks`)만 추가/갱신
- `hooks`는 이벤트 레벨 병합: 배포 이벤트(`PreToolUse`, `Notification`)만 추가/갱신, 사용자의 다른 이벤트 훅은 보존
- 사용자가 설정한 `model`, `permissions` 등 모든 개인 설정이 그대로 유지됨

**.mcp.json**:
- 기존 사용자 MCP 서버를 보존하면서, 배포 MCP 서버를 추가/덮어쓰기
- 배포되는 MCP 서버: `sequential-thinking`, `context7`

**CLAUDE.md** (전역 설정):

프로젝트 루트의 `CLAUDE.md`를 `~/.claude/CLAUDE.md`에 병합합니다. 이 파일은 Claude Code가 **모든 프로젝트에서** 자동으로 읽는 전역 설정 파일입니다.

배포 내용은 마커 주석(`<!-- nepes-ai-agents:start/end -->`)으로 구분되며, **기존 사용자 내용을 보존**하면서 배포 구간만 추가/갱신합니다.

| 상황 | 동작 |
|------|------|
| 기존 파일 없음 | 그대로 복사 |
| 기존 파일에 마커 구간 있음 (재설치) | 마커 구간만 최신으로 교체, 나머지 보존 |
| 기존 파일에 마커 없음 (개인 설정만 존재) | `CLAUDE_BU.md`로 백업 + 기존 내용에 배포 내용 추가 |

> `CLAUDE_BU.md`는 안전 백업 용도이며, Claude Code가 자동으로 읽지 않습니다.

---

## 전역 CLAUDE.md 병합 방식

### 마커 기반 병합

배포되는 `CLAUDE.md` 내용은 HTML 주석 마커로 감싸져 있습니다:

```markdown
<!-- nepes-ai-agents:start -->
# nepes-ai-agents v18.1
... (배포 내용) ...
<!-- nepes-ai-agents:end -->
```

install.bat은 이 마커를 기준으로 **배포 구간만 추가/갱신**하고, 마커 밖의 사용자 내용은 그대로 유지합니다.

### 시나리오별 동작

**첫 설치 (CLAUDE.md 없음)**:
- 배포 내용 그대로 복사

**첫 설치 (개인 CLAUDE.md 이미 사용 중)**:
- `CLAUDE_BU.md`로 안전 백업
- 기존 내용 끝에 배포 내용(마커 포함) 추가
- 결과: 개인 설정 + 배포 내용이 하나의 CLAUDE.md에 공존

**재설치 / 업데이트**:
- 마커 구간만 최신 배포 내용으로 교체
- 마커 밖의 개인 내용은 그대로 보존

---

## 설치 후 확인 사항

1. **settings.json 확인**: `~/.claude/settings.json`에서 hooks와 statusLine이 정상 설정되었는지 확인
2. **.mcp.json 확인**: `~/.claude/.mcp.json`에서 기존 MCP 서버가 보존되었는지 확인
3. **CLAUDE.md 확인**: `~/.claude/CLAUDE.md`에 팀 공유 규칙이 반영되고, 기존 개인 설정이 보존되었는지 확인

---

## 설치 후 디렉토리 구조

```
%USERPROFILE%\.claude\              (= ~/.claude/)
├── CLAUDE.md                       ← 전역 규칙 (install.bat이 배포, 팀 공유)
├── CLAUDE_BU.md                 ← 기존 CLAUDE.md 백업 (자동 생성, 자동 로드 안됨)
├── settings.json                   ← Claude Code 설정 (hooks, statusLine)
├── .mcp.json                       ← MCP 서버 설정
├── commands/                       ← 슬래시 커맨드
│   ├── analyze-log.md
│   ├── analyze-secsgem.md
│   ├── code-review.md
│   ├── handoff.md
│   ├── help-cmd.md
│   ├── issue-analyze.md
│   ├── pr-review.md
│   ├── review-claudemd.md
│   ├── git-workflow.md             ← 전체 프로젝트 공용 (자동 감지)
│   └── naa/                        ← NAA 전용 커맨드 (cm-audit 등)
├── agents/                         ← 에이전트 구현
│   ├── secsgem-analysis/
│   ├── code-review/
│   ├── issue-analysis/
│   ├── pr-review/
│   ├── git-workflow/               ← 통합 Git 워크플로우 (전체 프로젝트)
│   └── naa/                        ← NAA 전용 (cm-audit, ppqa-audit, weekly-report)
├── hooks/                          ← 보안 Hook
│   ├── check-db-write.js           ← DB write SQL 차단
│   ├── check-dangerous-cmd.js      ← 위험 명령어 차단
│   └── post-compact-notice.js      ← 컨텍스트 압축 알림
├── scripts/
│   └── status-line.js              ← 커스텀 상태 라인
└── log-analyzer/
    ├── fetch_log.py                ← 로그 수집 스크립트
    ├── config.json                 ← FTP/서버 접속 설정
    └── eqp-info.json               ← 설비 정보 캐시
```

---

## 사용 가능한 커맨드

install.bat 설치 후 모든 프로젝트에서 전역 커맨드로 사용할 수 있습니다.

| 커맨드 | 설명 |
|--------|------|
| `/analyze-secsgem` | SECS/GEM Spec PDF/Word/Excel 분석 |
| `/analyze-log` | 로그 분석 |
| `/code-review` | 코드 리뷰 (4관점: 품질/로직/보안/성능) |
| `/issue-analyze` | 이슈 근본 원인 분석 (5-Why) |
| `/pr-review` | PR 코드 리뷰 |
| `/handoff` | 작업 인수인계 문서 생성 |
| `/review-claudemd` | CLAUDE.md 건강 점검 |
| `/help-cmd` | 커맨드 도움말 |
| `/git-workflow` | Git 워크플로우 (전체 프로젝트 자동 감지, NAA 포함) |

> 프로젝트 로컬에서 사용할 때는 `/project:{command}` 형태로 호출합니다.

---

## 버전 정보

현재 버전 및 변경 이력은 `.claude/version.txt`를 참조하세요.
