## Step 3: Sequential Reading and Analysis

### 3-1. Reading Strategy

Read split files (or originals) **in order**, identifying and recording the SECS/GEM core elements below from each chunk.

**Reading order:**
1. First read the chunk containing the Table of Contents to understand the overall structure
2. Read the remaining chunks in order and perform detailed analysis
3. Record each chunk's analysis results in the **cumulative memo**

### 3-2. Cumulative Memo Format

Record the following memo cumulatively for each chunk:

```
[CHUNK X Analysis Memo]
- Range: p.XX ~ p.XX
- Identified items:
  - Stream/Function: list of SxFy
  - Variables: SVID, CEID, ECID, etc.
  - Key scenarios: ...
  - Special notes: ...
```

---

## Step 4: SECS/GEM Domain Analysis Checklist

Analyze all items below without omission. Mark "Not included in document" when an item is absent.

### 4-1. Document Basic Information

- [ ] Document title, version, date
- [ ] Target equipment name/model name
- [ ] SECS-II/HSMS communication settings (IP, Port, Device ID, T3–T8 timers, etc.)
- [ ] Applied GEM standard version (E30, E37, E40, etc.)

### 4-2. Communication & Control

- [ ] **Communication State Model** — ENABLED/DISABLED, HOST/EQUIPMENT INITIATED
- [ ] **Control State Model** — ONLINE LOCAL / ONLINE REMOTE / OFFLINE transition conditions
- [ ] **Processing State Model** — IDLE / SETUP / READY / EXECUTING / PAUSE, etc.
- [ ] Events (CEID) and messages (SxFy) triggered during state transitions

### 4-3. Stream/Function Definitions (S/F)

This section is the core of the document. For each Stream/Function:

- [ ] **S/F number** (e.g., S1F1, S1F2, S2F41, etc.)
- [ ] **Message name** (e.g., Are You There Request)
- [ ] **Direction** — H→E (Host to Equipment) or E→H (Equipment to Host)
- [ ] **W-bit** — whether response is expected (W=Wait)
- [ ] **Message structure** (data structure in SML format)
- [ ] **Type and meaning of each data item** (e.g., ASCII, UINT4, LIST, etc.)
- [ ] **Multi-block support**

**Analysis result format:**
```
### SxFy — [Message Name]
- Direction: H→E / E→H
- W-bit: Yes / No
- Purpose: [one-line description]
- Data structure:
  L,n
    1. <item name> <type> [description]
    2. <item name> <type> [description]
    ...
- Related scenarios: [in what situations is this used]
- Notes: [special considerations]
```

### 4-4. Data Variables

Organize by variable type:

#### Status Variables (SV) — SVID
| SVID | Name | Type | Unit | Description |
|------|------|------|------|-------------|

#### Data Variables (DV) — DVNAME
| VID | Name | Type | Unit | Description | Related CEID |
|-----|------|------|------|-------------|-------------|

#### Equipment Constants (EC) — ECID
| ECID | Name | Type | Default | Range | Description |
|------|------|------|---------|-------|-------------|

### 4-5. Collection Events (CEID)

| CEID | Name | Description | Related Report (RPTID) | Included Variables (VIDs) |
|------|------|-------------|----------------------|--------------------------|

### 4-6. Alarms

| ALID | Name | Severity (ALCD) | Set Condition | Clear Condition | Related CEID |
|------|------|----------------|--------------|----------------|-------------|

### 4-7. Remote Commands (RCMD)

| RCMD | Name | Parameters (CPNAME/CPVAL) | Description | HCACK Code |
|------|------|--------------------------|-------------|-----------|

### 4-8. Process Programs (Recipes)

- [ ] PP format (binary/ASCII)
- [ ] PP-related S/F (S7F1–S7F26, etc.)
- [ ] PPID format and length limits
- [ ] Formatted Process Program (FPP) support

### 4-9. Scenarios (scenarios/sequences)

When scenario diagrams are included in the document, convert each scenario to a text sequence diagram:

```
### Scenario: [scenario name]
1. [subject] → [target]: SxFy [description]
2. [subject] ← [target]: SxFy [description]
...
- Prerequisites: [...]
- Result: [...]
```

### 4-10. Special Notes and Vendor Customizations

- [ ] Vendor-specific messages deviating from the standard (S/F > S64 or non-standard structure)
- [ ] Vendor-specific variables or events
- [ ] Special handshake procedures
- [ ] Other special implementation details

### 4-C. Spec ↔ Excel Cross-Check (when Spec body + Excel are both available)

When both the Spec body (PDF or Word) and Excel are provided, cross-verify the following items.
This step is a key step to **prevent confusion during host development by detecting data inconsistencies**.

> **Word files are treated the same as PDF.**
> Where "PDF" appears below, the same applies to text extracted from Word.
> When table structures are lost during Word extraction, mark that cross-check item with `[Word extraction limitation — verify original recommended]`.

#### Cross-Check Items

