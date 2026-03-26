# PR 리뷰

GitHub Pull Request를 분석하고 코드 리뷰를 수행합니다.

대상: $ARGUMENTS (PR 번호 또는 PR URL)

## 실행 순서

1. PR 정보 수집: `.claude/agents/pr-review/review-pr.md`의 Phase 1 수행
2. 변경사항 분석: Phase 2 수행 (4관점 리뷰)
3. 리뷰 코멘트 작성: Phase 3 수행
4. 사용자 확인 후 제출: Phase 4 수행

## 사용 예시

```
PR 123번 리뷰해줘
https://github.com/user/repo/pull/123 리뷰해줘
```

## 전제 조건

- `gh` CLI가 설치되어 있고 인증이 완료된 상태
- Git 저장소가 GitHub에 연결되어 있는 상태
