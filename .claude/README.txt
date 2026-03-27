# nepes-ai-agents

Claude Code 기반의 AI 에이전트 모음입니다. 반복적인 작업을 자동화하고 일관된 품질을 유지합니다.

## 빠른 시작

```bash
# SECS/GEM 스펙 분석
/project:analyze-secsgem {분석 대상}

# 코드 리뷰
/project:code-review

# 이슈 분석
/project:issue-analyze {이슈 설명}

# PR 리뷰
/project:pr-review {PR번호}

# Git 워크플로우 (프로젝트 공용 - 자동 감지)
/git-workflow

# 형상 감사 (프로젝트 지정)
/project:cm-audit {프로젝트명}

# PPQA 셀프 감사 (프로젝트 지정)
/project:ppqa-audit {프로젝트명}

# 작업 인수인계 (컨텍스트 포화 전)
/project:handoff

# CLAUDE.md 건강 점검
/project:review-claudemd
```

---

## 에이전트 목록

| 에이전트 | 상태 | 설명 | 구조 | 호출 방법 |
|----------|------|------|------|-----------|
| secsgem-analysis | ✅ 운영 | SECS/GEM Spec PDF/Word/Excel 자동 분석 | Step 기반 (7단계) | `/project:analyze-secsgem` |
| code-review | ✅ 운영 | 코드 리뷰 자동화 (4관점 분석) | 모드 기반 (Full/Quick) | `/project:code-review` |
| issue-analysis | ✅ 운영 | 이슈 근본 원인 분석 (5-Why) | Phase 기반 (4단계) | `/project:issue-analyze` |
| pr-review | ✅ 운영 | PR 코드 리뷰 자동화 (4관점 분석) | Phase 기반 (4단계) | `/project:pr-review` |
| git-workflow (통합) | ✅ 운영 | Git 워크플로우 (Git Flow, develop 브랜치, 자동 감지, NAA 포함) | Phase 기반 (4단계) | `/git-workflow` |
| ai-insight (skill) | ✅ 운영 | AI 활용 인사이트 월간 보고서 자동 생성 | Phase 기반 (3단계) | 자연어 트리거 |
| obsidian-note (skill) | ✅ 운영 | Obsidian vault 노트 디자인 가이드 자동 적용 | 가이드 기반 | 자연어 트리거 |

---

## secsgem-analysis

SECS/GEM Specification PDF/Word와 VID List Excel을 분석하여 구조화된 보고서를 생성합니다.

### 주요 기능
- PDF/Word에서 Stream/Function, CEID, ALID, VID 자동 추출
- **Word(.doc/.docx) 분석 지원** — antiword, python-docx를 활용한 텍스트/표 추출
- Excel VID List와 Spec 본문(PDF/Word) 크로스 체크
- 장비 간 비교 분석 (PRS-03 vs PRS-04 등)

### 워크플로우 (Step 기반)
```
입력: PDF/Word + Excel
    ↓
Step 1: 입력 분석 & 모드 결정
Step 2: PDF 파싱
Step 2-W: Word 파싱 (.doc→antiword, .docx→python-docx)
Step 3: Excel 파싱
Step 4: 통합 분석 + 크로스 체크
Step 5: 보고서 생성
Step 6: (선택) 비교 보고서
    ↓
출력: analysis-reports/*.md
```

**구조 특징**: 순차적 Step 실행, 입력에 따라 모드 자동 결정, Word는 PDF와 동일한 Spec 본문으로 취급

### 상세 문서
→ `.claude/agents/secsgem-analysis/README.txt`

---

## code-review

병합 전 코드 리뷰를 자동화합니다. 품질, 로직, 보안, 성능 4가지 관점에서 분석합니다.

### 주요 기능
- Diff 기반 리뷰 (변경된 코드만 분석)
- 4관점 분석 (품질/로직/보안/성능)
- 판정 시스템 (PASS/REVIEW_NEEDED/REJECT)
- 반복 이슈 자동 집계

### 워크플로우 (모드 기반)
```
모드 선택: Full (기본) / Quick (빠른 리뷰)
    ↓
Step 1: base-branch 결정 (develop/main 자동 감지)
Step 2: Diff 기반 변경사항 수집
Step 3: 4관점 리뷰 (품질/로직/보안/성능)
Step 4: 판정 및 리포트 생성
```

