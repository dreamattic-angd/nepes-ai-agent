# Workflow Rules (공통 규칙)

이 파일은 슬래시 커맨드(오케스트레이터)가 실행 시 참조하는 공통 규칙입니다.

---

## Agent Architecture

슬래시 커맨드(오케스트레이터)가 5개의 전문 서브에이전트를 복잡도에 따라 호출한다.

| 역할 | 에이전트 | 파일 | 책임 범위 |
|------|---------|------|----------|
| 경량 설계 | architect | .claude/agents/architect.md | 소규모 설계 문서 작성. 코드 작성 금지 |
| 정밀 설계 | software-develop-architect | .claude/agents/software-develop-architect.md | 6 Phase 정밀 설계서 작성 (중~대규모). 코드 작성 금지 |
| 구현 | developer | .claude/agents/developer.md | 설계 기반 코드 구현. 설계 변경 금지 |
| 리뷰 | code-reviewer | .claude/agents/code-reviewer.md | 4관점 코드 리뷰. 코드 수정 금지 |
| 테스트 | tester | .claude/agents/tester.md | 테스트 작성·실행. 프로덕션 최소 수정만 허용 |

### 설계 에이전트 라우팅

오케스트레이터는 Step 0.5에서 복잡도를 판별하여 설계 에이전트를 선택한다.

| 조건 | 선택 에이전트 |
|------|-------------|
| MODE: project | 무조건 software-develop-architect |
| 사용자가 "설계서"/"아키텍처" 명시 | software-develop-architect |
| 다중 컴포넌트, 외부 연동, DB/API 설계 필요 | software-develop-architect |
| 소규모 (단일 컴포넌트, 외부 연동 없음) | architect |

**역할 분리 절대 원칙:**
- 오케스트레이터(슬래시 커맨드)는 직접 설계·코딩·리뷰·테스트하지 않는다
- 각 에이전트는 자기 역할 범위를 벗어나지 않는다

---

## Development Workflow

```
architect        developer        code-reviewer       tester
   │                │                  │                 │
   ▼                │                  │                 │
 설계 문서 작성      │                  │                 │
   │                │                  │                 │
   ▼                │                  │                 │
[CHECKPOINT-1] ── 사용자 승인 ──→     │                  │
                    ▼                  │                 │
                 코드 구현              │                 │
                    │                  │                 │
                    └──────→          ▼                 │
                              4관점 코드 리뷰            │
                                       │                 │
                                       ▼                 │
                    [CHECKPOINT-2] ── 사용자 승인 ──→    │
                                                         ▼
                                                    테스트 작성·실행
                                                         │
                                                         ▼
                                       [CHECKPOINT-3] ── 사용자 승인 → 워크플로우 완료
```

---

## Absolute Rules

1. specs/ 에 설계 문서 없이 코드 작성 시작 금지
2. 사용자 승인(y) 없이 체크포인트를 넘어가지 말 것
3. 각 단계는 반드시 해당 전문 서브에이전트에 위임할 것
4. **Critical 자동 재수행**: CHECKPOINT-2에서 Critical이 1건이라도 있으면 사용자 입력 없이 developer → code-reviewer를 자동 재실행한다
5. **git commit 금지**: 워크플로우에서 git commit을 직접 수행하지 않는다. 사용자가 별도로 진행한다

---

## Checkpoint Keywords

| 입력 | 동작 |
|------|------|
| `y` | 다음 단계 진행 |
| `n` | 현재 단계 재수행 (이유 설명 후 재시작) |
| `s` | 현재 진행 단계 및 완료 항목 출력 |

동의어도 허용: "계속"/"yes"/"ㅇ" → y, "다시"/"no"/"ㄴ" → n, "상태"/"status" → s

---

## Checkpoint Output Format

### CHECKPOINT-1 (설계 완료 후)
```
✅ [CHECKPOINT-1] {단계명} 완료.
📄 산출물: {파일 경로}
{핵심 요약 2~3줄}

→ y: 다음 단계 | n: 재수행
```

### CHECKPOINT-2 (코드 리뷰 완료 후)

**Critical이 1건이라도 있으면 → 사용자 입력 없이 자동으로 developer → code-reviewer 재실행.**
PASS 또는 REVIEW_NEEDED이 될 때까지 반복한 후 아래 형식으로 출력한다.

```
✅ [CHECKPOINT-2] 코드 리뷰 완료.
📄 리뷰 결과: {파일 경로}
🔴 Critical: N건 | 🟡 Warning: N건 | 🟢 Suggestion: N건
📋 판정: {PASS / REVIEW_NEEDED / REJECT}

주요 지적사항:
  🔴 {Critical 한 줄 요약} (있는 경우)
  🟡 {Warning 한 줄 요약} (있는 경우)
  🟢 Suggestion N건 (있는 경우)

상세: {리뷰 파일 경로} 참조

→ y: 다음 단계 | n: 수정 후 재리뷰
```

### CHECKPOINT-3 (테스트 완료 후)
```
✅ [CHECKPOINT-3] 테스트 완료.
📄 테스트 결과: {파일 경로}
✅ 통과: N/N | 커버리지: N%
상태: {PASS / FAIL}

→ y: 워크플로우 완료 | n: 재테스트
```

---

## "n" (재수행) 처리 규칙

"n" 응답 시 오케스트레이터는:
1. 현재 단계의 에이전트에게 수정 사항 전달
2. 에이전트가 재수행
3. 동일 체크포인트 다시 출력
4. 사용자 재승인 대기

---

## "s" (상태) 처리 규칙

"s" 응답 시 현재 진행 현황 테이블 출력:
```
📊 현황: {작업명}
📐 설계: {경량(architect) / 정밀(software-develop-architect)}

| Phase | 담당 에이전트 | 상태 | 산출물 |
|-------|-------------|------|--------|
| 설계 | {architect / software-develop-architect} | ✅/🔄/⏳ | {파일명} |
| 구현 | developer | ✅/🔄/⏳ | {파일명} |
| 리뷰 | code-reviewer | ✅/🔄/⏳ | {파일명} |
| 테스트 | tester | ✅/🔄/⏳ | {파일명} |
```