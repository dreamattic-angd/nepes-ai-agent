## Step 0: Folder Scan and Equipment Grouping (when a folder is specified)

When a folder path is provided, automatically identify analysis targets without needing to specify files directly.

### 0-1. Folder Scan

```
Folder scan: os.listdir → classify by extension (pdf/doc/docx/xls/xlsx)
Output result: number of files per category + filename list
```

### 0-2. Group by Equipment

Extract equipment name/model name from filenames and match PDFs with Excel files for the same equipment.

**Grouping rules:**
1. Extract common keywords from filenames (e.g., `PRS04`, `PRS-04`, `PR STRIP`, etc.)
2. Pair PDF and Excel files that share the same keyword
3. If pairing is unclear → **ask user for confirmation**
4. Show grouping result and wait for user confirmation before starting analysis

**Example output:**
```
Equipment file grouping result:

[Group 1: PRS-04]
  - PDF: SECS_DOCUMENTS_ISS25-073A(PR STRIP)_PRS04_20251212.pdf
  - Excel: S_ISS25-073A_PRS04_PR_STRIP_VID_LIST_20250930.xls

[Group 2: PRS-03]
  - PDF: SECS_DOCUMENTS_ISS25-073A(PR STRIP)_PRS03_20250815.pdf
  - Excel: S_ISS25-073A_PRS03_PR_STRIP_VID_LIST_20250801.xls

Proceed with analysis? (Y/N)
```

### 0-3. Comparison Analysis Detection

Switch to **comparison analysis mode** when any of the following conditions apply:
- 2 or more folders specified (e.g., `PRS-03/ PRS-04/`)
- User uses keywords like "compare", "difference", "what's different", "compare", "diff"
- Grouping results in 2 or more equipment groups

In comparison analysis mode:
1. Analyze each equipment individually (through step 4)
2. Additionally execute the **comparison analysis step (4-D)**
3. Generate a **comparison report** separately

---

## Word (.doc/.docx) Processing Details

> Word files are treated the same as PDF (SECS/GEM Specification body).
> Extract text and save it to `analysis-reports/extract/{original_filename}_extracted/`, then analyze the extracted text.

### Word File Processing Summary

```
1. Determine extension (.doc vs .docx)
2. Extract text (select tool by extension)
3. Attempt table extraction (.docx only)
4. Split if large
5. Verify extraction results
```

**Output save location rules:**
```
secsgem-specs/
├── original_file.doc (or .docx)       ← original (do not modify — only originals in this folder)

analysis-reports/
├── [equipment_name]_SECSGEM_Analysis.md    ← report output
└── extract/                                 ← intermediate artifacts folder
    └── original_file_extracted/            ← text extraction results
        ├── full_text.txt                    ← full text
        ├── tables.txt                       ← table extraction results (.docx only)
        └── part_001.txt, ...                ← split files (when large)
```

---

## Step 1-W: Word File Pre-processing

### 1-W-1. Determine File Extension and Extraction Method

| Extension | Format | Extraction Method (priority) |
|-----------|--------|-----------------------------|
| **.doc** | Word 97-2003 (binary OLE) | 1st: `antiword` (CLI) → 2nd: `olefile` (Python) → 3rd: `libreoffice --convert-to txt` |
| **.docx** | Office Open XML (ZIP) | 1st: `python-docx` → 2nd: `libreoffice --convert-to txt` |

### 1-W-2. .doc File Text Extraction

**.doc files are binary format and cannot be read with python-docx.**

**Method 1: antiword (fastest and most stable)**
```bash
# Check antiword installation
which antiword || where antiword

# Extract text
antiword "<DOC_FILE_PATH>" > "<OUTPUT_DIR>/full_text.txt"

# Verify extraction result
wc -l "<OUTPUT_DIR>/full_text.txt"
```

> **antiword limitation**: Table structures may be partially lost.
> Tables are critical information in SECS/GEM Spec (VID lists, S/F structure definitions, etc.),
> so when tables are important, add the mark `[.doc table structure may be lost — verify original]` in the report.

**Method 2: olefile (Python, when antiword is unavailable)**
```
Extract text from .doc's WordDocument OLE stream with olefile → remove control characters → save to output_path
```

> olefile can only extract basic text; all formatting is lost.
> Quality is lower than antiword, so use antiword first.

**Method 3: libreoffice (when all other methods fail)**
```bash
libreoffice --headless --convert-to txt:Text --outdir "<OUTPUT_DIR>" "<DOC_FILE_PATH>"
```

### 1-W-3. .docx File Text and Table Extraction

**.docx allows extracting both text and tables with python-docx.**

