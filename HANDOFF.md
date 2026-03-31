# HANDOFF - Work Handoff

**Written**: 2026-03-31 15:30
**Project**: nepes-ai-agents (NEPES_AI_AGENTS)
**Trigger**: Manual

## Goal

Convert all Korean instruction files in the nepes-ai-agents project to English for token efficiency, while keeping README.md as the Korean human-readable reference.

## Progress
- [x] Research best practices for translating Korean LLM prompt imperatives to English
- [x] Convert `CLAUDE.md` (project root) to English — marker tags preserved
- [x] Convert all 15 files under `.claude/commands/` to English
- [x] Convert all 8 files under `.claude/skills/` (ai-insight, obsidian-note, session-handoff) to English
- [x] Convert all 24 files under `.claude/agents/` (including subdirectories) to English
- [ ] Run `install.bat` to deploy converted files to `~/.claude/`
- [ ] Verify deployed files at `~/.claude/` are correctly updated

## Successful Approaches

- **Parallel subagents**: Used 3 simultaneous developer agents (commands / skills / agents) — completed 47 files concurrently in one pass
- **Translation principles applied**:
  - `반드시` → `must` / `always`
  - `즉시` → `immediately`
  - `절대 ~않는다` → `never` / `under no circumstances`
  - `~한다` (imperative) → present-tense directive (e.g., "Execute X", "Verify X")
  - Claude 4.x does NOT need ALL CAPS — normal phrasing is sufficient
- **Sync mechanism**: Already exists via `install-merge.js` marker-based merge (`<!-- nepes-ai-agents:start/end -->`) — no additional work needed
- **README.md**: Already in Korean with full detail — retained as-is (no docs/GUIDE.ko.md needed)

## Failed Approaches

None in this session.

## Key Context

### Files Changed
- `D:/lgw/77_AI/00_nepes-ai-agent/CLAUDE.md` — English conversion complete
- `D:/lgw/77_AI/00_nepes-ai-agent/.claude/commands/*.md` — 15 files converted
- `D:/lgw/77_AI/00_nepes-ai-agent/.claude/skills/ai-insight/` — 3 files converted
- `D:/lgw/77_AI/00_nepes-ai-agent/.claude/skills/obsidian-note/` — 3 files converted
- `D:/lgw/77_AI/00_nepes-ai-agent/.claude/skills/session-handoff/` — 2 files converted
- `D:/lgw/77_AI/00_nepes-ai-agent/.claude/agents/` — 24 files converted (including all subdirectories)

### What Was NOT Changed
- `README.md` — kept in Korean (serves as human-readable reference)
- `~/.claude/CLAUDE.md` (global) — never touch; deploy target of install.bat
- `~/.claude/` contents in general — not yet updated; pending `install.bat` run

### Branch Status
- Current branch: `develop` (clean, no uncommitted changes before this session)
- Changes made in this session are NOT yet committed

### Sync Mechanism
- `CLAUDE.md` uses marker-based merge: `<!-- nepes-ai-agents:start -->` ... `<!-- nepes-ai-agents:end -->`
- `install.bat` → `install-merge.js` handles deployment to `~/.claude/CLAUDE.md` automatically
- No additional sync tooling needed

### Background: Why English
- Korean tokens cost ~1.5–2x more than English tokens
- Claude Sonnet/Opus 4.x follows English directives at ~97% fidelity vs Korean
- Instruction files are loaded every conversation — token savings accumulate

## Next Steps

1. **Commit the changes** via `/git-workflow` (all 48 converted files)
2. **Run `install.bat`** to deploy converted files to `~/.claude/`
3. **Verify** that `~/.claude/commands/`, `~/.claude/skills/`, `~/.claude/agents/` reflect the English versions
4. **Optional**: spot-check a few converted files to confirm translation quality (e.g., `git-workflow.md`, `code-review.md`)
