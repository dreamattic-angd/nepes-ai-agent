# 주간 보고

프로젝트의 주간 상태 보고를 자동 생성합니다.
직전 1주일간의 커밋, 태그, 변경사항을 요약합니다.

## 사용자 입력
$ARGUMENTS

## 프로젝트 매핑

| 프로젝트명 | 에이전트 경로 |
|-----------|-------------|
| app-rmspage | .claude/agents/app-rmspage/weekly-report/report.md |
| naa | .claude/agents/naa/weekly-report/report.md |
| rmsserver | .claude/agents/rmsserver/weekly-report/report.md |
| ytap | .claude/agents/ytap/weekly-report/report.md |
| ytap-mgr | .claude/agents/ytap-mgr/weekly-report/report.md |

## 실행 방법

1. $ARGUMENTS에서 프로젝트명을 확인한다
2. 프로젝트명이 없으면 사용자에게 질문한다
3. 매핑 테이블에서 해당 에이전트 경로를 찾는다
4. 보고서 생성 에이전트 파일을 읽고 순차적으로 수행한다
