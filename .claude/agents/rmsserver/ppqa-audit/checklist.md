# RMSSERVER PPQA 셀프 감사 체크리스트

## 역할
수립된 프로세스 규칙을 실제로 준수하고 있는지 자동 점검하고 결과를 보고한다.

## 점검 범위 기준

각 점검 항목은 규칙이 적용된 시점 이후의 커밋만 대상으로 한다.

| 점검 항목 | 적용 시작 시점 |
|-----------|--------------|
| 커밋 컨벤션 | v1.0.0 |
| ITSM 번호 연결 | v1.0.1 이후 |
| 브랜치 전략 | v1.0.0 |

## 수행 절차

### 1단계: 점검 대상 커밋 수집

```bash
# v1.0.0 이후 전체 커밋 (커밋 컨벤션, 브랜치 전략 점검용)
git log v1.0.0..HEAD --oneline

# v1.0.1 이후 커밋 (ITSM 번호 점검용)
git log v1.0.1..HEAD --oneline
```

### 2단계: 커밋 컨벤션 준수 점검 (v1.0.0 이후)

v1.0.0 이후의 커밋 메시지를 검사한다.

```bash
# v1.0.0 이후 머지 커밋 제외한 일반 커밋
git log v1.0.0..HEAD --oneline --no-merges
```

점검 항목:
- [A1] 모든 커밋이 "{type}({MODEL}): {설명}" 형식을 따르는가
  - 허용 type: feat, fix, improve, docs, refactor, chore
  - MODEL: ASTROXML, GENEVA 등 RMS Model 이름
  - "merge:" 접두사는 머지 커밋이므로 이 점검에서 제외
- [A2] "chore: bump version" 외에 type이 누락된 커밋이 없는가

### 3단계: ITSM 번호 연결 점검 (v1.0.1 이후)

v1.0.1 이후의 커밋을 검사한다.

```bash
# v1.0.1 이후 대표 커밋 (feat, fix, improve, docs, refactor)
git log v1.0.1..HEAD --oneline --no-merges --grep="^feat\|^fix\|^improve\|^docs\|^refactor"

# v1.0.1 이후 머지 커밋
git log v1.0.1..HEAD --oneline --merges
```

점검 항목:
- [B1] feat/fix/improve/docs/refactor 커밋에 (#ITSM-XXXX) 가 포함되어 있는가
- [B2] merge 커밋에 (#ITSM-XXXX) 가 포함되어 있는가
- [B3] chore(bump) 커밋은 ITSM 번호 없어도 OK (점검 제외)

### 4단계: 브랜치 전략 준수 점검 (v1.0.0 이후)

```bash
# v1.0.0 이후 master 위의 직접 커밋 확인 (머지 커밋 제외)
git log v1.0.0..HEAD --oneline --no-merges --first-parent master
```

점검 항목:
- [C1] master에 직접 커밋이 없는가 ("chore: bump version" 제외)
- [C2] 모든 기능 변경이 feature 브랜치를 통해 --no-ff 머지되었는가
  (머지 커밋의 존재로 확인)

```bash
# 머지 커밋 확인
git log v1.0.0..HEAD --oneline --merges --first-parent master
```

### 5단계: 결과 보고

아래 마크다운 형식으로 코드블록 안에 출력한다. Loop에 복사하여 사용한다.

````
```
## PPQA 셀프 감사 결과 (RMSSERVER)

**감사일:** {오늘 날짜}
**점검 범위:** {직전 감사 이후 ~ 현재 / 전체 (최초 감사)}

### 1. 커밋 컨벤션 준수 (v1.0.0 이후)

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| A1 | {type}({MODEL}): {설명} 형식 준수 | {OK/NG} | {상세} |
| A2 | type 누락 커밋 없음 | {OK/NG} | {상세} |

### 2. ITSM 번호 연결 (v1.0.1 이후)

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| B1 | 대표 커밋 ITSM 포함 | {OK/NG} | {상세} |
| B2 | merge 커밋 ITSM 포함 | {OK/NG} | {상세} |

### 3. 브랜치 전략 준수 (v1.0.0 이후)

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| C1 | master 직접 커밋 없음 | {OK/NG} | {상세} |
| C2 | --no-ff 머지 사용 | {OK/NG} | {상세} |

### 종합: {전체 OK 수}/{전체 항목 수} 통과

### NG 위반 내역 (NG가 없으면 이 섹션 생략)

**[{항목 ID}] 위반 커밋:**
- {커밋 해시} {커밋 메시지}

**원인:** {원인 설명}
**조치:** {조치 내용}
```
````

NG 항목이 있으면 각 항목에 대해 위반 커밋을 구체적으로 나열한다.
이미 push된 커밋은 수정하지 않으며, 이후 동일 위반 방지를 위한 개선 조치를 안내한다.
