<!-- nepes-ai-agents:start -->
# nepes-ai-agents v1.32.1
Claude Code AI 에이전트 관리 저장소. `.claude/` 디렉토리가 `~/.claude/`로 배포된다.
- 프로젝트 커맨드: `/project:{command}`
- 전역 커맨드 (install.bat 설치 후): `/{command}`

## 프로젝트 자동 감지
`git remote get-url origin`에서 repo명을 추출하여 프로젝트를 식별한다.
- `nepes-ai-agents` → NEPES_AI_AGENTS
- `APP_RMSPAGE` → APP_RMSPAGE
- `YTAP` → YTAP
- `RMSSERVER` → RMSSERVER
- `Web_rmspage` → WEB_RMSPAGE
- `YTAP_MANAGER` → YTAP_MANAGER
- 감지 실패 시(remote 없음, repo명 불일치, 에러 등) → 사용자에게 프로젝트를 확인한 뒤 진행

## Git 워크플로우
git 작업(커밋, 브랜치, 머지 등) 요청 시 아래 규칙을 따른다. **자연어 요청이라도 반드시 해당 워크플로우 커맨드를 실행한다.**
- **전체 프로젝트** (NEPES_AI_AGENTS 포함) → `/git-workflow` 실행 (프로젝트 자동 감지)
- **차단 브랜치에서 실행된 경우** → `/git-workflow`가 즉시 종료되며, **Claude Code 기본 동작**으로 사용자의 원래 요청을 수행한다. 워크플로우의 브랜치 전략, 버전 체계, 태깅 규칙을 적용하지 않는다.
- **그 외** → 워크플로우 미정의. **Claude Code 기본 동작**으로 수행. 위 워크플로우의 브랜치 전략, 버전 체계, 태깅 규칙을 절대 적용하지 않는다.

## 코드 생성 규칙
라이브러리 관련 코드를 작성할 때는 항상 context7을 사용하여 최신 버전 문서를 참조한다.
<!-- nepes-ai-agents:end -->
