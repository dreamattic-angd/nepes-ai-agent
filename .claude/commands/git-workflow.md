# Git 워크플로우 (통합)

전 프로젝트 공용 Git 워크플로우. Git Flow 기반 전략(develop 브랜치)과 3-Level 버전 체계(MAJOR.MINOR.PATCH)를 사용한다.
feature/bugfix 브랜치는 develop에서 생성하고 develop에 머지한다. main은 배포 시에만 사용하며, 사용자가 명시적으로 요청할 때만 머지한다.

## 사용자 입력
$ARGUMENTS

## 프로젝트 자동 감지

`git remote get-url origin`에서 repo명을 추출하여 아래 설정 테이블에서 매칭한다.
매칭 실패 시 사용자에게 프로젝트를 확인한 뒤 진행한다.

## 프로젝트 설정 테이블

| repo명 | 프로젝트명 | 메인 브랜치 | 소스 버전 파일 | Deep 리뷰 레이어 | diff 소스 경로 | 버전 파일 | CLAUDE.md 동기화 | README 자동갱신 | 코드 리뷰 | Draft PR |
|--------|-----------|------------|--------------|----------------|--------------|----------|-----------------|----------------|----------|----------|
| APP_RMSPAGE | APP_RMSPAGE | main | src/common/Version.java | Controller/Service/Repository | src/ | ./VERSION | N | N | Y | N |
| Web_rmspage | WEB_RMSPAGE | main | (없음) | View/Composable/Store | src/ | ./VERSION | N | N | Y | N |
| YTAP | YTAP | master | src/Common/Version/YTAPVersion.java | Controller/Service/Repository | src/ | ./VERSION | N | N | Y | N |
| RMSSERVER | RMSSERVER | master | (없음) | Controller/Service/Repository | RMSWorkflow/ RMSScenario/ RMSRDL/ RMS2.1.16/ RMSConnectivity/ DCP_Base/ | ./VERSION | N | N | Y | N |
| YTAP_MANAGER | YTAP_MANAGER | master | (없음) | Controller/Servlet/Service/Manager/Repository/DAO | src/ | ./VERSION | N | N | Y | N |
| nepes-ai-agents | NEPES_AI_AGENTS | main | (없음) | (없음) | .claude/ | .claude/version.txt | Y | Y | N | Y |

## 사용자 입력 파싱

$ARGUMENTS에서 버전 지정 여부를 확인한다.
- 버전이 명시되면 → `USER_VERSION={지정값}` (Phase 3에서 자동 계산 스킵)
- 버전 미지정 → `USER_VERSION=없음` (Phase 3에서 자동 계산)

**버전이 지정되어도 모든 Phase를 반드시 실행한다.** 버전 지정은 Phase 3의 버전 계산만 오버라이드한다.

## 워크플로우 재개 확인

Phase 실행 전에 이전 체크포인트가 있는지 확인한다:

```bash
node -e "const cp=require(process.env.USERPROFILE+'/.claude/hooks/checkpoint.js').loadCheckpoint('git-workflow'); console.log(cp ? JSON.stringify(cp) : 'null')"
```

- **null** → 처음부터 시작 (Phase 1)
- **체크포인트 존재** → 사용자에게 확인:
  ```
  ℹ️ 이전 워크플로우가 {phase}까지 진행된 기록이 있습니다. ({timestamp})
  프로젝트: {data.project}, ITSM: {data.itsm}

  1. 이어서 진행 (다음 phase부터)
  2. 처음부터 다시 시작

  선택해주세요 (1/2):
  ```
  - **1** → 체크포인트의 data를 이전 phase 출력으로 사용하여 다음 phase부터 재개
  - **2** → `clearCheckpoint('git-workflow')` 실행 후 Phase 1부터 시작

## 반복 실패 패턴 확인

Phase 실행 전에 최근 반복 실패 패턴을 조회한다:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const ctx=fr.getContextForWorkflow('git-workflow'); if(ctx) console.log(ctx); else console.log('__NO_PATTERNS__');"
```

- **`__NO_PATTERNS__`** → 그대로 진행
- **패턴이 출력되면** → 해당 내용을 참고하여 동일 실패를 예방하며 진행

## 워크플로우 실행 순서

에이전트 폴더: `.claude/agents/git-workflow/`
Phase 1(phase1-change-analysis.md) → 2(phase2-branch-commit.md) → 3(phase3-review-merge.md) → 4(phase4-cleanup.md) 순서로 실행.
각 phase 파일을 해당 단계 시작 시에만 읽는다. 단계를 건너뛰지 않는다.

## 핵심 원칙
1. **Phase 1 변경사항 분석 결과는 반드시 사용자 확인을 받는다** — 변경 파일 리스트를 사용자가 검토해야 한다.
2. **버전 업데이트는 머지 직전 feature 브랜치에서만** — 커밋 단계에서 버전 파일을 건드리지 않는다.
3. **변경사항이 없으면 즉시 종료** — 불필요한 빈 커밋을 만들지 않는다.
4. **Push는 Claude가 직접 실행하지 않는다** — 사용자가 직접 수행한다.
5. **버전 증가는 commit type 기준** — feat → MINOR, 나머지(fix/docs/refactor/chore/improve) → PATCH.
6. **develop 브랜치가 기본 작업 브랜치** — feature/bugfix는 develop에서 생성하고 develop에 머지한다. main은 사용자가 명시적으로 요청할 때만 머지한다.
