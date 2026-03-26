# ITSM 조회/상태전환

## 조회: HttpWebRequest로 GET 요청 (UTF-8 보장)

PowerShell `Invoke-RestMethod`는 한글이 깨지므로, `HttpWebRequest` + `StreamReader(UTF8)`로 직접 읽는다.

```bash
powershell -Command '
$apiKey = (Get-Content "C:\Users\lgw1156\.claude\skills\itsm-register\api_key.txt" -Raw).Trim()
$request = [System.Net.HttpWebRequest]::Create("https://itsm.nepes.co.kr/api/v1/itsm/requests/my-tasks/all/20251156")
$request.Method = "GET"
$request.Headers.Add("X-API-KEY", $apiKey)
$request.Headers.Add("X-User-Id", "20251156")
$request.Accept = "application/json"
$response = $request.GetResponse()
$stream = New-Object System.IO.StreamReader($response.GetResponseStream(), [System.Text.Encoding]::UTF8)
$json = $stream.ReadToEnd()
$stream.Close(); $response.Close()
[System.IO.File]::WriteAllText("C:\Users\lgw1156\.claude\skills\itsm-register\itsm_temp.json", $json, (New-Object System.Text.UTF8Encoding $false))
'
```

## JSON 결과 파싱 (Python)

PowerShell ConvertTo-Json은 한글을 깨뜨리므로, Python으로 파싱/출력한다.

```bash
python -c "
import json, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')
data = json.loads(pathlib.Path(r'C:\Users\lgw1156\.claude\skills\itsm-register\itsm_temp.json').read_text(encoding='utf-8'), strict=False)
# ... 필요한 처리
pathlib.Path(r'C:\Users\lgw1156\.claude\skills\itsm-register\itsm_temp.json').unlink()
"
```

## 내 티켓 조회 절차

1. PowerShell로 `/my-tasks/all/20251156` GET → temp 파일 저장
2. `pending_tracker.json` 추적 ID가 있으면 각각 상세 조회
3. Python으로 파싱 → **승인 대기 + 진행중만 출력** (완료 제외)
4. 사용자에게 테이블로 표시 (ID, 제목, 우선순위, 요청구분, 마감일)

**완료(COMPLETED) 티켓은 사용자가 명시적으로 요청할 때만 표시한다.**
예: "완료된 티켓도 보여줘", "전체 조회", "완료 포함"

## 요청서 상세 조회 절차

1. PowerShell로 `/{plant}/{requestId}/with-user` GET → temp 파일 저장
2. Python으로 파싱 → 상세 정보 출력

## 상태 전환: transition-status POST (body 없음)

```bash
powershell -Command '
$apiKey = (Get-Content "C:\Users\lgw1156\.claude\skills\itsm-register\api_key.txt" -Raw).Trim()
$request = [System.Net.HttpWebRequest]::Create("https://itsm.nepes.co.kr/api/v1/itsm/requests/00001/{requestId}/transition-status?userId=20251156")
$request.Method = "POST"
$request.Headers.Add("X-API-KEY", $apiKey)
$request.Headers.Add("X-User-Id", "20251156")
$request.Accept = "application/json"
$request.ContentLength = 0
$response = $request.GetResponse()
$stream = New-Object System.IO.StreamReader($response.GetResponseStream(), [System.Text.Encoding]::UTF8)
$json = $stream.ReadToEnd()
$stream.Close(); $response.Close()
[System.IO.File]::WriteAllText("C:\Users\lgw1156\.claude\skills\itsm-register\itsm_temp.json", $json, (New-Object System.Text.UTF8Encoding $false))
'
```

## 상태 전환 절차

1. 사용자에게 대상 requestId 확인
2. **반드시 사용자 확인 후 실행** (되돌리기 불가)
3. POST 전송 → 응답에서 새 `requestStatus` 확인
4. 결과 표시

## 상태 전이 흐름

```
PENDING_REQUESTER_APPROVAL → APPROVED → IN_DEVELOPMENT → COMPLETED
        (0/3)                  (1/3)       (2/3)           (3/3)
        [상위자 승인 필요]      [API 전환 가능 시작점]
```

