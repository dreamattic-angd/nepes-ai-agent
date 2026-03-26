# 로그 분석

## 사용 예시
- "PRS-04 로그 분석해줘"
- "BGP04 어제 로그에서 알람 찾아줘"
- "RMS서버 오늘 로그 분석해줘"
- "fdc12 로그 에러 찾아줘"

## 사전 준비
아래 파일을 읽는다. ($USERPROFILE은 사용자 홈 디렉토리)
- $USERPROFILE/.claude/log-analyzer/config.json
- $USERPROFILE/.claude/log-analyzer/eqp-info.json (없으면 빈 `{"equipments":{}}` 로 간주)

## 요청 타입 판단

케이스 B (서버) 키워드 우선 감지:
rms서버, rmsserver, framework, amq, das, fdc12, fdc8

케이스 A (설비 PC):
위 키워드 없이 설비 ID 형식 포함 (예: PRS-04, BGP04)

판단 불가 시 사용자에게 확인한다.

## 날짜 결정
- 미언급 / "오늘" → 오늘 날짜 YYYYMMDD
- "어제" → 어제 날짜
- "7월 10일" 등 → 해당 날짜 변환

## 분석 범위 확인
사용자가 시간대를 명시하지 않은 경우, 기본적으로 최근 5개 파일만 다운로드한다.
실행 전에 사용자에게 아래 내용을 확인한다:

> {대상}의 {날짜} 로그를 최근 5개 파일 기준으로 분석합니다.
> 특정 시간대가 필요하면 알려주세요. (예: "오전 9시~11시", "전체")

사용자가 특정 시간대를 지정하면 → --limit 0 (전체 다운로드) 후 해당 시간대 파일만 분석
사용자가 "전체"를 요청하면 → --limit 0 으로 실행
그 외 → 기본 --limit 5 로 실행

## 케이스 A 실행 (설비 PC)

### 설비 정보 확인
eqp-info.json의 equipments에서 {EQP_ID}를 찾는다.
비교 시 대소문자와 하이픈(-)을 무시한다. (예: "prs04" → "PRS-04" 매칭)

**없으면** Oracle DB MCP로 아래 쿼리를 실행한다:
```sql
SELECT e.EQP_ID, n.EQP_IP, n.SITE, a.AREA, e.EQP_MODEL, e.USED_YN
FROM EQP_MST_PP e
JOIN AREA_MST_PP a ON e.AREA_RAWID = a.RAWID
LEFT JOIN NEP_EQP_INFO n ON e.EQP_ID = n.EQP_ID
WHERE UPPER(REPLACE(e.EQP_ID, '-', '')) = UPPER(REPLACE('{EQP_ID}', '-', ''))
AND e.MODULE_TYPE_CD = 'M'
```
- 결과가 없으면 "해당 설비를 DB에서 찾을 수 없습니다." 안내 후 중단
- EQP_IP가 NULL이면 "해당 설비의 IP가 등록되어 있지 않습니다. EES에서 IP를 확인해주세요." 안내 후 중단
- 결과가 있으면 eqp-info.json에 아래 형식으로 추가 저장:
  ```json
  "{EQP_ID}": {
    "ip": "{EQP_IP}",
    "source": "{SITE를 source로 변환}",
    "area": "{AREA}",
    "model": "{EQP_MODEL}",
    "active": USED_YN이 "Y"이면 true, 아니면 false
  }
  ```
- SITE → source 매핑: "8 BUMP"→"nc8", "12 BUMP"→"nc12", "PKG"→"pkg", 그 외→"rcp"

### 로그 다운로드
아래 명령을 실행한다.
python "$USERPROFILE/.claude/log-analyzer/fetch_log.py" --type ftp --eqp {EQP_ID} --date {DATE_STR} [--limit N]