**구조 특징**: Phase 파일 대신 모드별 가이드 파일 (`review-full.md`, `review-quick.md`)

### 상세 문서
→ `.claude/agents/code-review/README.txt`

---

## issue-analysis

로그, 에러 메시지, 증상 설명을 기반으로 이슈의 근본 원인을 분석합니다.

### 주요 기능
- 이슈 유형 분류 (PERF/LOGIC/RUNTIME/INFRA/DATA)
- 코드 흐름 추적 및 5-Why 분석
- Devil's Advocate 독립 검증
- 신뢰도 기반 리포트 생성

### 워크플로우 (Phase 기반)

| Phase | 파일 | 역할 | 필수 |
|-------|------|------|:----:|
| 1 | `phase1-triage.md` | 이슈 접수 및 분류 | ✅ |
| 2 | `phase2-analysis.md` | 심층 분석 (코드/로그) | ✅ |
| 3 | `phase3-verification.md` | 독립 검증 (Devil's Advocate) | ✅ |
| 4 | `phase4-report.md` | 최종 리포트 생성 | ✅ |

**구조 특징**: Phase 1에서 정보 부족 시 사용자에게 질문 후 재진입

### 상세 문서
→ `.claude/agents/issue-analysis/README.txt`

---

## pr-review

Pull Request를 자동 리뷰합니다. code-review와 동일한 4관점(품질/로직/보안/성능)으로 분석합니다.

### 주요 기능
- `gh` CLI 기반 PR 정보 수집 및 Diff 분석
- 4관점 리뷰 (품질/로직/보안/성능)
- 인라인 코멘트 초안 작성
- 판정 시스템 (APPROVE/REQUEST_CHANGES/COMMENT)
- 자기 검증 단계 포함

### 워크플로우 (Phase 기반)

| Phase | 역할 | 필수 |
|-------|------|:----:|
| 1 | PR 정보 수집 (`gh pr view/diff`) | ✅ |
| 2 | 4관점 파일별 리뷰 | ✅ |
| 3 | 인라인 코멘트 + 종합 리뷰 초안 | ✅ |
| 4 | 사용자 확인 후 제출 (`gh pr review`) | ✅ |

**구조 특징**: `gh` CLI 필수, 사용자 확인 후 리뷰 제출

### 상세 문서
→ `.claude/agents/pr-review/review-pr.md`

---

## git-workflow (통합)

프로젝트 공용 Git 워크플로우입니다. `git remote get-url origin`으로 프로젝트를 자동 감지합니다.

### 특징
- **브랜치 전략**: Git Flow (develop → feature, main은 배포용)
- **버전 체계**: 3-Level (MAJOR.MINOR.PATCH)
- **버전 파일**: 프로젝트별 상이 (`./VERSION` 또는 `.claude/version.txt`)
- **버전 증가**: commit type 기반 (feat → MINOR, 나머지 → PATCH)
- **대상 프로젝트**: APP_RMSPAGE, WEB_RMSPAGE, YTAP, RMSSERVER, YTAP_MANAGER, NEPES_AI_AGENTS

### 워크플로우 (Phase 기반)

| Phase | 파일 | 역할 | 필수 |
|-------|------|------|:----:|
| 1 | `phase1-change-analysis.md` | 변경사항 분석 + ITSM 확인 + 사용자 확인 | ✅ |
| 2 | `phase2-branch-commit.md` | feature 브랜치 생성 + 커밋 | ✅ |
| 3 | `phase3-review-merge.md` | 코드 리뷰 + 버전 업데이트 + 머지 + 태그 | ✅ |
| 4 | `phase4-cleanup.md` | 정리 + 푸시 안내 | ✅ |

**구조 특징**: 프로젝트 설정 테이블로 차이점(메인 브랜치명, 소스 버전 파일, 리뷰 레이어) 관리

### 상세 문서
→ `.claude/agents/git-workflow/` + `.claude/commands/git-workflow.md`

---

## ai-insight (skill)

Claude Code/Desktop 대화 이력을 분석하여 AI 활용 인사이트 보고서를 자동 생성합니다. Max Plan 월간 결재 근거 보고서로 활용됩니다.

### 주요 기능
- JSONL 세션 파일 자동 수집 (CC CLI + Desktop Agent 모드)
- Python 스크립트 기반 고속 파싱 (수십 초 이내)
- 5축 분석 프레임워크 (활용 영역/생산성/패턴/역량/ROI)
- 경영진 보고 톤의 마크다운 보고서 출력

### 워크플로우 (Phase 기반)
```
Phase 0: 날짜 범위 파싱
Phase 1: Python 스크립트로 JSONL 일괄 수집 → 압축 JSON 출력
Phase 2~3: LLM이 분류 + 보고서 작성
    ↓
출력: ~/.claude/skills/ai-insight/reports/AI_활용_인사이트_보고서_{날짜}.md
```

**구조 특징**: Phase 1은 스크립트(기계적 반복), Phase 2~3은 LLM(판단 필요) 하이브리드

### 상세 문서
→ `.claude/skills/ai-insight/SKILL.md`

---

## obsidian-note (skill)

Obsidian vault에 노트를 작성/수정할 때 디자인 가이드를 자동 적용합니다.

### 주요 기능
- Callout, 태그, frontmatter 등 디자인 가이드 자동 적용
- Loop/외부 소스에서 Obsidian으로 마이그레이션 지원
- MCP 도구(write_note, patch_note 등) 사용 시 자동 트리거

### 상세 문서
→ `.claude/skills/obsidian-note/SKILL.md`

---

## 설치 및 사용

### 글로벌 설치 (install.bat)

`install.bat`을 실행하면 `.claude/` 디렉토리의 내용이 `~/.claude/`로 배포된다.

```bash
# 프로젝트 루트에서 실행
install.bat
```

**배포 대상 (.claude/ → ~/.claude/):**
- `.claude/` 전체 → robocopy 배포 (`settings.json`, `settings.local.json` 제외)
- `settings.json` → 보존형 병합 (개인 설정 보존)
- `.mcp.json` → 배포 서버 덮어쓰기 + 사용자 MCP 서버 보존
- `CLAUDE.md` → 프로젝트 루트에서 글로벌로 배포 (마커 기반 병합)
- 배포 후 `install-verify.js`로 서브디렉토리 존재 검증

---

## 폴더 구조

```
프로젝트 루트/
├── CLAUDE.md                        ← 프로젝트 + 글로벌 공용 규칙 (배포 시 ~/.claude/로 복사)
├── install.bat                      ← 글로벌 배포 스크립트
├── install-merge.js                 ← JSON 보존형 병합
├── install-verify.js                ← 배포 검증 (서브디렉토리 존재 확인)
└── .claude/                         ← 개발환경 겸 배포 소스 (단일 소스)
    ├── README.txt                   ← 이 파일 (프로젝트 개요)
    ├── DESIGN.md                    ← 설계 결정 기록 (ADR)
    ├── version.txt                  ← 버전 관리
    ├── settings.json                ← Claude Code 설정 (hooks, statusLine) %USERPROFILE% 절대경로
    ├── .mcp.json                    ← MCP 서버 설정 → 배포 시 merge
    ├── log-analyzer/                ← 로그 분석 도구 (FTP 로그 수집)
    │   ├── fetch_log.py             ← 로그 수집 스크립트
    │   ├── config.json              ← FTP/서버 접속 설정 (__USERPROFILE__ 런타임 치환)
    │   └── eqp-info.json            ← 설비 정보 캐시 (DB에서 자동 생성)
    ├── hooks/                       ← PreToolUse/PostToolUse Hook + 유틸리티
    │   ├── check-db-write.js        ← DB write SQL 차단
    │   ├── check-dangerous-cmd.js   ← 위험 시스템/git 명령어 차단
    │   ├── check-sensitive-write.js ← 민감 파일 Write/Edit 차단
    │   ├── check-read-size.js       ← 대용량 파일 Read 사전 차단
    │   ├── auto-crlf.js             ← .bat/.cmd CRLF 자동 변환 (PostToolUse)
    │   ├── post-compact-notice.js   ← 컨텍스트 압축 알림
    │   ├── checkpoint.js            ← Phase 체크포인트 영속화 유틸리티
    │   ├── log-workflow.js          ← 워크플로우 실행 로그 JSONL 유틸리티
    │   ├── failure-logger.js        ← 실패 이벤트 로깅 + 자동 로테이션
    │   └── failure-registry.js      ← 반복 실패 패턴 감지 + 증류
    ├── scripts/                     ← 유틸리티 스크립트
    │   ├── status-line.js           ← 커스텀 상태 라인
    │   ├── integrity-check.js       ← 연동 무결성 검증
    │   ├── workflow-stats.js        ← 워크플로우 실행 통계
    │   └── eval-runner.js           ← Eval 골든 셋 실행기
    ├── commands/                    ← 슬래시 커맨드 진입점
    │   ├── analyze-log.md           ← 로그 분석
    │   ├── analyze-secsgem.md       ← SECS/GEM Spec 분석
    │   ├── cm-audit.md              ← 형상 감사
    │   ├── code-review.md           ← 코드 리뷰
    │   ├── distill-failures.md      ← 실패 패턴 증류
    │   ├── git-workflow.md          ← 전체 프로젝트 공용 Git 워크플로우 (자동 감지)
    │   ├── handoff.md               ← 작업 인수인계 문서 생성
    │   ├── help-cmd.md              ← 커맨드 도움말
    │   ├── issue-analyze.md         ← 이슈 분석
    │   ├── monitoring-report.md     ← 하네스 모니터링 리포트
    │   ├── ppqa-audit.md            ← PPQA 셀프 감사
    │   ├── pr-review.md             ← PR 리뷰
    │   └── review-claudemd.md       ← CLAUDE.md 건강 점검
    ├── agents/                      ← 에이전트 구현
    │   ├── secsgem-analysis/
    │   │   ├── README.txt
    │   │   ├── guide.md             ← 인덱스 (역할+규칙+개요, ~90줄)
    │   │   ├── guide-input.md       ← 입력 처리 (0단계~1-E단계, lazy load)
    │   │   ├── guide-analysis.md    ← 분석 (3~4단계, lazy load)
    │   │   ├── guide-report.md      ← 보고서 생성 (5단계, lazy load)
    │   │   ├── guide-error.md       ← 에러/병렬 처리 (6단계, lazy load)
    │   │   ├── secsgem-specs/       ← 입력 (PDF, Word, Excel)
    │   │   └── analysis-reports/    ← 출력 (보고서 + 중간 산출물)
    │   │       └── extract/         ← 중간 산출물 (자동 생성, git 미추적)
    │   ├── code-review/
    │   │   ├── README.txt
    │   │   ├── review-full.md
    │   │   ├── review-quick.md
    │   │   ├── review-summary.md
    │   │   └── reviews/             ← 리뷰 로그
    │   ├── issue-analysis/
    │   │   ├── README.txt
    │   │   ├── phase1-triage.md
    │   │   ├── phase2-analysis.md
    │   │   ├── phase3-verification.md
    │   │   ├── phase4-report.md
    │   │   ├── logs/                ← 분석 로그 (git 미추적)
    │   │   └── reports/             ← 분석 리포트 (git 미추적)
    │   ├── pr-review/
    │   │   └── review-pr.md
    │   └── git-workflow/             ← 전체 프로젝트 공용 Git 워크플로우
    │       ├── phase1-change-analysis.md
    │       ├── phase2-branch-commit.md
    │       ├── phase3-review-merge.md
    │       └── phase4-cleanup.md
    ├── evals/                       ← Eval 골든 셋
    │   └── git-workflow/            ← git-workflow 검증 케이스 (7개)
    └── skills/                      ← Skill 구현 (자연어 트리거)
        ├── ai-insight/
        │   ├── SKILL.md
        │   ├── references/          ← 보고서 지침, 세션 리더 가이드
        │   └── scripts/             ← Python 파싱 스크립트
        └── obsidian-note/
            ├── SKILL.md
            └── references/          ← 디자인 가이드, 마이그레이션 가이드
```

---

## 설계 결정 배경

핵심 설계 결정(Phase 구조, Hook 선택, JSONL 포맷 등)의 이유는 `.claude/DESIGN.md`를 참조하세요.

---

## 버전 정보

현재 버전 및 변경 이력은 `.claude/version.txt`를 참조하세요.
