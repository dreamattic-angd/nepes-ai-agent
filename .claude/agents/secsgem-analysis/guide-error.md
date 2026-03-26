## 6단계: 에러 처리 및 폴백

### 상황별 대처

| 상황 | 대처 |
|------|------|
| pypdf 설치 안 됨 | `pip install pypdf pdfplumber --break-system-packages` 실행 |
| pandas 설치 안 됨 | `pip install pandas openpyxl --break-system-packages` 실행 |
| PDF 암호화됨 | 사용자에게 비밀번호 요청 → `PdfReader(path, password=pwd)` |
| 텍스트 추출 실패 (스캔 PDF) | OCR 시도: `pip install pytesseract pdf2image` → 이미지 변환 후 OCR |
| 분할 후에도 청크가 너무 큼 | 페이지 수를 줄여서 재분할 (25 → 15 → 10) |
| 테이블 구조가 깨짐 | pdfplumber의 `extract_tables()` 설정 조정 또는 수동 정리 알림 |
| 이미지 내 텍스트 (도면, 다이어그램) | OCR로 텍스트 추출 시도, 실패 시 사용자에게 해당 페이지 번호와 함께 수동 확인 요청 |
| **.xls 파일 읽기 실패** | `libreoffice --headless --convert-to xlsx` 로 변환 후 재시도. libreoffice 없으면 `pip install xlrd --break-system-packages` |
| **Excel 헤더 행 탐지 실패** | 첫 10행을 출력하여 주석행(`;`, `//`)을 건너뛰고 실제 헤더 위치를 찾기 |
| **Excel 시트명이 예상과 다름** | 시트 목록을 출력하고, 내용 기반으로 각 시트의 역할을 판별 |
| **.doc 파일 antiword 실패** | `where antiword` 확인 → 없으면 olefile 시도: `pip install olefile --break-system-packages` → 그래도 안 되면 libreoffice 변환 |
| **.doc 한글 깨짐** | `antiword <file> \| iconv -f EUC-KR -t UTF-8`로 인코딩 변환 시도. CP949도 시도 |
| **.doc 표 구조 손실** | antiword는 표를 정확히 추출하지 못함 → 보고서에 `[.doc 표 구조 손실 가능 — 원본 확인 필요]` 표시 후 계속 진행 |
| **.docx python-docx 실패** | `pip install python-docx --break-system-packages` 실행. 여전히 실패하면 libreoffice 변환 |
| **.docx 파일 손상** | `python -c "from docx import Document; Document('<path>')"` 테스트 → 실패 시 libreoffice로 txt 변환 시도 |
| **Word 텍스트 추출 결과가 빈 파일** | 다음 우선순위 도구로 재시도. 모두 실패하면 사용자에게 PDF 변환 요청 |

### 서브에이전트 병렬 활용 (Agent 도구 — 대용량 분석 시)

분석 대상이 대규모인 경우, **Agent 도구를 사용하여 병렬 처리**한다.
각 Agent의 `subagent_type`은 `"general-purpose"`를 사용한다.

#### 시나리오 A: PDF/Word 100페이지 초과 — 챕터별 병렬 분석

**트리거**: PDF 분할(2단계) 또는 Word 텍스트 추출(1-W단계) 완료 후, 총 페이지가 100을 초과하면 활성화.

메인 세션이 먼저 수행:
1. PDF 청크 파일 또는 Word 추출 파일 목록 확보
2. 목차/섹션 구조를 기반으로 챕터 범위를 결정

각 챕터에 대해 Agent를 **하나의 응답에서 동시 호출**한다.

각 Agent 프롬프트:
```
당신은 SECS/GEM Specification 분석 전문가입니다. 연구/분석만 수행하고 파일을 수정하지 마세요.

[분석 범위]: {chunk_file_path} (페이지 {start}~{end})
[장비명]: {equipment_name}

작업:
1. 지정된 청크 파일을 Read로 읽기 (텍스트 추출 완료 파일인 경우) 또는 Python(pypdf/pdfplumber)으로 읽기
2. 아래 항목을 추출:
   - Stream/Function 정의 (SxFy)
   - 각 S/F의 구조: Item 목록, 데이터 타입, 방향(H→E / E→H)
   - CEID, ALID, VID 참조
   - State Model 정보 (해당 범위에 있을 경우)
   - 시나리오/시퀀스 다이어그램 (텍스트로 추출 가능한 것)
3. 이미지 기반 내용은 "[p.{N}] 이미지 기반 — 수동 확인 필요" 표시

결과 형식 (반드시 이 형식으로 반환):
[CHUNK_ANALYSIS: 페이지 {start}-{end}]
Stream/Function 목록:
| S/F | 방향 | 설명 | 주요 Item |
|-----|------|------|----------|
CEID 참조: {목록}
ALID 참조: {목록}
VID 참조: {목록}
State Model: {있으면 기술, 없으면 "해당 없음"}
수동 확인 필요: {항목}
```

