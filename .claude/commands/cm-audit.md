# 형상 감사 (CM Audit)

프로젝트의 형상 감사(CM Audit)를 실행합니다.
체크리스트 항목을 자동으로 점검하고 결과를 보고합니다.

## 사용자 입력
$ARGUMENTS

## 프로젝트 설정 테이블

$ARGUMENTS에서 프로젝트명을 확인한다. 없으면 사용자에게 질문한다.

| 프로젝트명 | 키워드 | 메인 브랜치 | 버전 소스 | 버전 추출 방법 |
|-----------|--------|-----------|----------|--------------|
| NEPES_AI_AGENTS | naa | main | .claude/version.txt + CLAUDE.md | "현재 버전: v{x.y.z}" 행에서 추출 |
| APP_RMSPAGE | app-rmspage | develop | ./VERSION | 첫 줄의 첫 토큰 (예: "2.4.3 chore: ...") |
| RMSSERVER | rmsserver | master | ./VERSION | 파일 전체 (버전 번호만 기록) |
| YTAP | ytap | master | src/Common/Version/YTAPVersion.java | VERSION = "{x.y.z}" 상수에서 추출 |
| YTAP_MANAGER | ytap-mgr | master | ./VERSION | 파일 전체 (버전 번호만 기록) |

## 수행 절차

### 1단계: 태그 정합성 점검

아래 값을 수집하여 비교한다.

```bash
# 최신 태그
git describe --tags --abbrev=0

# 버전 소스 파일에서 버전 추출 (프로젝트별 방법 참조)
```

점검 항목:
- [A1] 최신 태그 == 버전 소스 파일의 버전 (태그 "v" 접두사 고려하여 비교)
- [A2] (NEPES_AI_AGENTS만) 최신 태그 == CLAUDE.md 첫 줄 버전
- [A3] 최신 태그가 {메인 브랜치} 위에 존재하는가

```bash
# A3 확인
git branch --contains $(git rev-list -n 1 $(git describe --tags --abbrev=0)) | grep {메인 브랜치}
```

### 2단계: 태그 유형 점검

최근 5개 태그의 유형과 메시지를 확인한다.

```bash
git for-each-ref refs/tags --sort=-creatordate --format='%(refname:short) | %(objecttype)' --count=5
git tag -l --sort=-creatordate --format='%(refname:short) | %(contents:subject)' | head -5
```

점검 항목:
- [B1] 최근 태그가 모두 annotated 태그인가 (objecttype == tag)
- [B2] 태그 메시지에 커밋 메시지 제목이 포함되어 있는가 (버전 번호만 있으면 NG)

### 3단계: 브랜치 상태 점검

```bash
git branch
git log {메인 브랜치} --oneline --no-merges --count=10
```

점검 항목:
- [C1] {메인 브랜치} 외에 불필요한 feature 브랜치가 남아 있지 않은가
- [C2] {메인 브랜치}에 직접 커밋이 없는가 ("chore: bump version" 외의 직접 커밋이 없어야 함)

### 4단계: 변경 이력 정합성 점검 (NEPES_AI_AGENTS, APP_RMSPAGE만)

```bash
git tag -l | wc -l
```

버전 파일의 변경 이력 항목 수와 태그 수를 비교한다.

점검 항목:
- [D1] 버전 파일 이력 항목 수와 태그 수가 일치하는가
- [D2] 최신 이력 항목이 최신 태그 버전과 일치하는가

다른 프로젝트는 이 단계를 건너뛴다.

### 5단계: 원격 동기화 점검

```bash
git push origin --tags --dry-run 2>&1
```

점검 항목:
- [E1] 로컬 태그가 원격에 모두 push 되었는가

### 6단계: 연동 무결성 자동 검증 (NEPES_AI_AGENTS만)

```bash
node .claude/scripts/integrity-check.js
```

점검 항목:
- [F1] 스크립트 exit code가 0인가 (전체 PASS)
- [F2] FAIL 항목이 있으면 상세 내용을 감사 결과에 포함

**사용자가 상세 정보를 요청하면** `--verbose` 옵션으로 재실행한다.

다른 프로젝트는 이 단계를 건너뛴다.

### 7단계: 결과 보고

아래 마크다운 형식으로 코드블록 안에 출력한다. Loop에 복사하여 사용한다.

````
```
## 형상 감사 결과 ({프로젝트명})

**감사일:** {오늘 날짜}

### 1. 태그 정합성

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| A1 | 태그-버전 파일 일치 | {OK/NG} | {상세} |
| A2 | 태그-CLAUDE.md 일치 | {OK/NG/N/A} | {NAA만} |
| A3 | 태그 위치 ({메인 브랜치}) | {OK/NG} | {상세} |

### 2. 태그 유형

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| B1 | annotated 태그 여부 | {OK/NG} | {상세} |
| B2 | 태그 메시지 포함 | {OK/NG} | {상세} |

### 3. 브랜치 상태

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| C1 | 잔여 feature 브랜치 | {OK/NG} | {상세} |
| C2 | {메인 브랜치} 직접 커밋 여부 | {OK/NG} | {상세} |

### 4. 변경 이력 정합성 (해당 프로젝트만)

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| D1 | 이력-태그 수 일치 | {OK/NG/N/A} | {상세} |
| D2 | 최신 이력-태그 일치 | {OK/NG/N/A} | {상세} |

### 5. 원격 동기화

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| E1 | 태그 push 상태 | {OK/NG} | {상세} |

### 6. 연동 무결성 (NAA만)

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| F1 | integrity-check 전체 PASS | {OK/NG/N/A} | {상세} |

### 종합: {전체 OK 수}/{전체 항목 수} 통과

### NG 조치 필요 항목 (NG가 없으면 이 섹션 생략)

**[{항목 ID}]** {상세 내용 및 조치 방법}
```
````

NG 항목이 있으면 각 항목에 대해 조치 방법을 안내한다.
