# 모니터링 리포트

하네스 워크플로우 실행 현황과 실패 분석 리포트를 생성한다.

## 사용자 입력

$ARGUMENTS

## 실행 절차

### 1단계: 기간 파싱

$ARGUMENTS에서 기간을 파싱한다.

| 입력 | 일수 |
|------|------|
| "이번 달", "최근 한달", 미입력 | 30 |
| "이번 주" | 7 |
| "90일", "3개월" 등 | 해당 일수 |
| 숫자만 | 해당 일수 |

기본값: 30일

### 2단계: 워크플로우 통계 수집

```bash
node "%USERPROFILE%/.claude/scripts/workflow-stats.js" --days {DAYS} --json
```

출력된 JSON을 파싱하여 stats와 failures 데이터를 확보한다.

### 3단계: 실패 패턴 분석

```bash
node -e "
  const fr = require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js');
  const patterns = fr.getRecurringPatterns({ sinceDays: {DAYS} });
  console.log(JSON.stringify(patterns));
"
```

### 4단계: Eval 결과 수집

```bash
node "%USERPROFILE%/.claude/scripts/eval-runner.js"
```

### 5단계: 리포트 생성

수집된 데이터를 아래 형식의 마크다운 보고서로 작성한다.

**출력 경로**: `~/.claude/logs/reports/monitoring-report-{YYYYMMDD}.md`

디렉토리가 없으면 생성한다.

```markdown
# 하네스 모니터링 리포트

생성일: {오늘 날짜}
기간: {시작일} ~ {종료일} ({DAYS}일)

---

## 1. 실행 요약

| 워크플로우 | 실행 | 성공 | 실패 | 중단 | 성공률 | 평균 소요시간 |
|-----------|------|------|------|------|--------|-------------|
| {각 워크플로우별 행} |

### 총평
- 전체 실행 건수: {총합}
- 전체 성공률: {가중 평균}%

## 2. 실패 유형 분석

| 유형 | 건수 | 워크플로우 |
|------|------|-----------|
| {failureType/subType별 행} |

## 3. 반복 실패 패턴

{failure-registry 출력. 패턴이 없으면 "반복 실패 패턴 없음" 표시}

## 4. 소요시간 분석

- 평균 소요시간: {avgDurationMs 포맷}
- 데이터 부족 시: "duration 데이터가 충분하지 않습니다. (기록 시작: v1.33.0)"

## 5. Eval 결과

- 총 케이스: {N}건
- PASS: {N}건
- FAIL: {N}건
- 마지막 실행: {오늘 날짜}

## 6. 권고사항

데이터를 기반으로 아래 관점에서 권고사항을 작성한다:
- 성공률이 80% 미만인 워크플로우가 있으면 → 원인 분석 권고
- 반복 실패 패턴이 있으면 → 해당 패턴의 근본 원인 해결 권고
- Eval 실패 케이스가 있으면 → 로직 수정 권고
- 데이터가 부족하면 → "모니터링 데이터 누적 후 재분석 권고"
```

### 완료 보고

```
📊 모니터링 리포트가 생성되었습니다.

파일: {출력 경로}
기간: {DAYS}일 ({시작일} ~ {종료일})
워크플로우 수: {N}개
전체 성공률: {N}%
```
