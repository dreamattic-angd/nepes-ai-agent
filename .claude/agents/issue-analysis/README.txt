# Issue Analysis Agent

로그, 에러 메시지, 증상 설명을 기반으로 이슈의 근본 원인을 분석하는 에이전트입니다.

## 사용 방법

```
/project:issue-analyze {이슈 설명}
```

### 사용 예시

```
/project:issue-analyze
운영 환경에서 특정 API 호출 시 간헐적으로 5초 이상 지연됩니다.
로그는 .claude/agents/issue-analysis/logs/error-20250205.log 파일을 참고해주세요.

/project:issue-analyze PRS-04 어제 14시경 에러 발생
(로그가 없으면 자동 다운로드 후 분석)
```

## 워크플로우

```
/project:issue-analyze {이슈 설명}
    │
    ▼
Phase -1: 로그 확보 (조건부 — 로그가 없을 때만)
    │  다운로드 경로 또는 수동 배치 경로에서 로그 확인
    │  없으면: 대상/날짜/범위 확인 → fetch_log.py로 자동 다운로드
    │
    ▼
Phase 0: Log Pre-scan (로그 파일이 있을 때)
    │  Grep 기반 에러/예외/경고 패턴 전수 스캔
    │  에러 전수 목록 + 이상 징후 탐지
    │  스캔 인덱스 파일 생성 (reports/{YYYYMMDD}-log-scan-index.md)
    │
    ▼
Phase 1: 이슈 접수 및 분류
    │  이슈 유형 분류, 정보 충분성 점검
    │  부족 시 사용자에게 질문
    │
    ▼
Phase 2: 심층 분석
    │  [필수] 로그 전수 분석 (인덱스 기반)
    │  [필수] 이상 징후 탐지 (에러가 아닌 비정상)
    │  [필수] 코드/빌드 증거 수집
    │  5-Why 분석, 최소 2개 가설 도출
    │
    ▼
Phase 3: 독립 검증 (항상 실행)
    │  분석 완전성 검증
    │  가설 반박 시도 (Devil's Advocate)
    │  누락 경로 탐색, 신뢰도 산출
    │
    ▼
Phase 4: 최종 리포트
    │  근본 원인 + 에러 전수 내역 + 패턴 분석 + 해결 방안
    │  리포트 파일 저장
    │
    ▼
    완료
```

**설계 원칙**: 분석의 완벽도가 최우선. 프로세스 효율보다 깊이를 우선한다.
SIMPLE 경로 없음 — 항상 전체 Phase를 실행한다.

## 로그 소스

Phase 0은 두 가지 경로에서 로그를 스캔합니다:

1. **자동 다운로드 경로**: `$USERPROFILE/.claude/logs/{대상}/{YYYYMMDD}/` (analyze-log 또는 Phase -1에서 다운로드)
2. **수동 배치 경로**: `logs/` 폴더에 직접 파일을 넣기

**대용량 로그:**
- 용량 제한 없이 로그 파일을 그대로 넣으면 됩니다.
- Phase 0(Log Pre-scan)이 Grep 기반으로 자동 스캔하여 핵심 이벤트를 전수 추출합니다.

## 파일 구조

```
.claude/agents/issue-analysis/
├── README.txt                 ← 이 파일
├── phase0-log-scan.md         ← Log Pre-scan (에러 전수 추출)
├── phase1-triage.md           ← 이슈 접수 및 분류
├── phase2-analysis.md         ← 심층 분석 (로그 전수 + 이상 징후 + 코드/빌드)
├── phase3-verification.md     ← 독립 검증 (Devil's Advocate)
├── phase4-report.md           ← 최종 리포트 생성
├── logs/                      ← 분석용 로그 보관 (입력)
└── reports/                   ← 분석 리포트 및 중간결과 (출력)
```
