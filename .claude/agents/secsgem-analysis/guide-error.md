## Step 6: Error Handling and Fallback

### Handling by Situation

| Situation | Action |
|-----------|--------|
| pypdf not installed | Run `pip install pypdf pdfplumber --break-system-packages` |
| pandas not installed | Run `pip install pandas openpyxl --break-system-packages` |
| PDF encrypted | Ask user for password → `PdfReader(path, password=pwd)` |
| Text extraction failed (scanned PDF) | Attempt OCR: `pip install pytesseract pdf2image` → convert to images then OCR |
| Chunk still too large after splitting | Reduce page count and re-split (25 → 15 → 10) |
| Table structure broken | Adjust `extract_tables()` settings in pdfplumber or notify user of manual cleanup |
| Image-based text (diagrams, drawings) | Attempt OCR for text extraction; if failed, ask user for manual check with page numbers |
| **.xls read failure** | Convert with `libreoffice --headless --convert-to xlsx` and retry. If no libreoffice, `pip install xlrd --break-system-packages` |
| **Excel header row detection failure** | Print first 10 rows and skip comment rows (`;`, `//`) to find actual header position |
| **Excel sheet name differs from expected** | Print sheet list and determine each sheet's role based on content |
| **.doc antiword failure** | Check `where antiword` → if absent, try olefile: `pip install olefile --break-system-packages` → if still failing, use libreoffice conversion |
| **.doc Korean character corruption** | Try `antiword <file> \| iconv -f EUC-KR -t UTF-8` for encoding conversion. Also try CP949 |
| **.doc table structure loss** | antiword cannot accurately extract tables → mark `[.doc table structure may be lost — verify original]` in report and continue |
| **.docx python-docx failure** | Run `pip install python-docx --break-system-packages`. If still failing, use libreoffice conversion |
| **.docx file corrupted** | Test with `python -c "from docx import Document; Document('<path>')"` → if failed, try libreoffice txt conversion |
| **Word text extraction result is empty** | Retry with next priority tool. If all fail, ask user for PDF conversion |

### Sub-agent Parallel Utilization (Agent tool — for large-scale analysis)

For large-scale analysis targets, use the **Agent tool for parallel processing**.
Use `"general-purpose"` for each Agent's `subagent_type`.

#### Scenario A: PDF/Word Exceeds 100 Pages — Chapter-by-chapter Parallel Analysis

**Trigger**: Activated after PDF splitting (step 2) or Word text extraction (step 1-W) completes, when total pages exceed 100.

The main session first:
1. Obtains the list of PDF chunk files or Word extracted files
2. Determines chapter ranges based on the table of contents/section structure

Call Agents **simultaneously in a single response** for each chapter.

Each Agent prompt:
```
You are a SECS/GEM Specification analysis expert. Perform research/analysis only — do not modify files.

[Analysis range]: {chunk_file_path} (pages {start}–{end})
[Equipment name]: {equipment_name}

Tasks:
1. Use Read to read the specified chunk file (if it is a text-extracted file) or read with Python (pypdf/pdfplumber)
2. Extract the following items:
   - Stream/Function definitions (SxFy)
   - Structure of each S/F: item list, data types, direction (H→E / E→H)
   - CEID, ALID, VID references
   - State Model information (if present in this range)
   - Scenarios/sequence diagrams (those extractable as text)
3. Mark image-based content as "[p.{N}] Image-based — manual verification needed"

Result format (must return in this format):
[CHUNK_ANALYSIS: pages {start}-{end}]
Stream/Function list:
| S/F | Direction | Description | Key Items |
|-----|-----------|-------------|----------|
CEID references: {list}
ALID references: {list}
VID references: {list}
State Model: {describe if present, "not applicable" otherwise}
Manual verification needed: {items}
```

#### Scenario B: Multi-file Comparison Analysis — Parallel Analysis per Equipment

**Trigger**: When in comparison analysis mode and 2 or more equipment groups exist.

Call Agents **simultaneously in a single response** for each equipment group.

Each Agent prompt:
```
You are a SECS/GEM Specification analysis expert. Perform research/analysis only — do not modify files.

[Equipment name]: {equipment_name}
[PDF/Word file]: {spec_file_path}
[Excel file]: {vid_list_path} (if available)

Tasks:
1. Extract text from PDF/Word file using Python
2. Perform step 4 integrated analysis checklist:
   - S/F definition completeness
   - VID classification (SVID, DVID, ECID, CEID, ALID, RCMD)
   - Presence of State Model
   - Organize scenarios
3. If Excel is available, perform Spec ↔ Excel cross-check
4. Return analysis results in structured format

Result format (must return in this format):
[EQUIPMENT_ANALYSIS: {equipment name}]
S/F list:
| S/F | Direction | Description | Completeness |
VID classification:
| Type | Count | Suspected missing |
State Model: {present/absent and summary}
Scenarios: {list}
Cross-check result: {mismatch items}
```

After the main session receives each equipment analysis result:
1. Perform step 4-D comparison analysis (differences between equipment)
2. Generate comparison report

#### Scenario C: 6 or More Excel Sheets — Parallel Sheet Parsing

**Trigger**: When 6 or more sheets are found after checking Excel sheet list.

Call Agents **simultaneously in a single response** for each sheet.

Each Agent prompt:
```
You are a SECS/GEM VID List Excel parsing expert. Perform research/analysis only — do not modify files.

[Excel file]: {excel_file_path}
[Target sheet]: "{sheet_name}"

Tasks:
1. Read the specified sheet only with Python pandas:
   pd.read_excel("{excel_file_path}", sheet_name="{sheet_name}")
2. Detect header row (skip comment rows)
3. Map columns: ID, Name, Format, Unit, Description, etc.
4. Normalize and clean data

Result format (must return in this format):
[SHEET_PARSED: {sheet_name}]
VID type: {SVID/DVID/ECID/CEID/ALID/RCMD/other}
Record count: {N}
| ID | Name | Format | Unit | Description |
|-------|------|--------|------|-------------|
(full data or top 50 entries + total count)
Parsing issues: {describe if any}
```

#### Result Integration (common to all scenarios)

1. Wait to receive all Agent results
2. Parse results using `[CHUNK_ANALYSIS]`, `[EQUIPMENT_ANALYSIS]`, `[SHEET_PARSED]` tags
3. When data inconsistencies occur between Agents: verify directly from the original file in the main session
4. Pass integrated results to step 5 (report generation)

#### Fallback

- When an Agent fails, process that chapter/equipment/sheet sequentially in the main session
- Mark failed ranges in the report as `[Sub-agent failed — reprocessed in main session]`

---

### When User Confirmation is Needed

In the following situations, do not stop analysis — **mark the relevant part** and continue:

- When image/diagram content cannot be extracted as text → `[p.XX] Image-based content — manual verification needed`
- When data structure is unclear → `[p.XX] Data structure interpretation uncertain — verify original recommended`
- When vendor-specific code meaning is unclear → `[p.XX] Vendor-specific item — confirm with equipment vendor recommended`

