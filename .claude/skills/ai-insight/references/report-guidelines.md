# AI Utilization Insight Report Generation Guidelines

## Report Context

- Report audience: Approval authority (team lead to department head level; values cost-effectiveness over technical details)
- Report frequency: Once a month (basis for monthly Max Plan approval)
- Report author: AI Equipment Team engineer (responsible for semiconductor equipment IT systems: FDC/EES/RMS/YTAP, etc.)
- Report format: Markdown (.md) file

---

## Analysis Framework (5 Axes)

### A) Usage Domain Classification
- Classify each session into one of: [Development / Analysis-Debugging / Documentation-Reports / Design-Architecture / Automation-Workflow / Learning-Capability]
- Calculate count and percentage (%) per domain

### B) Productivity Impact Estimation
- Estimate "time required without AI" vs "actual time with AI" for each task
- Calculate total time saved and average reduction rate
- State the estimation basis (e.g., "SECS/GEM spec analysis — manual 7~10 hours → AI-assisted 20 min, 95% reduction")

### C) Approach Pattern Analysis
- Identify strategic patterns in how the user applies AI
- Examples: prompt systematization (version control), agent specialization, multi-phase verification, repetitive automation
- Explain the impact of each pattern on output quality

### D) Capability Evolution Trajectory
- New AI techniques tried or developed during the period
- What growth occurred compared to previous periods (if any)

### E) Business Value Conversion
- Convert time savings to cost (using estimated engineer hourly rate)
- Calculate ROI against Max Plan cost
- Qualitative value: quality improvement, risk reduction, knowledge systematization, etc.

---

## Report Output Format

Filename rule:
- `AI_Insight_Report_{YYYYMMDD}_{YYYYMMDD}.md`
- Output path: `~/.claude/skills/ai-insight/reports/`

### Report Structure

```markdown
# AI Utilization Insight Report
> Analysis Period: YYYY.MM.DD ~ YYYY.MM.DD | Author: {{author}} | Department: {{department}}

---

## Executive Summary

### This Analysis Period at a Glance
| Metric | Value |
|--------|-------|
| Analysis Period | YYYY.MM.DD ~ YYYY.MM.DD |
| AI-assisted Tasks | N tasks (Claude Code X + Desktop Agent Y + Desktop General Z) |
| Total Time Saved (estimated) | ~N hours |
| Average Productivity Improvement | N% |
| Max Plan Cost | $X |
| Estimated ROI | Nx |

### 3 Key Achievements
1. **[Achievement 1 Title]**: 1–2 sentence summary
2. **[Achievement 2 Title]**: 1–2 sentence summary
3. **[Achievement 3 Title]**: 1–2 sentence summary

### AI Utilization Philosophy
(2–3 sentences summarizing the AI usage philosophy extracted from the user's conversation patterns)

### Approval Opinion
(Summarize the rationale for continuing Max Plan in 3 sentences or fewer)

---

## Appendix: Detailed Analysis

### A. Analysis by Usage Domain
(Count and percentage per domain with text bar chart, key examples)

### B. Key Task Details
(Detailed analysis of the 3–5 highest-impact tasks during the analysis period)

| Task | Domain | AI Approach | Time Saved | Key Outcome |
|------|--------|-------------|------------|-------------|
| ... | ... | ... | ... | ... |

### C. AI Utilization Approach Patterns
(Description and effect of each identified pattern)

### D. Capability Evolution Trajectory
(New attempts and growth points during the period)

### E. ROI Detailed Calculation
(Detailed cost-vs-value calculation)

### F. Outlook for Next Period
(Ongoing AI utilization tasks, expected impact)
```

---

## Writing Principles

### 1. Neuroscience-based Persuasion Structure
- Anchoring effect: expose ROI figures first in the Executive Summary table
- Specificity bias: use concrete examples like "SECS/GEM spec analysis 7 hours → 20 min, 95% reduction" instead of "productivity improved"
- Loss aversion: imply the inefficiency that would have occurred without this tool
- Peak-end rule: place the most impressive achievement at the beginning and end
- Cognitive fluency: use short sentences, clear numbers, and intuitive tables for easy reading

### 2. Data Honesty
- Always mark estimates with "~" or "(estimated)"
- No exaggeration. Use conservative estimates within reasonable bounds
- Exclude figures that cannot be verified

### 3. Tone
- Management report tone: concise and professional
- Executive Summary within one page
- Appendix written in detail on the assumption that only interested readers will read it

### 4. Variable Handling
- Mark information that cannot be determined from conversation history as `{{variable_name}}` so the user can fill it in
- Apply the latest Max Plan price (default: $100/month)

---

## Anti-patterns

- BAD: "Utilized AI in various ways to improve work efficiency"
- GOOD: "Developed a SECS/GEM spec analysis agent, reducing per-equipment analysis time from 7–10 hours to approximately 20 minutes (approximately 95% reduction)"

- BAD: "Prompt engineering skills have grown"
- GOOD: "Systematized prompt design framework from v8→v9→v10, adding 3 core techniques including XML structural markup and neuroscience-based optimization"

- BAD: Present unrealistic figures such as 10,000% ROI
- GOOD: Present conservatively estimated figures with clear rationale, stating uncertain portions explicitly

---

## Constraints

- Never include non-work-related conversation content
- Never quote conversation text verbatim (analysis and summary only)
- Generalize personal information (other than names) and confidential technical details
- Mark unanalyzable items as "insufficient data"; never fill them with speculation

---

## Data Source Notation

Always include data source notation at the bottom of the report:

```markdown
*This report was generated based on Claude Code CLI conversation history (N sessions), Claude Desktop Agent mode history (M sessions){, Claude Desktop general chat history (K sessions)}. Time savings and ROI are estimates and may differ from actual figures.*
```

When Desktop general chat history is not included:
```markdown
*Note: Claude Desktop general chat (non-Code mode) history was not included. Including it may increase task count and time savings.*
```
