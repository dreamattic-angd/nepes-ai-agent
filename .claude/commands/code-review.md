# Code Review

코드 리뷰를 실행합니다. 변경된 코드만 분석하여 품질, 로직, 보안, 성능 관점에서 검토합니다.

## 사용자 입력
$ARGUMENTS

## 실행 절차

### 1단계: 리뷰 모드 결정

사용자 입력에 따라 리뷰 모드를 결정합니다:
- `quick`, `빠른`, `간단히` → Quick 모드 (`.claude/agents/code-review/review-quick.md`)
- `deep`, `깊게`, `아키텍처` → Deep 모드 (`.claude/agents/code-review/review-deep.md`)
- 그 외 → Full 모드 (`.claude/agents/code-review/review-full.md`)

**Full 모드 자동 → Deep 전환 조건** (명시적 지시 없어도 자동 전환):
- 변경 파일 8개 이상
- Controller / Service / Repository 3개 레이어 이상 동시 변경

### 2단계: 지침 로드

해당 모드의 지침 파일을 읽고 수행합니다.

### 3단계: 리뷰 실행

지침에 따라 리뷰를 수행합니다:
1. base-branch 결정 (develop 있으면 develop, 없으면 main)
2. `git diff {base-branch}`로 변경사항 수집
3. 4가지 관점 리뷰 (Full) 또는 Critical만 스캔 (Quick)
4. 판정 및 리포트 생성

### 4단계: 결과 저장

리뷰 결과를 `.claude/agents/code-review/reviews/YYYYMMDD_HHMMSS.log`에 저장합니다.

## 사용 예시

```
/code-review              # 전체 리뷰 (Full 모드)
/code-review quick        # 빠른 리뷰 (Critical만)
/code-review deep         # Deep 리뷰 (Sequential Thinking 기반)
/code-review src/Main.java # 특정 파일 리뷰
```
