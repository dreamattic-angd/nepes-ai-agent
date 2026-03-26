# Code Review Agent

병합 전 코드 리뷰를 자동화하는 에이전트입니다.

## 사전 요구사항
- Claude Code
- Node.js v18 이상 (Deep 모드의 Sequential Thinking MCP 자동 설치에 필요)

## 사용 방법

```
/project:code-review
/project:code-review quick        # 빠른 리뷰 (Critical만)
/project:code-review deep         # 다중 레이어 아키텍처 리뷰
```

## 리뷰 모드

| 모드  | 파일             | 용도                        | 소요 시간 |
|-------|------------------|-----------------------------|-----------|
| Full  | review-full.md   | 전체 리뷰 (4관점)           | ~15분     |
| Quick | review-quick.md  | Critical만 스캔             | ~5분      |
| Deep  | review-deep.md   | 다중 레이어 아키텍처 리뷰   | ~25분     |

## 워크플로우

```
/project:code-review
    │
    ▼
[1단계] base-branch 결정
    │  develop 있으면 develop, 없으면 main
    │
    ▼
[2단계] Diff 기반 변경사항 수집
    │  git diff {base-branch} --name-only
    │  변경된 코드만 리뷰 대상
    │
    ▼
[3단계] 4가지 관점 리뷰
    │  품질 / 로직 / 보안 / 성능
    │
    ▼
[4단계] 판정
    │  PASS / REVIEW_NEEDED / REJECT
    │
    ▼
[5단계] 리포트 생성
    │  reviews/YYYYMMDD_HHMMSS.log
    │
    ▼
    완료
```

## 판정 기준

| 판정 | 조건 | 병합 가능 |
|------|------|----------|
| PASS | Critical 0건 AND Warning 3건 이하 | 자동 병합 |
| REVIEW_NEEDED | Critical 0건 AND Warning 4건 이상 | 확인 후 병합 |
| REJECT | Critical 1건 이상 | 수정 후 재리뷰 |

## 심각도

| 등급 | 아이콘 | 의미 |
|------|--------|------|
| Critical | 🔴 | 버그, 보안취약점, 즉시 수정 필수 |
| Warning | 🟡 | 잠재적 문제, 수정 권장 |
| Suggestion | 🟢 | 개선 가능, 선택적 수정 |

## 파일 구조

```
nepes-ai-agent/
├── .mcp.json                          ← Sequential Thinking MCP (팀 공유)
└── .claude/agents/code-review/
    ├── README.txt
    ├── review-full.md
    ├── review-quick.md
    ├── review-deep.md                 ← 신규
    ├── review-summary.md
    └── reviews/
```

## 로그 관리

- **자동 정리**: 30일 이상 또는 10개 초과 시 삭제
- **반복 이슈**: `review-summary.md`에 Top 3 자동 집계
