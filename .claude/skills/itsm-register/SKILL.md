---
name: itsm-register
description: ITSM 요청서 등록/조회/상태변경을 API로 수행합니다. Task Master 태스크 또는 사용자 입력을 기반으로 ITSM 요청서를 자동 생성하고 관리합니다.
---

# ITSM 요청서 관리 Skill

ITSM API를 통해 요청서를 등록/조회/상태변경한다.

## When to Activate

- "ITSM 등록", "요청서 등록", "ITSM에 올려줘" 등 등록 요청
- "ITSM 조회", "티켓 확인", "진행중인 티켓" 등 조회 요청
- "승인 대기 티켓", "PENDING 조회", "대기중인 티켓" 등 상태별 조회 요청
- "ITSM 완료", "티켓 완료 처리", "상태 변경" 등 상태 전환 요청
- 작업 완료 후 ITSM 요청서 생성이 필요할 때

## 프로세스

### 등록 시

1. 요청구분을 판단한다
2. 요청구분에 따라 본문 양식 파일을 읽는다:
   - 오류 수정, 현업 대응, 시스템 장애, 배치 오류 → [register-incident.md](references/register-incident.md)
   - 기능 추가, 신규 개발, 기능 수정 → [register-feature.md](references/register-feature.md)
   - 기타, 분석, 교육, 문의, 데이터 관련, 권한, 회의 등 → [register-general.md](references/register-general.md)
3. 양식에 맞춰 본문을 작성하고 사용자에게 확인받는다 (제목, 요청구분, 내용, 우선순위, 마감일, **담당자** 포함)

⛔ **이 단계에서 반드시 멈추고 사용자 응답을 기다린다.**
초안을 보여주고 사용자가 승인(Y/수정 요청)할 때까지 절대 API를 호출하지 않는다.
이전 등록의 승인이 다음 등록에 이월되지 않는다. 매 등록은 별도 확인이 필요하다.

4. API를 호출하여 등록한다 (`assigneeId` 포함)
5. 등록 성공 시 응답의 `requestId`를 `pending_tracker.json`에 추가한다 (PENDING 조회용)

### 조회/상태전환 시

[query.md](references/query.md)를 읽고 절차를 따른다.

## 인코딩 주의

Windows 환경에서 **반드시 PowerShell**을 사용한다. curl은 CP949 인코딩으로 한글이 깨진다.
`[System.Text.Encoding]::UTF8.GetBytes()` 필수.

## 인증 정보

| 항목 | 값 |
|---|---|
| API Key | 환경변수 `ITSM_API_KEY` (미설정 시 fallback: `C:\Users\lgw1156\.claude\skills\itsm-register\api_key.txt`) |
| User ID (사번) | `20251156` |
| 헤더 | `X-API-KEY`, `X-User-Id` |

## API 엔드포인트

| 용도 | Method | URL |
|---|---|---|
| 등록 | POST | `https://itsm.nepes.co.kr/api/v1/itsm/requests` |
| 내 티켓 조회 | GET | `.../my-tasks/all/{userId}` |
| 상세 조회 | GET | `.../requests/{plant}/{requestId}/with-user` |
| 상태 전환 | POST | `.../requests/{plant}/{requestId}/transition-status?userId={userId}` |
| 댓글 조회 | GET | `.../requests/{plant}/{requestId}/comments/unified` |

## 고정 필드

| 필드 | 값 |
|---|---|
| `plant` | `"00001"` |
| `businessUnit` | `"00001"` |
| `assignedDeptCd` | `"900097"` |
| `requesterId` | `"20251156"` |
| `priority` | `"MEDIUM"` (기본) |
| `assigneeId` | `"20251156"` (기본: 이길우, 등록 전 사용자에게 확인) |

## title 작성 규칙

형식: `[{프로젝트명 또는 요청구분}] {제목 내용}`

프로젝트명 결정 우선순위:
1. **프로젝트 자동 감지 성공** → `[{프로젝트명}]` 사용 (YTAP, RMSSERVER, APP_RMSPAGE, YTAP_MANAGER, nepes-ai-agents 등)
2. **프로젝트 무관 업무** (교육, 회의, 문의 등) → `[{요청구분}]` 사용
3. **식별 불가** → `[기타]` 사용

예시:
- `[YTAP] EAP 통신 모듈 WEB 전환`
- `[nepes-ai-agents] install.bat 배포 전 백업 기능 추가`
- `[교육] Claude Code 활용 교육`
- `[기타] 사내 네트워크 VPN 설정 문의`

## 요청구분 목록

`문의`, `신규 개발`, `기능 추가`, `기능 수정`, `회의`, `오류 수정`, `데이터 요청`, `데이터 변경`, `분석`, `데이터 추가`, `권한 요청`, `결재 양식 추가`, `교육`, `기타`, `현업 대응`, `배치 오류`, `시스템 장애`, `시스템 환경 설정 및 구축`

## dueDate 기본값

마감일 미지정 시 **등록일 기준 3영업일 후** (09:00:00 고정)

## editorData blocks 구조

```json
{ "type": "header", "data": { "text": "섹션제목", "level": 3 } }
{ "type": "paragraph", "data": { "text": "- 내용" } }
```

**주의:** `list` 블록 대신 `paragraph`에 `- ` 접두사로 목록 표현 (PowerShell ConvertTo-Json 배열 분해 버그 회피)

## 등록 API 호출 템플릿

```bash
powershell -Command '
$body = @"
{
  "plant": "00001",
  "title": "{title}",
  "content": { "editorData": { "blocks": [ ... ] } },
  "priority": "MEDIUM",
  "businessUnit": "00001",
  "requestType": "{requestType}",
  "assignedDeptCd": "900097",
  "requesterId": "20251156",
  "assigneeId": "20251156",
  "dueDate": "{dueDate}"
}
"@

$response = Invoke-RestMethod -Uri "https://itsm.nepes.co.kr/api/v1/itsm/requests" -Method POST -Headers @{
    "X-API-KEY" = if ($env:ITSM_API_KEY) { $env:ITSM_API_KEY } else { (Get-Content "C:\Users\lgw1156\.claude\skills\itsm-register\api_key.txt" -Raw).Trim() }
    "X-User-Id" = "20251156"
    "Content-Type" = "application/json"
} -Body ([System.Text.Encoding]::UTF8.GetBytes($body))

$response | ConvertTo-Json -Depth 5
'
```

## 참고 문서

- API 스펙: `C:\Users\lgw1156\.claude\skills\itsm-register\요청서_생성_API_스펙_AI장비파트.md`