- `PENDING_REQUESTER_APPROVAL` → `APPROVED`: **API 전환 불가**. 상위자가 ITSM 웹에서 승인해야 함
- `APPROVED` 이후: 한 번 호출 시 한 단계씩 전환
- COMPLETED까지 가려면 여러 번 호출 필요할 수 있음
- **COMPLETED 후에는 되돌릴 수 없음**

## PENDING 티켓 조회 (승인 대기)

목록 API(`/my-tasks/all/`)는 `PENDING_REQUESTER_APPROVAL` 상태 티켓을 반환하지 않는다.
단, **상세 조회 API(`/{plant}/{requestId}/with-user`)는 PENDING 상태도 정상 조회 가능**하다.

이를 활용하여 등록 시 requestId를 추적 파일에 저장하고, 조회 시 자동으로 PENDING 체크한다.

### 추적 파일

- 경로: `C:\Users\lgw1156\.claude\skills\itsm-register\pending_tracker.json`
- 형식: `[{"requestId": 3522, "title": "...", "registeredAt": "2026-03-25"}, ...]`

### 등록 후 추적 등록

등록 API 성공 응답에서 `requestId`를 받으면 추적 파일에 추가한다.

```bash
python -c "
import json, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')
tracker_path = pathlib.Path(r'C:\Users\lgw1156\.claude\skills\itsm-register\pending_tracker.json')
tracker = json.loads(tracker_path.read_text(encoding='utf-8')) if tracker_path.exists() else []
tracker.append({'requestId': {requestId}, 'title': '{title}', 'registeredAt': '{date}'})
tracker_path.write_text(json.dumps(tracker, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'추적 등록: #{requestId}')
"
```

### 조회 시 PENDING 자동 체크

내 티켓 조회 시 아래 순서를 따른다:

1. `/my-tasks/all/20251156` GET → 일반 목록 취득
2. `pending_tracker.json`에 추적 중인 ID가 있으면 각각 `/{plant}/{requestId}/with-user`로 상세 조회
3. 상세 조회 결과에서 `requestStatus`를 확인:
   - `PENDING_REQUESTER_APPROVAL` → 승인 대기 섹션에 표시
   - 그 외 (APPROVED, IN_DEVELOPMENT 등) → 추적 파일에서 제거 (정상 목록에 나타남)
4. 일반 목록 + 승인 대기 목록을 병합하여 사용자에게 표시

### PENDING 체크 PowerShell 템플릿

```bash
powershell -Command '
$apiKey = (Get-Content "C:\Users\lgw1156\.claude\skills\itsm-register\api_key.txt" -Raw).Trim()
$url = "https://itsm.nepes.co.kr/api/v1/itsm/requests/00001/{requestId}/with-user"
$request = [System.Net.HttpWebRequest]::Create($url)
$request.Method = "GET"
$request.Headers.Add("X-API-KEY", $apiKey)
$request.Headers.Add("X-User-Id", "20251156")
$request.Accept = "application/json"
$response = $request.GetResponse()
$stream = New-Object System.IO.StreamReader($response.GetResponseStream(), [System.Text.Encoding]::UTF8)
$json = $stream.ReadToEnd()
$stream.Close(); $response.Close()
[System.IO.File]::WriteAllText("C:\Users\lgw1156\.claude\skills\itsm-register\itsm_temp.json", $json, (New-Object System.Text.UTF8Encoding $false))
'
```

### 출력 형식 예시

```
=== 승인 대기 (PENDING) — 2건 ===
  1. #3522 | [YTAP_MANAGER] YTAP_Manager2 중앙관리 시스템 개발 | 신규 개발 | 마감: 2026-03-30

=== 진행중 (IN_PROGRESS) — 1건 ===
  1. #2346 | [PKG기술파트] PKG SAW공정 RMS 대상 장비... | MEDIUM | 마감: 2026-03-13

=== 완료 (COMPLETED) — 73건 ===
  (최근 5건만 표시)
  ...
```

## API 조회 제한사항

- 목록 API(`/my-tasks/all/`)는 `PENDING_REQUESTER_APPROVAL` 상태 티켓을 **반환하지 않음**
- 상세 API(`/{plant}/{requestId}/with-user`)는 **모든 상태 조회 가능** (PENDING 포함)
- `PENDING_REQUESTER_APPROVAL` → `APPROVED` 상태 전환은 API 불가 (상위자가 ITSM 웹에서 승인 필요)
- COMPLETED 후에는 되돌릴 수 없음