| # | Verification Item | Method | When Mismatch Found |
|---|-----------------|--------|---------------------|
| C-1 | **CEID match** | PDF CEID list vs Excel CEID sheet | Identify missing/added CEIDs |
| C-2 | **SVID match** | PDF SV definitions vs Excel SVID sheet | Identify missing/added SVIDs |
| C-3 | **DVID match** | PDF DV definitions vs Excel DVID sheet | Identify missing/added DVIDs |
| C-4 | **ECID match** | PDF EC definitions vs Excel ECID sheet | Identify missing/added ECIDs |
| C-5 | **ALID match** | PDF alarm definitions vs Excel ALID sheet | Identify missing/added ALIDs |
| C-6 | **RCMD match** | PDF remote commands vs Excel RCMD sheet | Identify parameter differences |
| C-7 | **CEID→DVID mapping** | PDF Report definitions vs Excel CEID VALID DVID | Identify mapping mismatches |
| C-8 | **Data types** | PDF variable types vs Excel FORMAT column | Identify type mismatches |

#### Cross-Check Result Format

```
## PDF ↔ Excel Cross-Check Results

### Matching Items
- CEID: PDF 20 = Excel 20 (match)
- RCMD: PDF 8 = Excel 8 (match)

### Mismatching Items
- SVID: PDF 165, Excel 170 — SVIDs in Excel only: 3283, 3284, 3285, 3286, 3287
  → Possible cause: Variables added after PDF was written due to equipment update
  → Recommended action: Confirm with equipment vendor

- ALID: PDF 450, Excel 497 — Excel has 47 more
  → Recommended action: Use Excel as the latest reference, but confirm the additions

### CEID → DVID Mapping Verification
| CEID | PDF-based DVID | Excel-based DVID | Match |
|------|---------------|-----------------|-------|
| 4 (LoadRequest) | 4013 | 4013 | OK |
| 5 (LoadComplete) | 4005,4006,4013 | 4005,4006,4013 | OK |
| ... | ... | ... | ... |
```

> **Principle**: When mismatches are found, do not assert "which one is correct" — show data from both sides and recommend confirming with the equipment vendor.

### 4-D. Cross-Equipment Comparison Analysis (when 2 or more equipment are present)

Analyze SECS/GEM spec differences between different equipment (or different versions of the same equipment).
This step is a key step to **identify the impact scope when modifying the host program**.

#### Comparison Items

| # | Comparison Item | Method | Host Impact |
|---|----------------|--------|------------|
| D-1 | **Supported S/F differences** | Compare S/F lists from both → identify S/F present in only one | High — new S/F implementation needed |
| D-2 | **S/F message structure differences** | Compare data structures (SML) of the same S/F | High — parsing logic modification needed |
| D-3 | **CEID differences** | Compare CEID numbers, names, mapped DVIDs | Medium — event handler modification |
| D-4 | **SVID/DVID differences** | Compare variable IDs, names, types, counts | Medium — variable mapping table update |
| D-5 | **ECID differences** | Compare EC IDs, names, counts | Low — settings table update |
| D-6 | **ALID differences** | Compare alarm IDs, messages, severity | Medium — alarm handling logic update |
| D-7 | **RCMD differences** | Compare command names, parameters, SML structures | High — remote control logic update |
| D-8 | **State Model differences** | Compare state transition conditions and events | High — state management logic update |
| D-9 | **Communication settings differences** | Compare port, Device ID, timers, etc. | Low — communication settings change |

#### Comparison Result Format

```markdown
## Equipment Comparison Analysis: [Equipment A] vs [Equipment B]

### Summary
- Comparison targets: PRS-03 (2025.08.15) vs PRS-04 (2025.12.12)
- Total difference items: XX
- Host impact: High X, Medium X, Low X

### 1. Supported S/F Differences
| S/F | PRS-03 | PRS-04 | Difference Type | Host Impact |
|-----|--------|--------|----------------|------------|
| S2F49/50 | Not supported | Supported | Added | New implementation needed |
| S14F1/2 | Supported | Not supported | Removed | Remove call or add branch |
| S2F41 | Structure A | Structure B | Changed | Parameter modification needed |

### 2. CEID Differences
| Item | PRS-03 | PRS-04 | Notes |
|------|--------|--------|-------|
| Total events | 18 | 21 | 3 added in PRS-04 |
| Added CEIDs | - | CEID 19, 20, 21 | New event handlers needed |
| Removed CEIDs | - | - | None |
| DVID mapping changes | - | DVIDs 5101~6606 added to CEID 7 | Data collection scope change |

### 3. SVID Differences
#### SVIDs only in PRS-04 (new)
| SVID | Name | Description |
|------|------|-------------|
| 3283 | ... | ... |

#### SVIDs only in PRS-03 (removed)
| SVID | Name | Description |
|------|------|-------------|
| (none) | | |

#### SVIDs present in both but with different content
| SVID | Item | PRS-03 | PRS-04 |
|------|------|--------|--------|
| 207 | Name | BATH STATE | BATH 1 STATE |

### 4. ALID Differences
- PRS-03: XXX / PRS-04: XXX
- Added alarms: (list)
- Removed alarms: (list)
- Message changes: (list)

### 5. RCMD Differences
(same format for comparison)

### 6. Host Modification Checklist
| # | Modification Item | Impact | Details |
|---|------------------|--------|---------|
| 1 | Implement new S2F49/50 handler | High | Newly supported in PRS-04 |
| 2 | Add CEID 19~21 event handlers | Medium | 3 new events |
| 3 | Update SVID mapping table | Medium | 5 new variables |
| ... | ... | ... | ... |
```

> **Core principle**: The ultimate goal of comparison analysis is to clearly identify **"what needs to be modified in the host program"**.
> Always include **host impact level and a modification checklist**, not just a list of differences.


