# Phase 3 — 코드 리뷰 + 버전 업데이트 + 머지

## 역할
feature 브랜치의 변경 코드를 리뷰하고, 버전을 업데이트한 뒤, develop 브랜치에 머지하고 태그를 생성한다.

## 수행 절차

### 0단계: Phase 2 출력 검증

Phase 3 시작 전에 Phase 2에서 전달받은 데이터의 필수 필드가 모두 존재하는지 확인한다.

**필수 필드:**
- 브랜치명 (현재 feature/bugfix 브랜치)
- 커밋 해시
- 커밋 메시지
- commit type
- ITSM 번호 (또는 '없음')

누락된 필드가 있으면 워크플로우를 중단하고 Phase 1부터 재실행을 안내한다:
```
⚠️ Phase 2 커밋 데이터가 불완전합니다.
누락된 항목: {누락 필드 목록}

워크플로우를 처음부터 다시 실행해주세요.
```

### 1단계: 코드 리뷰 (조건부)

**프로젝트 설정 테이블의 `코드 리뷰`가 N이면 이 단계를 건너뛰고 2단계로 진행한다.**

⚠️ 머지 전에 반드시 코드 리뷰를 수행한다.

#### 1-1. 리뷰 모드 결정

변경 파일 목록을 확인한 뒤, 아래 조건에 따라 리뷰 모드를 결정한다.

```bash
# 변경된 파일 목록
git diff develop --name-only

# 변경된 내용 (diff) — 이것이 리뷰 대상
git diff develop -- {DIFF_SOURCE_DIRS}
```

**Deep 모드 전환 조건** (하나라도 해당되면 사용자에게 제안):
- 변경 파일 8개 이상
- 프로젝트별 {DEEP_REVIEW_LAYERS} 3개 레이어 이상 동시 변경

조건 충족 시 사용자에게 확인:
```
⚠️ 변경 파일 {N}개, {레이어 목록} 동시 변경 감지
→ Deep 리뷰를 권장합니다 (~25분)

1. Deep 리뷰 진행
2. Full 리뷰로 진행 (기존대로)

선택해주세요 (1/2):
```

- 사용자가 1 선택 → `.claude/agents/code-review/review-deep.md` 로드
- 사용자가 2 선택 또는 조건 미충족 → `.claude/agents/code-review/review-full.md` 로드

#### 1-2. 변경된 코드만 리뷰

- `+` 라인 (추가/수정): **리뷰 대상** (판정 반영)
- `-` 라인 (삭제): 삭제 영향 확인 (판정 반영)
- 컨텍스트 라인 (변경 없음): 참고 사항만 (판정 미반영)

#### 1-3. 판정 결과에 따른 분기

| 판정 | 조건 | 다음 단계 |
|------|------|----------|
| ✅ PASS | Critical 0건 AND Warning ≤ 3건 | → 2단계로 진행 |
| ⚠️ REVIEW_NEEDED | Critical 0건 AND Warning ≥ 4건 | → 사용자 확인 후 2단계 |
| ❌ REJECT | Critical ≥ 1건 | → 수정 요청, 워크플로우 중단 |

**REVIEW_NEEDED 시 사용자 확인:**
```
⚠️ Warning이 {N}건 발견되었습니다.

주요 Warning:
1. {파일}:{라인} - {설명}
2. {파일}:{라인} - {설명}

그래도 병합을 진행할까요? (Y/N)
```

**REJECT 시 응답:**
```
❌ Critical 이슈가 {N}건 발견되어 병합할 수 없습니다.

즉시 수정이 필요한 항목:
1. {파일}:{라인} - {설명}

수정 후 "다시 리뷰해줘"라고 요청하세요.
```

#### 1-4. 리뷰 건너뛰기

사용자가 "리뷰 없이 머지해줘" 또는 "리뷰 스킵"이라고 요청한 경우:
```
⚠️ 코드 리뷰 없이 병합하면 품질 문제가 발생할 수 있습니다.
정말 리뷰 없이 병합할까요? (Y/N)
```
사용자가 "Y"이면 2단계로 진행한다.

---

### 2단계: 새 버전 계산

프로젝트 설정 테이블의 `버전 파일`에서 현재 버전을 읽는다.
- `./VERSION` → 파일 내용이 버전 번호 (예: `1.3.2`)
- `.claude/version.txt` → `## 현재 버전:` 행에서 버전 추출 (예: `## 현재 버전: 1.26.0` → `1.26.0`)

**사용자가 버전을 지정한 경우 (USER_VERSION이 있는 경우):**
- 자동 계산을 스킵하고 사용자 지정 버전을 그대로 사용한다.

**사용자가 버전을 지정하지 않은 경우:**

