# PPQA 셀프 감사

프로젝트의 프로세스 준수 셀프 감사(PPQA Audit)를 실행합니다.
체크리스트 항목을 자동으로 점검하고 결과를 보고합니다.

## 사용자 입력
$ARGUMENTS

## 프로젝트 설정 테이블

$ARGUMENTS에서 프로젝트명을 확인한다. 없으면 사용자에게 질문한다.

| 프로젝트명 | 키워드 | 메인 브랜치 | 커밋 형식 | 컨벤션 시작 | ITSM 시작 |
|-----------|--------|-----------|----------|-----------|----------|
| NEPES_AI_AGENTS | naa | main | type: 설명 | v2.0 | v20.1 |
| APP_RMSPAGE | app-rmspage | develop | type: 설명 | v0.1.0 | v2.4.3 |
| RMSSERVER | rmsserver | master | type(MODEL): 설명 | v1.0.0 | v1.0.1 |
| YTAP | ytap | master | type(EQP_ID): 설명 | v0.0.1 | v0.0.3 |
| YTAP_MANAGER | ytap-mgr | master | type: 설명 | v1.0.1 | v1.0.14 |

## 수행 절차

### 1단계: 점검 대상 커밋 수집

```bash
# {컨벤션 시작} 이후 전체 커밋 (커밋 컨벤션, 브랜치 전략 점검용)
git log {컨벤션 시작}..HEAD --oneline

# {ITSM 시작} 이후 커밋 (ITSM 번호 점검용)
git log {ITSM 시작}..HEAD --oneline
```

### 2단계: 커밋 컨벤션 준수 점검

{컨벤션 시작} 이후의 커밋 메시지를 검사한다.

```bash
git log {컨벤션 시작}..HEAD --oneline --no-merges
```

점검 항목:
- [A1] 모든 커밋이 프로젝트의 {커밋 형식}을 따르는가
  - 허용 type: feat, fix, improve, docs, refactor, chore
  - "merge:" 접두사는 머지 커밋이므로 이 점검에서 제외
- [A2] "chore: bump version" 외에 type이 누락된 커밋이 없는가

### 3단계: ITSM 번호 연결 점검

{ITSM 시작} 이후의 커밋을 검사한다.

```bash
# 대표 커밋 (feat, fix, improve, docs, refactor)
git log {ITSM 시작}..HEAD --oneline --no-merges --grep="^feat\|^fix\|^improve\|^docs\|^refactor"

# 머지 커밋
git log {ITSM 시작}..HEAD --oneline --merges
```

점검 항목:
- [B1] feat/fix/improve/docs/refactor 커밋에 (#ITSM-XXXX) 가 포함되어 있는가
- [B2] merge 커밋에 (#ITSM-XXXX) 가 포함되어 있는가
- [B3] chore(bump) 커밋은 ITSM 번호 없어도 OK (점검 제외)

### 4단계: 브랜치 전략 준수 점검

```bash
# {컨벤션 시작} 이후 {메인 브랜치} 위의 직접 커밋 확인
git log {컨벤션 시작}..HEAD --oneline --no-merges --first-parent {메인 브랜치}

# 머지 커밋 확인
git log {컨벤션 시작}..HEAD --oneline --merges --first-parent {메인 브랜치}
```

점검 항목:
- [C1] {메인 브랜치}에 직접 커밋이 없는가 ("chore: bump version" 제외)
- [C2] 모든 기능 변경이 feature 브랜치를 통해 --no-ff 머지되었는가

### 5단계: 결과 보고

아래 마크다운 형식으로 코드블록 안에 출력한다. Loop에 복사하여 사용한다.

````
```
## PPQA 셀프 감사 결과 ({프로젝트명})

**감사일:** {오늘 날짜}
**점검 범위:** {직전 감사 이후 ~ 현재 / 전체 (최초 감사)}

### 1. 커밋 컨벤션 준수 ({컨벤션 시작} 이후)

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| A1 | {커밋 형식} 형식 준수 | {OK/NG} | {상세} |
| A2 | type 누락 커밋 없음 | {OK/NG} | {상세} |

### 2. ITSM 번호 연결 ({ITSM 시작} 이후)

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| B1 | 대표 커밋 ITSM 포함 | {OK/NG} | {상세} |
| B2 | merge 커밋 ITSM 포함 | {OK/NG} | {상세} |

### 3. 브랜치 전략 준수 ({컨벤션 시작} 이후)

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| C1 | {메인 브랜치} 직접 커밋 없음 | {OK/NG} | {상세} |
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
