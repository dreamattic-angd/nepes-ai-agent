# PPQA 셀프 감사

프로젝트의 프로세스 준수 셀프 감사(PPQA Audit)를 실행합니다.
체크리스트 항목을 자동으로 점검하고 결과를 보고합니다.

## 사용자 입력
$ARGUMENTS

## 프로젝트 매핑

| 프로젝트명 | 에이전트 경로 |
|-----------|-------------|
| app-rmspage | .claude/agents/app-rmspage/ppqa-audit/checklist.md |
| naa | .claude/agents/naa/ppqa-audit/checklist.md |
| rmsserver | .claude/agents/rmsserver/ppqa-audit/checklist.md |
| ytap | .claude/agents/ytap/ppqa-audit/checklist.md |
| ytap-mgr | .claude/agents/ytap-mgr/ppqa-audit/checklist.md |

## 실행 방법

1. $ARGUMENTS에서 프로젝트명을 확인한다
2. 프로젝트명이 없으면 사용자에게 질문한다
3. 매핑 테이블에서 해당 에이전트 경로를 찾는다
4. 체크리스트 파일을 읽고 각 항목을 순차적으로 점검한다