commit type에 따라 자동 계산:

| commit type | 버전 변경 | 예시 |
|-------------|----------|------|
| feat | MINOR +1, PATCH = 0 | 1.3.2 → 1.4.0 |
| fix | PATCH +1 | 1.3.2 → 1.3.3 |
| improve | PATCH +1 | 1.3.2 → 1.3.3 |
| docs | PATCH +1 | 1.3.2 → 1.3.3 |
| refactor | PATCH +1 | 1.3.2 → 1.3.3 |
| chore | PATCH +1 | 1.3.2 → 1.3.3 |

**⚠️ MAJOR는 자동 증가하지 않는다. 사용자가 직접 지정해야 한다.**

### 3단계: 버전 파일 수정 + 커밋 (feature 브랜치에서)

**feature 브랜치에서 버전 파일을 수정하고 커밋한다.**

#### 3-A. VERSION 파일 수정 (버전 파일이 `./VERSION`인 프로젝트)

`./VERSION` 파일에 새 버전 번호만 기록한다.
```
예시: 1.4.0
```

#### 3-B. version.txt 복합 파일 수정 (버전 파일이 `.claude/version.txt`인 프로젝트)

`.claude/version.txt`의 다음 섹션을 업데이트한다:

1. **현재 버전 행**: `## 현재 버전: {이전버전}` → `## 현재 버전: {새버전}`
2. **에이전트 현황 테이블**: Phase 1에서 식별된 영향 에이전트에 대해:
   - 새 에이전트 추가 시 → 테이블에 새 행 추가 (상태: ✅ 운영, 추가된 버전: {새버전})
   - 기존 에이전트 수정 시 → 상태 유지 (변경하지 않음)
   - 새로운 에이전트가 테이블에 없으면 → 새 행 추가
3. **변경 이력**: 최상단에 새 항목 추가 (`{새버전} {커밋 메시지}`)

#### 3-C. 소스 버전 파일 동기화 (설정된 프로젝트만)

프로젝트 설정 테이블에 소스 버전 파일이 지정되어 있으면 해당 파일도 수정한다.
지정되어 있지 않으면 이 단계를 건너뛴다.

**APP_RMSPAGE — `src/common/Version.java`:**
```java
public static final String VERSION = "{새버전}";
```

**YTAP — `src/Common/Version/YTAPVersion.java`:**
```java
public static final String VERSION = "{새버전}";
public static final String BUILD_DATE = "{오늘 날짜 yyyy-MM-dd}";
```

#### 3-D. CLAUDE.md 헤더 동기화 (설정 테이블 `CLAUDE.md 동기화`가 Y일 때)

프로젝트 설정 테이블의 `CLAUDE.md 동기화`가 Y이면 수행한다. N이면 건너뛴다.

`CLAUDE.md` 첫 줄의 버전을 동기화한다:
```
"# nepes-ai-agents v{이전버전}" → "# nepes-ai-agents v{새버전}"
```

#### 3-E. 커밋

```bash
# 버전 파일이 ./VERSION인 경우:
git add VERSION {소스 버전 파일 (있으면)}
git commit -m "chore: bump version to v{새버전}"

# 버전 파일이 .claude/version.txt인 경우:
git add .claude/version.txt {CLAUDE.md (동기화 Y일 때)}
git commit -m "chore: bump version to v{새버전}"
```

### 3.5단계: README 자동 갱신 (조건부)

**프로젝트 설정 테이블의 `README 자동갱신`이 Y이고 commit type이 feat일 때만 수행한다.**
그 외에는 이 단계를 건너뛴다.

#### 3.5-1. 현재 README 읽기

`.claude/README.txt` 파일을 읽고 현재 구조를 파악한다.

#### 3.5-2. 변경사항 파악

Phase 1에서 식별된 변경 내용을 확인한다:
- 새로 추가된 에이전트
- 삭제된 에이전트
- 변경된 에이전트 설명

#### 3.5-3. README 업데이트 항목 결정

