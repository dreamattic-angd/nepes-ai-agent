---
description: "AI 지침 파일(agent/command/hook/skill 등) 품질 자동 분석 및 점수화 리포트 생성"
---

# AI Guideline Analyzer

AI 지침 파일의 품질을 자동 분석하여 Static Rubric(S1-S8) + Adaptive Rubric 기반 점수와 개선 제안을 제공합니다.

## User Input

$ARGUMENTS

## Execution Procedure

### Step 1: 입력 파싱

$ARGUMENTS를 파싱하여 분석 경로와 출력 경로를 결정한다:

| 입력 형태 | 처리 |
|----------|------|
| (인자 없음) | 기본 경로 `.claude/` 사용 |
| `{path}` | 지정 경로 사용 |
| `{path} --output {output_path}` | 분석 경로 + 출력 경로 지정 |
| `--output {output_path}` | 기본 분석 경로 `.claude/` + 출력 경로 지정 |

파싱 규칙:
- `--output` 플래그가 있으면 그 다음 인자를 출력 경로로 추출
- `--output` 앞의 인자(있을 경우)를 분석 경로로 사용
- 분석 경로 미지정 시: `.claude/`
- 출력 경로 미지정 시: `{분석 경로}/guideline-analysis-report.md`

### Step 2: Agent 위임

아래 형식으로 ai-guideline-analyzer agent에게 전체 분석을 위임한다.
직접 분석 로직을 수행하지 않는다.

위임 형식:

```
Use agent ai-guideline-analyzer to analyze AI guideline files.
Input path: {resolved_path}
Output path: {output_path}
```

### Step 3: 완료 확인

모든 출력(분석 시작 메시지, 진행 상황, 분석 완료 요약, 리포트 저장 경로)은 agent가 직접 터미널에 출력한다.
분석 시작 메시지는 agent가 Phase 1 분류 완료 시점에 분석 방식이 결정된 후 직접 출력한다.
command는 별도 출력을 수행하지 않는다.

## Usage Examples

```
/ai-guideline-analyzer
/ai-guideline-analyzer .claude/agents
/ai-guideline-analyzer .claude/ --output reports/guideline-analysis.md
/ai-guideline-analyzer .claude/agents/code-reviewer.md
```
