# SECS/GEM Specification 분석 에이전트 — 설치 가이드

## 설치 방법

`.claude/` 폴더를 프로젝트 루트에 복사하면 끝입니다.

```bash
# 예시: 다른 프로젝트에 적용
cp -r .claude/ /path/to/other-project/.claude/
```

**CLAUDE.md는 수정할 필요 없습니다.** 각 프로젝트의 CLAUDE.md는 프로젝트 본연의 내용만 유지하세요.

## 사용 방법

Claude Code에서 아래와 같이 호출합니다:

```
/project:analyze-secsgem 분석 대상
```

### 사용 예시

```
/project:analyze-secsgem .claude/agents/secsgem-analysis/secsgem-specs/
```
폴더 내 모든 PDF/Excel을 스캔하여 장비별로 그룹핑 후 분석

```
/project:analyze-secsgem .claude/agents/secsgem-analysis/secsgem-specs/SECS_SPEC_PRS04.pdf .claude/agents/secsgem-analysis/secsgem-specs/VID_LIST_PRS04.xls
```
특정 PDF와 Excel 파일을 짝으로 분석

```
/project:analyze-secsgem PRS-03/ PRS-04/ 비교해줘
```
두 장비의 SECS/GEM Spec을 비교 분석

## 파일 구조

```
.claude/
├── commands/
│   └── analyze-secsgem.md              <- 슬래시 커맨드 (오케스트레이터)
└── agents/
    └── secsgem-analysis/
        ├── README.txt                  <- 설치 가이드 (이 파일)
        ├── guide.md                    <- 분석 지침서
        ├── secsgem-specs/              <- 원본 문서 (입력)
        └── analysis-reports/           <- 분석 보고서 (출력)
```

## 워크플로우

```
사용자 호출: /project:analyze-secsgem {분석 대상}
    |
    v
Step 0: 지침서 로드 (.claude/agents/secsgem-analysis/guide.md)
    |
    v
Step 1: 입력 분석 및 모드 결정
    |-- 폴더 지정 -> 폴더 스캔 & 그룹핑
    |-- 파일 지정 -> 직접 분석
    |-- 2개 이상 장비 -> 비교 분석 모드
    |
    v
Step 2-3: PDF/Excel 처리
    |
    v
Step 4: 통합 분석 + 크로스 체크
    |
    v
Step 5: 보고서 생성 -> .claude/agents/secsgem-analysis/analysis-reports/
    |
    v
Step 6: (비교 모드) 비교 보고서 생성
```

## 에이전트 확장

다른 에이전트를 추가하려면 동일한 패턴을 따릅니다:

```
.claude/
├── commands/
│   ├── analyze-secsgem.md
│   ├── issue-analyze.md                <- 새 커맨드 추가
│   └── code-review.md                  <- 새 커맨드 추가
└── agents/
    ├── secsgem-analysis/
    │   ├── guide.md
    │   ├── secsgem-specs/              <- 이 agent 전용 입력
    │   └── analysis-reports/           <- 이 agent 전용 출력
    ├── issue-analysis/                 <- 새 에이전트 추가
    │   └── reports/                    <- 이 agent 전용 출력
    └── code-review/                    <- 새 에이전트 추가
        └── reports/                    <- 이 agent 전용 출력
```

각 에이전트는 자신만의 입력/출력 폴더를 가지므로 독립적으로 관리됩니다.

## 커스터마이징

`guide.md` 파일을 프로젝트 특성에 맞게 수정할 수 있습니다:

- **분석 체크리스트 변경**: 4단계의 체크리스트 항목을 수정
- **보고서 형식 변경**: 5단계의 보고서 구조를 수정
- **에러 처리 추가**: 6단계의 상황별 대처 방법을 추가
