---
description: "AI 지침 파일 분석 command. /ai-guideline-analyze [path]로 호출"
---

# AI Guideline Analyze Command

AI 지침 파일의 품질을 분석한다. 분석 결과로 인덱스 파일, 요약 파일, 전체 리포트를 생성한다.

## 실행 절차

**Step 1: 입력 파싱**

`$ARGUMENTS`를 파싱하여 분석 경로를 결정한다:
- `$ARGUMENTS`가 비어있으면 `.claude/` 를 기본 경로로 사용한다.
- 경로가 포함되어 있으면 해당 경로를 사용한다.

**Step 2: Analyzer Agent 위임**

Agent tool로 `ai-guideline-analyzer`를 호출한다:

```
Analyze AI guideline files.
Input path: {resolved_path}
Report dir: specs/
```

**Step 3: 완료 안내 출력**

> Note: If the Analyzer agent reports an error or stops early (e.g., path not found, tool failure, or any error message), output the error message to the user and stop. Do not print the completion block below.

```
분석 완료.
요약: specs/analysis-summary.md
전체 리포트: specs/analysis-full-report.md
수정이 필요하면 새 세션에서: /ai-guideline-fix specs/analysis-index.md
```

## Usage Examples

```
/ai-guideline-analyze
/ai-guideline-analyze .claude/
/ai-guideline-analyze .claude/agents
```