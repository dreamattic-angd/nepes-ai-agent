# Phase 4 — 정리

## 역할
feature 브랜치를 삭제하고 완료 보고를 출력한다.

## 수행 절차

### 1단계: feature 브랜치 삭제

```bash
git branch -d {feature 브랜치명}
```

### 2단계: 완료 보고

**develop 머지 (일반):**
```
════════════════════════════════════════
✅ 워크플로우 완료
════════════════════════════════════════

[프로젝트] {PROJECT_NAME}
[버전] {이전버전} → {새버전}
[변경] {커밋 메시지}
[브랜치] {feature 브랜치명} → develop (머지 완료, 브랜치 삭제됨)
[태그] v{새버전} 생성됨

────────────────────────────────────────
⛔ 푸시 시 태그를 반드시 포함하세요

CLI:
  git push origin develop
  git push origin v{새버전}

또는:
  git push origin develop --tags

Fork 사용 시:
  Push 버튼 → "Include tags" 체크 필수
────────────────────────────────────────
```

**{MAIN_BRANCH} 배포 머지 포함 시:**
```
════════════════════════════════════════
✅ 워크플로우 완료 (배포 머지 포함)
════════════════════════════════════════

[프로젝트] {PROJECT_NAME}
[develop 버전] {이전버전} → {새버전}
[릴리스 버전] {새버전} → v{새 MAJOR 버전}
[변경] {커밋 메시지}
[브랜치] {feature 브랜치명} → develop → {MAIN_BRANCH} (머지 완료, 브랜치 삭제됨)
[태그] v{새버전} (develop), v{새 MAJOR 버전} (release)

────────────────────────────────────────
⛔ 푸시 시 태그를 반드시 포함하세요

CLI:
  git push origin develop
  git push origin {MAIN_BRANCH}
  git push origin v{새버전}
  git push origin v{새 MAJOR 버전}

또는:
  git push origin develop {MAIN_BRANCH} --tags

Fork 사용 시:
  Push 버튼 → "Include tags" 체크 필수
────────────────────────────────────────
```

## 3단계 (선택): Draft PR 생성

**프로젝트 설정 테이블의 `Draft PR`이 Y이고, 사용자가 "PR도 만들어줘", "PR 생성", "Draft PR" 등을 요청한 경우에만 실행.**
요청이 없으면 이 단계를 건너뛴다.

```bash
# GitHub CLI로 Draft PR 생성
gh pr create --draft \
  --title "{commit type}: {커밋 메시지 요약}" \
  --body "## 변경사항
- {주요 변경 내용}

## 버전
{이전버전} → {새버전}

## 관련 태그
v{새버전}"
```

### 완료 보고

```
📝 Draft PR이 생성되었습니다.

PR URL: {PR URL}
상태: Draft (리뷰 준비 전)

Ready for Review로 전환하려면:
  gh pr ready {PR번호}
```

**주의:**
- `gh` CLI가 설치되어 있고 인증이 완료된 상태여야 한다
- `gh` 미설치 시 안내 메시지를 출력하고 건너뛴다

---

## 푸시 관련 규칙

**Claude Code에서 push를 직접 실행하지 않는다.** 사용자가 직접 수행한다.
사용자가 "푸시해줘"라고 요청하면:

```
푸시는 직접 실행해주세요.

CLI:
  git push origin develop --tags

{MAIN_BRANCH} 배포 머지도 포함된 경우:
  git push origin develop {MAIN_BRANCH} --tags

Fork:
  Push → "Include tags" 체크

⚠️ 태그 없이 Push하면 버전 이력이 유실됩니다.
```
