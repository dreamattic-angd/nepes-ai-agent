# Obsidian Note Design Guide

Apply the following standards when writing or editing Obsidian notes.

---

## 1. Document Structure

### Heading Hierarchy
- `#` H1: Document title — **exactly one**
- `##` H2: Major sections (3–6 recommended)
- `###` H3: Sub-items
- H4 and below → replace with Callout or list

### Front Matter
Include YAML front matter when writing notes:
```yaml
---
tags: [SCM, CMMI, BranchStrategy, NEPES-AI-AGENT]
created: 2026-03-19
project: NEPES-AI-AGENT
author: Gil-Woo Lee
---
```
- `tags`: document topic classification (hierarchical classification allowed: `SCM/Branch`, `CMMI/L2`)
- `created`: initial creation date (same as the initial creation date in the revision history table)
- `project`: project name
- `author`: author name

### Revision History Rules
- If the document has a revision history table, always update it when the document is modified
- Documents without a revision history table are not subject to this rule

### Section Dividers
- Use `---` divider lines to separate major sections
- 3 or more consecutive text paragraphs → consider inserting a Callout or divider

---

## 2. Callouts (Highlight Boxes)

### Usage Criteria by Type
```
> [!note] Core concept / definition
> [!tip] Practical tip / recommendation
> [!warning] Caution / warning
> [!danger] Danger / prohibition
> [!summary] Summary / conclusion
> [!example] Example
> [!question] Question / exploration
```

### Rules
- Never use plain quotes (`> text`) — always specify a Callout type
- Expand/collapse: `> [!tip]+ Title` (expanded by default), `> [!tip]- Title` (collapsed by default)
- Use the same Callout format for the same type of information (consistency)

---

## 3. Text Formatting

### Emphasis
- **Bold**: key terms, numbers, conclusions
- *Italic*: foreign words, quotes, supplementary notes
- `` `code` ``: filenames, paths, commands, technical terms
- ~~Strikethrough~~: only for deprecated or replaced content
- Underline is prohibited (inconsistent Obsidian rendering)

### Lists
- Ordered (`1.`): procedures, steps, priorities
- Unordered (`-`): parallel items (3–7 recommended)
- Maximum 2 levels of nesting — 3 or more levels should be separated into their own section
- 2 or fewer items → write as a sentence instead of a list

### Tables
- Use when comparing 3 or more items with 2 or more attributes
- Minimize line breaks within cells
- 3 or more information items → consider Callout or table first

### Internal Links
- Reference related notes: `[[Note Name]]`
- Reference a specific section: `[[Note Name#Section]]`
- Actively link between notes within the same vault

---

## 4. Diagrams (Mermaid)

### Theme — must be included at the top of every diagram
```
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#5B8DEF',
  'primaryTextColor': '#1a1a2e',
  'primaryBorderColor': '#3D6FD6',
  'lineColor': '#64748B',
  'secondaryColor': '#E8F0FE',
  'tertiaryColor': '#F1F5F9',
  'fontSize': '14px'
}}}%%
```

### Type Selection
| Situation | Type to Use |
|-----------|------------|
| Process / flow (5 steps or fewer) | `flowchart LR` |
| Hierarchy / tree | `flowchart TD` |
| Time sequence / system interactions | `sequenceDiagram` |
| State transitions | `stateDiagram-v2` |
| Schedule / milestones | `gantt` |
| Class / data structure | `classDiagram` |

### Node Shapes
- Start/End → `([Text])`
- General process → `[Text]`
- Decision/branch → `{Text}`
- External system → `[(Text)]`

### Node Color Styling
```
style NodeID fill:#5B8DEF,color:#fff,stroke:#3D6FD6       ← core/emphasis
style NodeID fill:#D1FAE5,color:#065F46,stroke:#10B981    ← complete/success
style NodeID fill:#FEF3C7,color:#92400E,stroke:#F59E0B    ← caution
style NodeID fill:#FEE2E2,color:#991B1B,stroke:#EF4444    ← error/danger
```

### Complex Diagrams
If expression is difficult in Mermaid (left/right labels, group boxes, free positioning needed) → replace with an image and embed with `![[image.png]]`

---

## 5. File Management

### Filename Rules
- Use descriptive names (e.g., `01_Branch Strategy Setup.md`)
- Use numeric prefix for sorting needs (`00_`, `01_`, ...)
- English filenames: lowercase + hyphens (e.g., `git-workflow.md`)

### Images / Attachments
- Store in the same folder as the note or in an `_attachments/` folder
- Embed: `![[image.png]]`
- Resize: `![[image.png|500]]` (specify width)

### Revision History Table
When a revision history is needed in a document:
```markdown
## Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-19 | Gil-Woo Lee | Initial creation |
```

---

## 6. Auto-Decision Rules

- Diagram request detected → automatically apply Mermaid theme init + refer to type selection table
- 3 or more information items → consider Callout or table first
- Steps/procedure detected → use ordered list or `flowchart LR`
- Comparison analysis detected → prefer table format
- 3 or more consecutive text paragraphs → consider inserting a Callout or `---` divider