```
Extract text (full_text.txt) + tables (tables.txt) from .docx using python-docx
Save location: analysis-reports/extract/{original_filename}_extracted/
For tables, join cell text per row with " | "
```

> **python-docx advantage**: Can extract not only text but also **table structures fully preserved**.
> VID lists and S/F definition tables in SECS/GEM Spec are extracted accurately.

### 1-W-4. Split Text (when large)

Split when extracted text **exceeds 3000 lines**:

```
When exceeding 3000 lines: split into 2000-line units → part_001.txt, part_002.txt, ...
No split when 3000 lines or fewer
```

### 1-W-5. Verify Extraction Results

| # | Verification Item | Method | When Failed |
|---|-----------------|--------|------------|
| 1 | File size | `wc -l full_text.txt` → 0 lines means extraction failed | Retry with next priority tool |
| 2 | Korean character corruption | Check first 50 lines of extracted text → many corrupted chars (□, ?) | Attempt encoding change (EUC-KR → UTF-8) |
| 3 | Key keywords present | Search SECS/GEM keywords like "S1F1", "CEID", "SVID" | 0 results means suspect extraction quality → try another method |

**Encoding issue resolution:**
```bash
# For .doc encoded in EUC-KR
antiword "<DOC_FILE_PATH>" | iconv -f EUC-KR -t UTF-8 > "<OUTPUT_DIR>/full_text.txt"
```

### 1-W-6. Word Analysis Result Format

Extracted text is processed through the **same analysis pipeline as PDF**:
- Apply the same cumulative memo format as step 3 (sequential reading and analysis)
- Apply step 4 (checklist) identically
- Treat Word the same as PDF during cross-checking

```
[WORD EXTRACT Analysis Memo]
- Original file: Communication Specification(Ver1.27).doc
- Extraction tool: antiword / python-docx
- Lines extracted: XXXX
- Identified items:
  - Stream/Function: list of SxFy
  - Variables: SVID, CEID, ECID, etc.
  - Key scenarios: ...
  - Special notes: ...
  - Extraction limitations: [table structure loss, etc. if applicable]
```

---

## PDF Processing Details

> Per absolute rule [Rule 1], PDFs must always be processed with Python only.

**Correct PDF processing order:**
```
1. Check file size and page count via bash (using Python pypdf)
2. Determine whether splitting is needed
3. (If needed) Automatically split with Python
4. Extract text and tables with pdfplumber → save as text files
5. Read and analyze the extracted text files
```

**Output save location rules:**
```
.claude/agents/secsgem-analysis/
├── secsgem-specs/                        ← original documents folder (originals only)
│   ├── original_file.pdf                 ← PDF original (do not modify)
│   ├── original_file.doc / .docx         ← Word original (do not modify)
│   └── original_file.xls / .xlsx         ← Excel original (do not modify)
└── analysis-reports/                     ← report + intermediate artifacts output folder
    ├── [equipment_name]_SECSGEM_Analysis.md  ← report
    └── extract/                          ← intermediate artifacts folder
        ├── original_file_chunks/         ← split PDF files
        │   ├── chunk_001_p1-25.pdf
        │   └── ...
        └── original_file_extracted/      ← text extraction results (PDF/Word common)
            ├── full_text.txt             ← full text
            ├── tables.txt                ← table extraction (.docx only)
            └── part_001.txt, ...         ← split files (when large)
```

**Correct method:**
```
Open PDF with pdfplumber.open(), extract text per page, then analyze
```

---

## Step 1: PDF File Pre-check

Before starting analysis, always check the file status in the following order.

### 1-1. File Information Check

```bash
# Check file size
ls -lh "<PDF_FILE_PATH>"

# Check page count (Python)
python3 -c "
from pypdf import PdfReader
reader = PdfReader('<PDF_FILE_PATH>')
print(f'Total pages: {len(reader.pages)}')
print(f'File size: {round(os.path.getsize(\"<PDF_FILE_PATH>\") / 1024 / 1024, 1)}MB')
import os
"
```

### 1-2. Split Decision Criteria

| Condition | Decision | Action |
|-----------|----------|--------|
| 30 pages or fewer AND 10MB or less | No split needed | **Proceed to step 2 directly** |
| 31–100 pages OR 10–30MB | Split recommended | Split in 30-page units |
| More than 100 pages OR more than 30MB | Split required | Split in 25-page units |
| Many images (MB/page > 1MB) | Split required + prioritize text extraction | Split after text extraction |

> **Important**: The above criteria are guidelines. If reading fails after trying, reduce the split unit further (e.g., 25 → 15 → 10 pages).

