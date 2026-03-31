# Content Migration Guide (Loop → Obsidian)

Apply this guide when migrating content from Microsoft Loop or other sources to an Obsidian vault.

---

## 1. Processing by Input Type

### Screenshot / Captured Image
1. Read text, tables, and structure from the image
2. Convert to Markdown
3. Apply design-guide.md rules

### Text Copy-Paste
1. Remove Loop-specific formatting (unnecessary tags, broken structure)
2. Restructure to Markdown standard
3. Apply design-guide.md rules

---

## 2. Loop → Obsidian Conversion Rules

### Table Conversion
Convert Loop tables → Markdown tables:
```markdown
| Col1 | Col2 | Col3 |
|---|---|---|
| Val1 | Val2 | Val3 |
```
- Remove Loop UI elements (sort icon `≡`, "Create New" button, etc.)
- Remove row number columns (unnecessary in Markdown)

### Headings / Subheadings
- Loop `■ Heading` → `## Heading` (H2)
- Loop indented structure → convert to Markdown list or sub-headings

### Emphasis
- Loop bold text → `**text**`
- Loop code style → `` `code` ``

### Removing Unnecessary Elements
- "Create New" buttons
- Sort/filter UI icons
- Loop-specific widgets (checklist widget → Markdown checkbox `- [ ]`)

---

## 3. Document Structure Standardization

### Required Sections (for CMMI documents)
```markdown
# {Document Title}

> [!note] {Project Name}

## Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | {date} | {author} | Initial creation |

---

## {Body Sections}

(Written according to design-guide.md rules)
```

---

## 4. Verification Checklist

Verify after conversion:
- [ ] All text from the source is included
- [ ] Table structure is correctly converted
- [ ] All Loop UI elements are removed
- [ ] design-guide.md rules are applied (Callout, dividers, emphasis)
- [ ] Internal links are added where needed