#### 시나리오 B: 다중 파일 비교 분석 — 장비별 병렬 분석

**트리거**: 비교 분석 모드이고 2개 이상 장비 그룹이 존재할 때.

각 장비 그룹에 대해 Agent를 **하나의 응답에서 동시 호출**한다.

각 Agent 프롬프트:
```
당신은 SECS/GEM Specification 분석 전문가입니다. 연구/분석만 수행하고 파일을 수정하지 마세요.

[장비명]: {equipment_name}
[PDF/Word 파일]: {spec_file_path}
[Excel 파일]: {vid_list_path} (있으면)

작업:
1. PDF/Word 파일을 Python으로 텍스트 추출
2. 4단계 통합 분석 체크리스트 수행:
   - S/F 정의 완전성
   - VID 분류 (SVID, DVID, ECID, CEID, ALID, RCMD)
   - State Model 유무
   - 시나리오 정리
3. Excel이 있으면 Spec ↔ Excel 크로스 체크 수행
4. 분석 결과를 구조화하여 반환

결과 형식 (반드시 이 형식으로 반환):
[EQUIPMENT_ANALYSIS: {장비명}]
S/F 목록:
| S/F | 방향 | 설명 | 완전성 |
VID 분류:
| 유형 | 개수 | 누락 의심 |
State Model: {유무 및 요약}
시나리오: {목록}
크로스 체크 결과: {불일치 항목}
```

메인 세션이 각 장비 분석 결과를 수신한 후:
1. 4-D 비교 분석 수행 (장비 간 차이점)
2. 비교 보고서 생성

#### 시나리오 C: Excel 시트 6개 이상 — 시트별 병렬 파싱

**트리거**: Excel 시트 목록 확인 후 6개 이상일 때.

각 시트에 대해 Agent를 **하나의 응답에서 동시 호출**한다.

각 Agent 프롬프트:
```
당신은 SECS/GEM VID List Excel 파싱 전문가입니다. 연구/분석만 수행하고 파일을 수정하지 마세요.

[Excel 파일]: {excel_file_path}
[대상 시트]: "{sheet_name}"

작업:
1. Python pandas로 지정된 시트만 읽기:
   pd.read_excel("{excel_file_path}", sheet_name="{sheet_name}")
2. 헤더 행 탐지 (주석행 건너뛰기)
3. 컬럼 매핑: ID, Name, Format, Unit, Description 등
4. 데이터 정규화 및 정리

결과 형식 (반드시 이 형식으로 반환):
[SHEET_PARSED: {sheet_name}]
VID 유형: {SVID/DVID/ECID/CEID/ALID/RCMD/기타}
레코드 수: {N}
| ID | Name | Format | Unit | Description |
|-------|------|--------|------|-------------|
(전체 데이터 또는 상위 50건 + 총 건수)
파싱 이슈: {있으면 기술}
```

#### 결과 통합 (전체 시나리오 공통)

1. 모든 Agent 결과를 수신 대기
2. 결과에서 `[CHUNK_ANALYSIS]`, `[EQUIPMENT_ANALYSIS]`, `[SHEET_PARSED]` 태그로 파싱
3. Agent 간 데이터 불일치 발생 시: 원본 파일에서 메인 세션이 직접 재확인
4. 통합 결과를 5단계(보고서 생성)에 전달

#### 폴백

- Agent 실패 시 해당 챕터/장비/시트를 메인 세션에서 순차 처리
- 실패한 범위를 리포트에 `[서브에이전트 실패 — 메인 세션에서 재처리]` 표시

---

### 사용자에게 확인 요청이 필요한 경우

아래 상황에서는 분석을 중단하지 말고, **해당 부분을 표시**한 뒤 계속 진행하세요:

- 이미지/다이어그램 내용을 텍스트로 추출할 수 없는 경우 → `[p.XX] 이미지 기반 내용 — 수동 확인 필요`
- 데이터 구조가 불명확한 경우 → `[p.XX] 데이터 구조 해석 불확실 — 원본 확인 권장`
- 벤더 고유 코드의 의미가 불분명한 경우 → `[p.XX] 벤더 고유 항목 — 장비 업체 확인 권장`