---

## Step 2: Automatic PDF Split (when needed)

When splitting is needed, run the Python script below.

### 2-1. Split Script

```
Split PDF into pages_per_chunk (default 25) page units using pypdf
Save: analysis-reports/extract/{original_filename}_chunks/chunk_001_p1-25.pdf, ...
```

### 2-2. How to Run Split

```bash
# Default split (25 pages per chunk)
python3 split_pdf.py "/path/to/spec.pdf"

# Smaller split (15 pages per chunk — when many images)
python3 split_pdf.py "/path/to/spec.pdf" 15
```

### 2-3. Prioritize Text Extraction (when many images)

When there are too many images to read even after splitting, extract text first:

```
Extract text + tables per page with pdfplumber and save as text file
Format: page separator + PAGE number + text + [TABLE N] table content
Save: analysis-reports/extract/{original_filename}_extracted_text.txt
```

---

## Step 1-E: Excel (VID List) File Reading

When an Excel file is provided, read and parse it using the following procedure.

### 1-E-1. Check File Format and Convert

```
For .xls: convert with libreoffice --headless --convert-to xlsx, then use
For .xlsx: use as-is
```

> **Important**: .xls (legacy Excel 97-2003) may not be directly readable by Python's openpyxl/pandas.
> Try reading after converting to .xlsx with `libreoffice --headless`. If libreoffice is also unavailable, `pip install xlrd --break-system-packages`

### 1-E-2. Read and Normalize Per Sheet

Typical sheet structure of a SECS/GEM VID List Excel:

| Sheet Name (typical) | Content | Key Columns |
|--------------------|---------|-------------|
| **ALID** | Alarm list | ALARM_ID, ALARM_MSG, UNIT_ID, ALARM_GRADE |
| **CEID** | Collection event list | Event Name, DATAID, CEID Number, VALID DVID |
| **ECID** | Equipment constant list | EC NAME, ID |
| **SVID LIST** | Status variable list | SV NAME, SVID, UNIT, FORMAT, DESCRIPTION |
| **DVID LIST** | Data variable list | DV NAME, DVID, UNIT, FORMAT, DESCRIPTION |
| **RCMD** | Remote command list | RCMD NAME, RCMD STRUCTURE (SML) |

> **Note**: Sheet names and column names may differ by equipment vendor.
> First check actual sheet names and the first few rows to identify the header row position.
> The header is often not on row 1 (comment rows may come first).

```
Read Excel per sheet with pandas → check sheet name, row count, column names, first 5 rows
Remove empty columns (Unnamed), detect header row position
```

### 1-E-3. Notes When Parsing Excel Data

1. **Header row detection**: First row is often not the header. Rows starting with `;` are comments; rows starting with `//` are section separators
2. **EOF marker**: A row with `;[EOF]` means end of data
3. **Merged cells**: Cell merging may occur in unit IDs or categories. Inherit the value from the cell above when NaN
4. **SML structure in RCMD**: The STRUCTURE column in the RCMD sheet contains SML-format message structures as text. Be careful as it may include line breaks (`\n`)
5. **VALID DVID in CEID**: May be a comma-separated list of DVIDs or expressed as a range (`~`) (e.g., `5101~6606`)

### 1-E-4. Excel Analysis Result Format

Organize results for each sheet in the following format:

```
[EXCEL Analysis: ALID sheet]
- Total alarms: XXX
- Severity distribution: Grade A XX, Grade C1 XX, Grade C2 XX
- Distribution by UNIT_ID: 0 (common) XX, 1 (unit 1) XX, ...

[EXCEL Analysis: CEID sheet]
- Total events: XX
- Event-DVID mapping:
  CEID 1 (OFFLINE) → DVID: none
  CEID 4 (LoadRequest) → DVID: 4013
  CEID 5 (LoadComplete) → DVID: 4005, 4006, 4013
  ...

[EXCEL Analysis: SVID sheet]
- Total SVs: XX
- Key SVs: ControlState(201), Equipment State(204), PPExecName(206), ...

[EXCEL Analysis: DVID sheet]
- Total DVs: XX
- Event data: PPID(4001), BatchID(4002), LotID(4003), ...
- Process data: process result data in the 5101~6606 range

[EXCEL Analysis: ECID sheet]
- Total ECs: XX
- Category breakdown: bath-related, speed-related, time-related, ...

[EXCEL Analysis: RCMD sheet]
- Total commands: XX
- Command list: PP_SELECT, LOT_CANCEL, START, LOT_LOAD, GO_REMOTE, GO_LOCAL, ...
- Parameter summary for each command
```

---