**새 에이전트 추가 시:**
1. 에이전트 목록 테이블에 새 행 추가
2. 에이전트 섹션 추가 (## 에이전트명) — 주요 기능, 워크플로우, 상세 문서 링크
3. 폴더 구조 섹션 업데이트

**에이전트 삭제 시:**
1. 에이전트 목록 테이블에서 행 삭제
2. 에이전트 섹션 삭제
3. 폴더 구조 섹션 업데이트

#### 3.5-4. 사용자 확인

```
📝 README 업데이트

[변경 유형] 에이전트 추가 / 에이전트 삭제 / 구조 변경

[업데이트 항목]
  ✅ 에이전트 목록 테이블: {에이전트명} 추가
  ✅ 새 섹션 추가: ## {에이전트명}
  ✅ 폴더 구조 업데이트

이대로 진행할까요? (Y/N)
README 업데이트를 건너뛰려면 "스킵"이라고 입력해주세요.
```

사용자가 "스킵" 또는 "N"을 입력하면 이 단계를 건너뛴다.

#### 3.5-5. README 수정 + 커밋

```bash
git add .claude/README.txt
git commit -m "docs: README 업데이트 ({변경 요약})"
```

---

### 4단계: develop으로 이동 + 머지

```bash
# 1. develop 브랜치로 이동
git checkout develop

# 2. 머지 (--no-ff로 머지 커밋 생성)
git merge {feature 브랜치명} --no-ff -m "merge: {feature 브랜치명} (#ITSM-XXXX)"
# ITSM_NUMBER가 있으면: -m "merge: {feature 브랜치명} (#ITSM-{번호})"
# ITSM_NUMBER가 없음이면: -m "merge: {feature 브랜치명}"
```

**충돌 발생 시:**
```
⚠️ 머지 충돌이 발생했습니다.

충돌 파일:
  - {파일 목록}

해결 방법:
  1. 충돌 파일을 열어 <<<<<<< / ======= / >>>>>>> 마커를 확인하세요
  2. 올바른 코드를 선택하거나 수동으로 병합하세요
  3. 해결 후 "계속해줘"라고 말씀해주세요

또는:
  - "머지 취소해줘" → git merge --abort 실행 후 feature 브랜치로 복귀
  - "충돌 파일 보여줘" → git diff --name-only --diff-filter=U로 충돌 파일 확인
```

**머지 취소(abort) 시 복구 절차:**
1. `git merge --abort` 실행
2. feature 브랜치로 복귀: `git checkout {feature 브랜치명}`
3. 안내 메시지 출력:
```
↩️ 머지가 취소되었습니다. feature 브랜치로 돌아왔습니다.

다음 선택지:
  1. 충돌 원인을 수정한 후 "다시 머지해줘"
  2. develop의 최신 변경을 feature에 먼저 반영: git merge develop
  3. 워크플로우 중단
```

### 5단계: 태그 생성

```bash
git tag -a v{새버전} -m "{커밋 메시지}"
```

**태그가 이미 존재하는 경우:**
```
⚠️ 태그 v{새버전}이 이미 존재합니다.

1. 다음 버전으로 올림 (v{대안 버전})
2. 기존 태그 덮어쓰기 (비권장)
3. 워크플로우 중단

선택해주세요 (1/2/3):
```

---

### 6단계: {MAIN_BRANCH} 배포 머지 (사용자 명시적 요청 시에만)

**이 단계는 사용자가 "main으로 머지해줘", "main에 반영해줘", "배포 머지" 등 명시적으로 {MAIN_BRANCH} 머지를 요청한 경우에만 실행한다.**
일반 워크플로우에서는 이 단계를 건너뛰고 실행 완료 출력으로 진행한다.

#### 6-1. MAJOR 버전 계산

현재 버전에서 MAJOR +1, MINOR = 0, PATCH = 0으로 계산한다.

```
예시: 1.27.0 → 2.0.0
예시: 2.5.3 → 3.0.0
```

**사용자가 버전을 직접 지정한 경우** → 자동 계산을 스킵하고 사용자 지정 버전을 사용한다.

#### 6-2. develop에서 버전 파일 수정 + 커밋

develop 브랜치에서 버전 파일을 수정하고 커밋한다.
버전 파일 수정 방식은 3단계(3-A ~ 3-E)와 동일하게 적용한다.

```bash
# develop에 있는 상태에서 버전 파일 수정
# (3-A ~ 3-D와 동일한 파일 수정 로직 적용)

# 커밋
git add {버전 관련 파일들}
git commit -m "chore: bump version to v{새 MAJOR 버전}"
```

#### 6-3. {MAIN_BRANCH}로 머지

```bash
# 1. 메인 브랜치로 이동
git checkout {MAIN_BRANCH}

# 2. develop을 메인에 머지
git merge develop --no-ff -m "release: v{새 MAJOR 버전} - merge develop into {MAIN_BRANCH}"
```

**충돌 발생 시:**
```
⚠️ 머지 충돌이 발생했습니다.

충돌 파일:
  - {파일 목록}

충돌을 해결한 후 "계속해줘"라고 말씀해주세요.
```

#### 6-4. 릴리스 태그 생성

```bash
git tag -a v{새 MAJOR 버전} -m "release: v{새 MAJOR 버전}"
```

**태그가 이미 존재하는 경우:**
```
⚠️ 태그 v{새 MAJOR 버전}이 이미 존재합니다.

1. 다음 버전으로 올림 (v{대안 버전})
2. 기존 태그 덮어쓰기 (비권장)
3. 워크플로우 중단

선택해주세요 (1/2/3):
```

#### 6-5. develop으로 복귀

```bash
git checkout develop
```

---

### 실행 완료 출력

**develop 머지 (일반):**
```
✅ develop 머지 + 버전 업데이트 완료

{이전버전} → {새버전}
태그: v{새버전}

정리를 진행합니다.
```

**{MAIN_BRANCH} 배포 머지 포함 시:**
```
✅ develop 머지 + {MAIN_BRANCH} 배포 머지 완료

develop 버전: {이전버전} → {새버전} (MINOR/PATCH)
릴리스 버전: {새버전} → v{새 MAJOR 버전} (MAJOR)
태그: v{새버전} (develop), v{새 MAJOR 버전} (release)

정리를 진행합니다.
```

## 체크포인트 저장 (자동)

실행 완료 출력 후, 아래 명령을 Bash로 실행하여 진행 상태를 저장한다.
실패해도 워크플로우를 중단하지 않는다 (best-effort).

```bash
node -e "
  const cp = require(process.env.USERPROFILE + '/.claude/hooks/checkpoint.js');
  const log = require(process.env.USERPROFILE + '/.claude/hooks/log-workflow.js');
  cp.saveCheckpoint('git-workflow', 'phase3', {
    project: '{PROJECT_NAME}',
    commitType: '{COMMIT_TYPE}',
    itsm: '{ITSM_NUMBER}',
    branch: '{feature 브랜치명}',
    oldVersion: '{이전버전}',
    newVersion: '{새버전}',
    tag: 'v{새버전}',
    reviewVerdict: '{PASS / REVIEW_NEEDED / 스킵}',
    partialResults: {
      reviewDone: true,
      versionUpdated: true,
      versionCommitted: true,
      mergeDone: true,
      tagDone: true
    }
  });
  log.logWorkflow({
    workflow: 'git-workflow', phase: 3, event: 'phase3_complete',
    result: 'success',
    project: '{PROJECT_NAME}', oldVersion: '{이전버전}', newVersion: '{새버전}', tag: 'v{새버전}'
  });
"
```

`{...}` 부분은 이 phase에서 결정된 실제 값으로 치환한다.

## 실패 처리

### 점진적 복구 (Sub-Phase Checkpoint)

Phase 3는 여러 단계로 구성되어 있으므로, 체크포인트의 `partialResults`를 활용하여 완료된 단계를 건너뛸 수 있다.

체크포인트에서 재개할 때 `partialResults`가 있으면:
- `reviewDone: true` → 코드 리뷰 건너뜀
- `versionUpdated: true` → 버전 계산 및 파일 수정 건너뜀
- `versionCommitted: true` → 버전 커밋 건너뜀
- `mergeDone: true` → develop 머지 건너뜀
- `tagDone: true` → 태그 생성 건너뜀

각 sub-phase 완료 시 체크포인트를 갱신하여 부분 진행을 보존한다.

### 재시도 규칙

| 명령 | 최대 재시도 | 재시도 조건 | 재시도 불가 시 |
|------|-----------|-----------|-------------|
| 버전 파일 읽기 | 2회 | IO 에러 → 경로 확인 후 재시도 | 파일 경로와 에러를 사용자에게 보고 |
| 버전 파일 쓰기 | 1회 | IO 에러 → 재시도 | 파일 경로와 에러를 사용자에게 보고 |
| `git commit` (버전) | 1회 | pre-commit hook 실패 → 수정 후 재시도 | 사용자에게 보고 |
| `git merge` (충돌) | 0회 | 재시도 불가 — 사용자 수동 해결 필요 | 충돌 파일 목록 제공 |
| `git merge` (기타) | 1회 | 비충돌 에러 → 재시도 | 머지 중단, 사용자에게 보고 |
| `git tag` (이미 존재) | 1회 | 버전 PATCH+1로 조정 후 재시도 | 사용자에게 버전 확인 |

### 실패 기록

모든 실패 (재시도 성공 포함)를 아래 명령으로 기록한다:

```bash
node -e "
  const fl = require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js');
  fl.logFailure({
    workflow: 'git-workflow', phase: 3,
    failureType: '{TYPE}', subType: '{SUBTYPE}',
    severity: '{SEVERITY}',
    cause: '{에러 메시지}',
    context: { branch: '{브랜치명}', version: '{버전}', command: '{실행한 명령}' },
    recoveryAction: '{수행한 복구 조치}',
    resolved: {true/false},
    retryCount: {재시도 횟수}
  });
"
```

`{...}` 부분은 실제 값으로 치환한다.
