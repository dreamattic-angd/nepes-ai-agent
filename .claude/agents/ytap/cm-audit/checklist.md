# YTAP 형상 감사 체크리스트

## 역할
형상 항목(태그, 버전 파일, 브랜치)의 일관성을 자동 점검하고 결과를 보고한다.

## 수행 절차

### 1단계: 태그 정합성 점검

아래 2개 값을 수집하여 비교한다.

```bash
# 최신 태그
git describe --tags --abbrev=0

# YTAPVersion.java의 VERSION 상수
# VERSION = "x.y.z" 형태에서 추출
```

점검 항목:
- [A1] 최신 태그 == YTAPVersion.java의 VERSION 상수
- [A3] 최신 태그가 master 브랜치 위에 존재하는가

```bash
# A3 확인: 태그가 master에 포함되는지
git branch --contains $(git rev-list -n 1 $(git describe --tags --abbrev=0)) | grep master
```

### 2단계: 태그 유형 점검

최근 5개 태그의 유형과 메시지를 확인한다.

```bash
# 태그 유형 확인
git for-each-ref refs/tags --sort=-creatordate --format='%(refname:short) | %(objecttype)' --count=5

# 태그 메시지 확인
git tag -l --sort=-creatordate --format='%(refname:short) | %(contents:subject)' | head -5
```

점검 항목:
- [B1] 최근 태그가 모두 annotated 태그인가 (objecttype == tag)
- [B2] 태그 메시지에 커밋 메시지 제목이 포함되어 있는가 (버전 번호만 있으면 NG)

### 3단계: 브랜치 상태 점검

```bash
# 로컬 브랜치 목록
git branch

# master의 최근 커밋 확인 (직접 커밋 여부)
git log master --oneline --no-merges --count=10
```

점검 항목:
- [C1] master 외에 불필요한 feature 브랜치가 남아 있지 않은가
- [C2] master에 직접 커밋이 없는가 ("chore: bump version" 외의 직접 커밋이 없어야 함)

### 4단계: 원격 동기화 점검

```bash
# 로컬에만 있고 원격에 없는 태그 확인
git push origin --tags --dry-run 2>&1
```

점검 항목:
- [E1] 로컬 태그가 원격에 모두 push 되었는가

### 5단계: 결과 보고

아래 마크다운 형식으로 코드블록 안에 출력한다. Loop에 복사하여 사용한다.

````
```
## 형상 감사 결과 (YTAP)

**감사일:** {오늘 날짜}

### 1. 태그 정합성

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| A1 | 태그-YTAPVersion.java 일치 | {OK/NG} | {상세} |
| A3 | 태그 위치 (master) | {OK/NG} | {상세} |

### 2. 태그 유형

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| B1 | annotated 태그 여부 | {OK/NG} | {상세} |
| B2 | 태그 메시지 포함 | {OK/NG} | {상세} |

### 3. 브랜치 상태

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| C1 | 잔여 feature 브랜치 | {OK/NG} | {상세} |
| C2 | master 직접 커밋 여부 | {OK/NG} | {상세} |

### 4. 원격 동기화

| 항목 | 점검 내용 | 결과 | 상세 |
|------|---------|------|------|
| E1 | 태그 push 상태 | {OK/NG} | {상세} |

### 종합: {전체 OK 수}/{전체 항목 수} 통과

### NG 조치 필요 항목 (NG가 없으면 이 섹션 생략)

**[{항목 ID}]** {상세 내용 및 조치 방법}
```
````

NG 항목이 있으면 각 항목에 대해 조치 방법을 안내한다.
