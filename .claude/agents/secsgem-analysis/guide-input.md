## 0단계: 폴더 스캔 및 장비별 그룹핑 (폴더가 지정된 경우)

폴더 경로가 주어진 경우, 파일을 직접 지정하지 않아도 자동으로 분석 대상을 식별합니다.

### 0-1. 폴더 스캔

```
폴더 스캔: os.listdir → 확장자별 분류 (pdf/doc/docx/xls/xlsx)
결과 출력: 카테고리별 파일 수 + 파일명 리스트
```

### 0-2. 장비별 그룹핑

파일명에서 장비명/모델명을 추출하여 같은 장비의 PDF와 Excel을 매칭합니다.

**그룹핑 규칙:**
1. 파일명에서 공통 키워드를 추출 (예: `PRS04`, `PRS-04`, `PR STRIP` 등)
2. 같은 키워드를 가진 PDF와 Excel을 짝으로 묶기
3. 짝이 불분명하면 **사용자에게 확인 요청**
4. 그룹핑 결과를 먼저 보여주고 사용자 확인 후 분석 시작

**예시 출력:**
```
장비별 파일 그룹핑 결과:

[그룹 1: PRS-04]
  - PDF: SECS_DOCUMENTS_ISS25-073A(PR STRIP)_PRS04_20251212.pdf
  - Excel: S_ISS25-073A_PRS04_PR_STRIP_VID_LIST_20250930.xls

[그룹 2: PRS-03]
  - PDF: SECS_DOCUMENTS_ISS25-073A(PR STRIP)_PRS03_20250815.pdf
  - Excel: S_ISS25-073A_PRS03_PR_STRIP_VID_LIST_20250801.xls

이대로 분석을 진행할까요?
```

### 0-3. 비교 분석 감지

아래 조건 중 하나라도 해당되면 **비교 분석 모드**로 전환:
- 2개 이상의 폴더가 지정됨 (예: `PRS-03/ PRS-04/`)
- 사용자가 "비교", "차이", "다른 점", "compare", "diff" 등의 키워드를 사용
- 그룹핑 결과 2개 이상의 장비 그룹이 식별됨

비교 분석 모드에서는:
1. 각 장비를 개별 분석 (4단계까지)
2. 추가로 **비교 분석 단계(4-D)** 실행
3. **비교 보고서** 별도 생성

---

## Word(.doc/.docx) 처리 방법 상세

> Word 파일은 PDF와 동일한 역할(SECS/GEM Specification 본문)로 취급합니다.
> 텍스트를 추출하여 `analysis-reports/extract/{원본파일명}_extracted/` 폴더에 저장한 뒤, 추출된 텍스트를 분석합니다.

### Word 파일 처리 절차 요약

```
1. 확장자 판별 (.doc vs .docx)
2. 텍스트 추출 (확장자별 도구 선택)
3. 표 추출 시도 (.docx만 가능)
4. 대용량 시 텍스트 분할
5. 추출 결과 검증
```

**결과물 저장 위치 규칙:**
```
secsgem-specs/
├── 원본파일.doc (또는 .docx)       ← 원본 (변경 금지, 이 폴더에는 원본만 보관)

analysis-reports/
├── [장비명]_SECSGEM_Analysis.md    ← 보고서 출력
└── extract/                         ← 중간 산출물 전용 폴더
    └── 원본파일_extracted/          ← 텍스트 추출 결과
        ├── full_text.txt            ← 전체 텍스트
        ├── tables.txt               ← 표 추출 결과 (.docx만)
        └── part_001.txt, ...        ← 분할 파일 (대용량 시)
```

---

## 1-W단계: Word 파일 전처리

### 1-W-1. 파일 확장자 판별 및 추출 방식 결정

| 확장자 | 형식 | 추출 방법 (우선순위) |
|--------|------|---------------------|
| **.doc** | Word 97-2003 (바이너리 OLE) | 1순위: `antiword` (CLI) → 2순위: `olefile` (Python) → 3순위: `libreoffice --convert-to txt` |
| **.docx** | Office Open XML (ZIP) | 1순위: `python-docx` → 2순위: `libreoffice --convert-to txt` |

### 1-W-2. .doc 파일 텍스트 추출

**.doc 파일은 바이너리 형식이므로 python-docx로 읽을 수 없습니다.**

