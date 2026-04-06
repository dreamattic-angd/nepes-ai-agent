---
description: "AI 지침 파일 수정 command. /ai-guideline-fix [index-path]로 호출"
---

# AI Guideline Fix Command

분석 인덱스 파일을 기반으로 AI 지침 파일의 품질 문제를 수정한다.
반드시 `/ai-guideline-analyze` 실행 후 새 세션에서 호출해야 한다.

## 실행 절차

**Step 1: 입력 파싱**

`$ARGUMENTS`를 파싱하여 인덱스 파일 경로를 결정한다:
- `$ARGUMENTS`가 비어있으면 오류 출력 후 중단:
  ```
  오류: 인덱스 파일 경로를 지정해 주세요.
  예: /ai-guideline-fix .claude/analysis-index.md
  ```
- 경로가 포함되어 있으면 해당 경로를 사용한다.

`{index_dir}` = `$ARGUMENTS`에서 마지막 `/` (또는 `\`) 이후를 제거한 디렉토리 부분
- 예: `.claude/analysis-index.md` → `.claude/`
- 예: `/home/user/.claude/analysis-index.md` → `/home/user/.claude/`

**Step 2: Fixer Agent 위임**

Agent tool로 `ai-guideline-fixer`를 호출한다:

```
Fix AI guideline files based on analysis index.
Index path: {resolved_path}
Output path: {index_dir}/fix-report.md
```

**Step 3: 완료 안내 출력**

```
수정 완료.
Fix 리포트: {index_dir}/fix-report.md
```

## Usage Examples

```
/ai-guideline-fix specs/analysis-index.md
```