### FTP 연결 실패 시
fetch_log.py 실행 결과에서 FTP 연결 에러가 발생하면 아래 안내를 출력한다:
> FTP 연결에 실패했습니다. 다음 사항을 확인해주세요:
> 1. RMS PC가 켜져있는지 확인
> 2. EES에서 해당 설비의 IP가 올바른지 확인 (현재: {IP})
> 3. 네트워크/방화벽 상태 확인
>
> IP가 변경되었다면 eqp-info.json에서 해당 설비를 삭제 후 다시 시도하세요.
> (재시도 시 DB에서 최신 정보를 자동으로 가져옵니다)

## 케이스 B 실행 (서버)
아래 명령을 실행한다.
python "$USERPROFILE/.claude/log-analyzer/fetch_log.py" --type server --target {TARGET} --date {DATE_STR} [--limit N]

## 분석 방법 (중요)
로그 파일은 대용량이므로 절대 전체 파일을 한번에 Read 하지 않는다.
다운로드된 파일에 대해 아래 순서로 분석한다.

### STEP 1 - Grep으로 키워드 검색
다운로드된 파일 경로에서 Grep 도구로 핵심 키워드를 검색한다.
- 기본 키워드: ERROR, ALARM, WARNING, EXCEPTION, FAIL
- 사용자가 특정 키워드를 요청한 경우 해당 키워드로 검색
- Grep 옵션: output_mode="content", context=2 (전후 2줄 포함)

### STEP 2 - 필요 시 Read로 상세 확인
Grep 결과에서 추가 컨텍스트가 필요한 구간이 있으면
Read 도구의 offset/limit 를 사용하여 해당 구간만 읽는다.

### STEP 3 - 분석 결과 정리
수집된 정보를 바탕으로 아래 형식으로 출력한다.

## 결과 출력 형식
---
## 📋 {대상} 로그 분석 결과
**분석 일시** : {현재 날짜/시각}
**대상**      : {EQP_ID 또는 서버명}
**로그 파일** : {파일명 목록}
**분석 기간** : {첫 타임스탬프} ~ {마지막 타임스탬프}

### 🚨 알람 / 에러 요약
| 시각 | 코드/유형 | 내용 | 발생 횟수 |

### 📌 조치 필요 항목
1. ...

### 📈 주요 이벤트 타임라인
{시각} - {내용}
---

## 심층 분석 연계

### 트리거 조건
분석 결과 출력 후, 아래 중 하나라도 해당하면 사용자에게 심층 분석을 제안한다:
- ERROR 5건 이상 발견
- FATAL/SEVERE/CRITICAL 패턴 감지
- 사용자가 명시적으로 원인 분석 요청 ("원인 분석해줘", "왜 이런 거야", "더 자세히" 등)

### 제안 메시지
```
> 심층 분석이 필요하시면 알려주세요. 다운로드된 로그 기반으로 issue-analyze를 실행합니다.
> (다운로드된 로그: {다운로드 경로}, {N}개 파일)
```

### 사용자 수락 시

1. **추가 다운로드 확인**: `--limit 5`로 다운받았으면 아래를 안내한다:
   ```
   > 현재 최근 5개 파일만 다운로드되어 있습니다.
   > 심층 분석의 정확도를 위해 추가 다운로드가 필요할 수 있습니다.
   > 추가 다운로드 없이 진행할까요, 아니면 범위를 넓힐까요?
   ```

2. **issue-analyze 실행**: `.claude/agents/issue-analysis/` 의 phase 파일을 순서대로 읽으며 Phase 0 ~ Phase 4를 실행한다.
   - **로그 경로**: 다운로드 경로(`$USERPROFILE/.claude/logs/{대상}/{날짜}/`)를 Phase 0에 전달한다.
   - `.claude/agents/issue-analysis/logs/` 폴더에 파일을 복사하지 않는다.

3. **컨텍스트 포화 주의**: analyze-log 결과가 이미 많은 컨텍스트를 소비한 경우, 아래를 안내한다:
   ```
   > 현재 세션의 컨텍스트가 많이 사용되었습니다.
   > /handoff 후 새 세션에서 /issue-analyze를 실행하는 것을 권장합니다.
   > 다운로드된 로그 경로: {경로}
   ```