**방법 1: antiword (가장 빠르고 안정적)**
```bash
# antiword 설치 확인
which antiword || where antiword

# 텍스트 추출
antiword "<DOC_FILE_PATH>" > "<OUTPUT_DIR>/full_text.txt"

# 추출 결과 확인
wc -l "<OUTPUT_DIR>/full_text.txt"
```

> **antiword의 한계**: 표(table) 구조가 일부 손실될 수 있습니다.
> SECS/GEM Spec에서 표는 핵심 정보(VID 목록, S/F 구조 등)이므로,
> 표가 중요한 경우 보고서에 `[.doc 표 구조 손실 가능 — 원본 확인 필요]` 마크를 남기세요.

**방법 2: olefile (Python, antiword가 없을 때)**
```
olefile로 .doc의 WordDocument OLE 스트림에서 텍스트 추출 → 제어문자 제거 → output_path에 저장
```

> olefile은 기본적인 텍스트만 추출 가능하며, 서식 정보는 모두 손실됩니다.
> antiword보다 품질이 낮으므로 antiword를 우선 사용하세요.

**방법 3: libreoffice (다른 방법이 모두 실패할 때)**
```bash
libreoffice --headless --convert-to txt:Text --outdir "<OUTPUT_DIR>" "<DOC_FILE_PATH>"
```

### 1-W-3. .docx 파일 텍스트 및 표 추출

**.docx는 python-docx로 텍스트와 표를 모두 추출할 수 있습니다.**

```
python-docx로 .docx에서 텍스트(full_text.txt) + 표(tables.txt) 추출
저장 위치: analysis-reports/extract/{원본파일명}_extracted/
표는 행별로 셀 텍스트를 " | "로 연결하여 저장
```

> **python-docx의 장점**: 텍스트뿐만 아니라 **표 구조를 완전히 보존**하여 추출할 수 있습니다.
> SECS/GEM Spec의 VID 목록, S/F 정의 테이블 등이 정확하게 추출됩니다.

### 1-W-4. 텍스트 분할 (대용량 시)

추출된 텍스트가 **3000줄을 초과**하면 분할합니다:

```
3000줄 초과 시 2000줄 단위로 분할 → part_001.txt, part_002.txt, ...
3000줄 이하면 분할하지 않음
```

### 1-W-5. 추출 결과 검증

| # | 검증 항목 | 방법 | 실패 시 |
|---|----------|------|---------|
| 1 | 파일 크기 | `wc -l full_text.txt` → 0줄이면 추출 실패 | 다음 우선순위 도구로 재시도 |
| 2 | 한글 깨짐 | 추출 텍스트 첫 50줄 확인 → 깨진 문자(□, ?) 다수 | 인코딩 변경 시도 (EUC-KR → UTF-8) |
| 3 | 핵심 키워드 존재 | "S1F1", "CEID", "SVID" 등 SECS/GEM 키워드 검색 | 키워드 0건이면 추출 품질 의심 → 다른 방법 시도 |

**인코딩 문제 해결:**
```bash
# EUC-KR로 인코딩된 .doc의 경우
antiword "<DOC_FILE_PATH>" | iconv -f EUC-KR -t UTF-8 > "<OUTPUT_DIR>/full_text.txt"
```

### 1-W-6. Word 분석 결과 정리 형식

추출된 텍스트는 PDF와 **동일한 분석 파이프라인**으로 처리합니다:
- 3단계(순차 읽기 및 분석)의 누적 메모 형식을 그대로 적용
- 4단계(체크리스트) 동일하게 적용
- 크로스 체크 시 Word를 PDF와 동일하게 취급

```
[WORD EXTRACT 분석 메모]
- 원본 파일: Communication Specification(Ver1.27).doc
- 추출 도구: antiword / python-docx
- 추출 줄 수: XXXX줄
- 식별된 항목:
  - Stream/Function: SxFy 목록
  - 변수: SVID, CEID, ECID 등
  - 주요 시나리오: ...
  - 특이사항: ...
  - 추출 한계: [표 구조 손실 등 해당 시]
```

---

## PDF 처리 방법 상세

> 절대 규칙 [규칙 1]에 따라, PDF는 반드시 Python으로만 처리합니다.

**올바른 PDF 처리 순서:**
```
1. bash로 파일 크기·페이지 수 확인 (Python pypdf 사용)
2. 분할 필요 여부 판단
3. (필요 시) Python으로 자동 분할
4. pdfplumber로 텍스트·테이블 추출 → 텍스트 파일로 저장
5. 추출된 텍스트 파일을 읽고 분석
```

