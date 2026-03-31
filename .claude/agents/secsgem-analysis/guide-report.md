## Step 5: Generate Analysis Result Report

### 5-0. Analysis Result Self-Verification (CoVe — Chain of Verification)

> **Why is this step needed?**
> PDF extraction errors, page omissions, and data misrecognition can occur during the analysis process.
> Verifying the accuracy of key data **before** generating the report
> significantly improves the report's reliability.

**Verification process (executed internally):**

```
[Step 1: Identify key figures]
List key figures to include in the report:
- Total supported S/F count
- Total CEID count and list
- Total SVID/DVID/ECID count
- Total ALID count
- Total RCMD count

[Step 2: Cross-verify]
Re-verify each figure using the following methods:
- Count extracted from PDF vs count extracted from Excel → check for match
- Step 4 checklist memos vs actual extracted data → check for omissions
- Verify that DVIDs referenced in CEID→DVID mapping actually exist

[Step 3: Handle mismatches]
- When a mismatch is found: state it explicitly in the cross-check section of the report
- When verification is not possible: mark and add "verify original recommended" note
- When verification passes: finalize the figure for inclusion in the report
```

### 5-1. Draft Writing and Self-Improvement (Self-Critique & Refine)

> **Why is this step needed?**
> Separating "generation" and "evaluation" improves the quality of each.
> Writing a draft first, then critically reviewing and improving it,
> improves the final report quality by 30–50%.

**Self-improvement process:**

```
[Step 1: Write draft]
Write the best draft following the report structure below.

[Step 2: Critique with 3 lenses]
Review the written draft from the following perspectives:

| Review Lens | Review Question |
|------------|----------------|
| Completeness | Are all items from the step 4 checklist reflected in the report? Are any sections missing? |
| Practicality | Can a host developer start implementation using only this report? Are there any vague descriptions? |
| Accuracy | Do the figures in the report match those verified in step 5-0 (CoVe)? |

[Step 3: Improve and finalize]
Improve the final report by addressing the weaknesses found in the critique.
```

> **Note**: Execute this process internally. Do not show the user the draft/critique process — save **the final version only**.

After all chunk analyses are complete, generate a **comprehensive analysis report** as a markdown file following the structure below.

### Report Filename Format
```
[equipment_name]_SECSGEM_Analysis_[date].md
```

### Report Save Location

> **Save all reports to `.claude/agents/secsgem-analysis/analysis-reports/`.**
> Do not create directly in the project root.

```
project root/
└── .claude/
    ├── commands/
    │   └── analyze-secsgem.md          ← command (orchestrator)
    └── agents/
        └── secsgem-analysis/
            ├── README.txt              ← installation guide
            ├── guide.md                ← guide (this file)
            ├── secsgem-specs/          ← original documents only (input)
            │   └── original.pdf / .doc / .docx / .xls
            └── analysis-reports/       ← report + artifacts output (auto-created)
                ├── PRS03_SECSGEM_Analysis.md
                ├── PRS04_SECSGEM_Analysis.md
                ├── PRS03_vs_PRS04_Comparison.md
                └── extract/            ← intermediate artifacts
                    ├── original_chunks/    ← PDF split
                    └── original_extracted/ ← text extraction
```

> Auto-create the `analysis-reports/` folder if it does not exist.

### Report Structure

```markdown
# [Equipment Name] SECS/GEM Specification Analysis Report

## 1. Document Overview
- Document name:
- Version:
- Date:
- Target equipment:
- Analysis input files: PDF / Word / Excel / combination

## 2. Communication Settings Summary
(step 4-1 results)

## 3. State Model Summary
(step 4-2 results — include ASCII state diagram if possible)

## 4. Stream/Function List and Details
(step 4-3 results)

### 4.1 Supported S/F Complete List (summary table)
| S/F | Name | Direction | W-bit | Purpose Summary |
|-----|------|-----------|-------|----------------|

### 4.2 Individual S/F Detailed Definitions
(individual S/F details)

## 5. Variable Definitions
(step 4-4 results — integrated from PDF/Word/Excel)

### 5.1 Status Variables (SVID)
### 5.2 Data Variables (DVID)
### 5.3 Equipment Constants (ECID)

## 6. Collection Events
(step 4-5 results — including CEID → DVID mapping)

## 7. Alarms
(step 4-6 results — complete list based on Excel ALID sheet + severity distribution)

## 8. Remote Commands
(step 4-7 results — including SML structures from Excel RCMD sheet)

## 9. Process Programs
(step 4-8 results)

## 10. Key Scenarios
(step 4-9 results)

## 11. Special Notes and Precautions
(step 4-10 results)

## 12. Spec ↔ Excel Cross-Check Results
(step 4-C results — only when both Spec body (PDF/Word) + Excel are available)

## 13. Appendix: Quick Reference
- Frequently used S/F summary
- CEID → Report → Variable mapping summary
- RCMD command + parameter summary
- Essential checklist for host implementation
```

### Comparison Analysis Report (generated separately when comparing 2 or more equipment)

In comparison analysis mode, generate a comparison report **in addition to** the individual equipment reports.

**Comparison report filename format:**
```
[equipment_A]_vs_[equipment_B]_Comparison_[date].md
```

**Comparison report structure:**
```markdown
# [Equipment A] vs [Equipment B] SECS/GEM Comparison Analysis Report

## 1. Comparison Overview
- Comparison targets and document versions
- Comparison date

## 2. Summary Dashboard
- Total difference item count
- Classification by host impact level
- Top 5 key changes

## 3. Detailed Comparison (step 4-D results)
(detailed comparison tables per item)

## 4. Host Modification Checklist
(modification-needed items organized by priority)

## 5. Recommended Actions
- Items requiring immediate modification
- Items requiring confirmation before modification
- Items requiring vendor inquiry
```

---