**결과물 저장 위치 규칙:**
```
.claude/agents/secsgem-analysis/
├── secsgem-specs/                        ← 원본 문서 전용 폴더 (원본만 보관)
│   ├── 원본파일.pdf                      ← PDF 원본 (변경 금지)
│   ├── 원본파일.doc / .docx              ← Word 원본 (변경 금지)
│   └── 원본파일.xls / .xlsx              ← Excel 원본 (변경 금지)
└── analysis-reports/                     ← 보고서 + 중간 산출물 출력 폴더
    ├── [장비명]_SECSGEM_Analysis.md      ← 보고서
    └── extract/                          ← 중간 산출물 전용 폴더
        ├── 원본파일_chunks/              ← PDF 분할 파일
        │   ├── chunk_001_p1-25.pdf
        │   └── ...
        └── 원본파일_extracted/           ← 텍스트 추출 결과 (PDF/Word 공통)
            ├── full_text.txt             ← 전체 텍스트
            ├── tables.txt                ← 표 추출 (.docx만)
            └── part_001.txt, ...         ← 분할 파일 (대용량 시)
```

**올바른 방법:**
```
pdfplumber.open()으로 PDF를 열어 페이지별 텍스트 추출 후 분석
```

---

## 1단계: PDF 파일 사전 점검

분석을 시작하기 전에, 반드시 아래 순서로 파일 상태를 점검하세요.

### 1-1. 파일 정보 확인

```bash
# 파일 크기 확인
ls -lh "<PDF_FILE_PATH>"

# 페이지 수 확인 (Python)
python3 -c "
from pypdf import PdfReader
reader = PdfReader('<PDF_FILE_PATH>')
print(f'총 페이지 수: {len(reader.pages)}')
print(f'파일 크기: {round(os.path.getsize(\"<PDF_FILE_PATH>\") / 1024 / 1024, 1)}MB')
import os
"
```

### 1-2. 분할 필요 여부 판단 기준

| 조건 | 판단 | 조치 |
|------|------|------|
| 30페이지 이하 AND 10MB 이하 | 분할 불필요 | **바로 2단계로** |
| 31~100페이지 OR 10~30MB | 분할 권장 | 30페이지 단위로 분할 |
| 100페이지 초과 OR 30MB 초과 | 분할 필수 | 25페이지 단위로 분할 |
| 이미지 매우 많은 문서 (MB/페이지 > 1MB) | 분할 필수 + 텍스트 우선 추출 | 텍스트 추출 후 분할 |

> **중요**: 위 기준은 가이드라인입니다. 실제로 읽기를 시도했을 때 실패하면, 분할 단위를 더 작게 조정하세요 (예: 25 → 15 → 10페이지).

---

## 2단계: PDF 자동 분할 (필요 시)

분할이 필요한 경우, 아래 Python 스크립트를 실행하세요.

### 2-1. 분할 스크립트

```
pypdf로 PDF를 pages_per_chunk(기본 25) 페이지 단위로 분할
저장: analysis-reports/extract/{원본파일명}_chunks/chunk_001_p1-25.pdf, ...
```

### 2-2. 분할 실행 방법

```bash
# 기본 분할 (25페이지 단위)
python3 split_pdf.py "/path/to/spec.pdf"

# 더 작게 분할 (15페이지 단위 — 이미지가 많을 때)
python3 split_pdf.py "/path/to/spec.pdf" 15
```

### 2-3. 텍스트 우선 추출 (이미지가 매우 많을 때)

이미지가 너무 많아서 분할해도 읽기 어려운 경우, 먼저 텍스트만 추출합니다:

```
pdfplumber로 각 페이지의 텍스트 + 테이블을 추출하여 텍스트 파일로 저장
형식: 페이지 구분선 + PAGE 번호 + 텍스트 + [TABLE N] 테이블 내용
저장: analysis-reports/extract/{원본파일명}_extracted_text.txt
```

---

## 1-E단계: Excel(VID List) 파일 읽기

Excel 파일이 제공된 경우, 아래 절차로 읽고 파싱합니다.

### 1-E-1. 파일 형식 확인 및 변환

```
.xls인 경우: libreoffice --headless --convert-to xlsx로 변환 후 사용
.xlsx인 경우: 그대로 사용
```

> **중요**: .xls(구형 Excel 97-2003)은 Python의 openpyxl/pandas가 직접 읽지 못할 수 있습니다.
> `libreoffice --headless`로 .xlsx 변환 후 읽기를 시도하고, libreoffice도 없으면 `pip install xlrd --break-system-packages`

### 1-E-2. 시트별 읽기 및 정규화

SECS/GEM VID List Excel의 일반적인 시트 구성:

| 시트명 (일반적) | 내용 | 핵심 컬럼 |
|---------------|------|----------|
| **ALID** | 알람 리스트 | ALARM_ID, ALARM_MSG, UNIT_ID, ALARM_GRADE |
| **CEID** | 수집 이벤트 리스트 | Event Name, DATAID, CEID Number, VALID DVID |
| **ECID** | 장비 상수 리스트 | EC NAME, ID |
| **SVID LIST** | 상태 변수 리스트 | SV NAME, SVID, UNIT, FORMAT, DESCRIPTION |
| **DVID LIST** | 데이터 변수 리스트 | DV NAME, DVID, UNIT, FORMAT, DESCRIPTION |
| **RCMD** | 원격 명령 리스트 | RCMD NAME, RCMD STRUCTURE (SML) |

> **주의**: 시트명과 컬럼명은 장비 업체마다 다를 수 있습니다.
> 실제 시트명과 첫 몇 행을 먼저 확인하여 헤더 행 위치를 파악하세요.
> 헤더가 1행이 아닌 경우가 많습니다 (주석 행이 먼저 올 수 있음).

```
pandas로 Excel 시트별 읽기 → 시트명, 행 수, 컬럼명, 첫 5행 확인
빈 컬럼(Unnamed) 제거, 헤더 행 위치 탐지 필요
```

### 1-E-3. Excel 데이터 파싱 시 주의사항

1. **헤더 행 탐지**: 첫 행이 헤더가 아닌 경우가 많음. `;`로 시작하는 행은 주석, `//`로 시작하는 행은 섹션 구분자
2. **EOF 마커**: `;[EOF]` 행이 있으면 데이터 끝을 의미
3. **병합 셀**: 유닛ID나 카테고리에서 셀 병합이 있을 수 있음. NaN인 경우 위쪽 셀 값을 상속
4. **RCMD의 SML 구조**: RCMD 시트의 구조(STRUCTURE) 컬럼에는 SML 형식의 메시지 구조가 텍스트로 포함됨. 줄바꿈(`\n`)이 포함되어 있으므로 파싱 시 주의
5. **CEID의 VALID DVID**: 쉼표(`,`)로 구분된 DVID 목록이거나, 범위(`~`)로 표시될 수 있음 (예: `5101~6606`)

### 1-E-4. Excel 분석 결과 정리 형식

각 시트 분석 결과를 아래 형식으로 정리:

```
[EXCEL 분석: ALID 시트]
- 총 알람 수: XXX개
- 심각도 분포: A등급 XX개, C1등급 XX개, C2등급 XX개
- UNIT_ID별 분포: 0(공통) XX개, 1(유닛1) XX개, ...

[EXCEL 분석: CEID 시트]
- 총 이벤트 수: XX개
- 이벤트-DVID 매핑:
  CEID 1 (OFFLINE) → DVID: 없음
  CEID 4 (LoadRequest) → DVID: 4013
  CEID 5 (LoadComplete) → DVID: 4005, 4006, 4013
  ...

[EXCEL 분석: SVID 시트]
- 총 SV 수: XX개
- 주요 SV: ControlState(201), Equipment State(204), PPExecName(206), ...

[EXCEL 분석: DVID 시트]
- 총 DV 수: XX개
- 이벤트 데이터: PPID(4001), BatchID(4002), LotID(4003), ...
- 공정 데이터: 5101~6606 범위의 공정 결과 데이터

[EXCEL 분석: ECID 시트]
- 총 EC 수: XX개
- 카테고리별 분류: Bath 관련, Speed 관련, Time 관련, ...

[EXCEL 분석: RCMD 시트]
- 총 명령 수: XX개
- 명령 목록: PP_SELECT, LOT_CANCEL, START, LOT_LOAD, GO_REMOTE, GO_LOCAL, ...
- 각 명령의 파라미터 요약
```

---

