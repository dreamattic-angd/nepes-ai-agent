"""
AI Insight 보고서용 JSONL 세션 수집 스크립트
- 소스 A (Claude Code CLI) + 소스 B (Desktop Agent Mode) + 소스 C (Desktop Code Metadata)
- 날짜 범위 필터링 → 최소 필드 추출 → 압축 구조체 JSON 출력
"""

import json
import os
import sys
import glob
import re
from datetime import datetime, timezone
from pathlib import Path


def parse_args():
    if len(sys.argv) < 3:
        print("Usage: python collect_sessions.py <start_date> <end_date>", file=sys.stderr)
        print("  Date format: YYYYMMDD (e.g., 20260312 20260319)", file=sys.stderr)
        sys.exit(1)
    start = datetime.strptime(sys.argv[1], "%Y%m%d").replace(tzinfo=timezone.utc)
    end = datetime.strptime(sys.argv[2], "%Y%m%d").replace(
        hour=23, minute=59, second=59, tzinfo=timezone.utc
    )
    return start, end


def parse_timestamp(ts_str):
    if not ts_str:
        return None
    try:
        ts_str = ts_str.rstrip("Z")
        if "+" in ts_str[10:]:
            ts_str = ts_str[: ts_str.rindex("+")]
        elif ts_str.count("-") > 2:
            last_dash = ts_str.rindex("-")
            if last_dash > 10:
                ts_str = ts_str[:last_dash]
        dt = datetime.fromisoformat(ts_str)
        return dt.replace(tzinfo=timezone.utc)
    except (ValueError, IndexError):
        return None


def identify_project(cwd, dir_name=""):
    text = (cwd or "") + "|" + (dir_name or "")
    text_lower = text.lower().replace("\\", "/")
    if "ytap-manager" in text_lower or "ytap_manager" in text_lower:
        return "YTAP_MANAGER"
    if "ytap" in text_lower:
        return "YTAP"
    if "app-rmspage" in text_lower or "app_rmspage" in text_lower:
        return "APP_RMSPAGE"
    if "rmsserver" in text_lower:
        return "RMSSERVER"
    if "01-claude-workspace" in text_lower or "nepes-ai-agent" in text_lower:
        return "nepes-ai-agents"
    home_name = Path.home().name.lower()
    if f"c--users-{home_name}" in text_lower or text_lower.endswith(f"c:/users/{home_name}") or text_lower.endswith(f"c:\\users\\{home_name}"):
        return "Claude Code 환경설정"
    return "기타"


def classify_domain(summary, tools, files):
    summary_lower = summary.lower()
    tools_set = set(tools)
    files_str = " ".join(files).lower()

    code_exts = (".java", ".py", ".js", ".ts", ".bat", ".sh")
    has_code_files = any(files_str.endswith(ext) or ext + " " in files_str for ext in code_exts)
    has_write_edit = bool(tools_set & {"Write", "Edit"})

    if "EnterPlanMode" in tools_set or any(
        kw in summary_lower for kw in ["설계", "아키텍처", "mcp", "구조"]
    ):
        return "설계·아키텍처"
    if any(kw in summary_lower for kw in ["git-workflow", "skill.md", "commands", "install.bat", "hook"]):
        return "자동화·워크플로우"
    if any(kw in summary_lower for kw in ["에러", "오류", "분석", "로그", "알람", "장애"]) or any(
        t.startswith("mcp__oracle") for t in tools
    ):
        return "분석·디버깅"
    if has_write_edit and has_code_files:
        return "개발"
    if any(kw in summary_lower for kw in ["문서", "보고서", "보고"]) or any(
        files_str.endswith(ext) for ext in (".md", ".docx", ".pptx")
    ):
        return "문서·보고서"
    if any(kw in summary_lower for kw in ["어떻게", "뭐야", "알려줘", "확인", "가능"]):
        return "학습·역량강화"
    if has_write_edit:
        return "자동화·워크플로우"
    return "기타"


MAX_SUMMARY_CHARS = 200
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def process_jsonl(filepath, start_dt, end_dt, dir_name="", source="A"):
    file_size = os.path.getsize(filepath)
    partial = False

    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            first_lines = []
            for i, line in enumerate(f):
                if i >= 3:
                    break
                first_lines.append(line)

        # Check timestamp from first lines
        session_ts = None
        for line in first_lines:
            try:
                obj = json.loads(line)
                if obj.get("timestamp"):
                    session_ts = parse_timestamp(obj["timestamp"])
                    break
            except (json.JSONDecodeError, KeyError):
                continue

        if session_ts is None:
            return None
        if session_ts < start_dt or session_ts > end_dt:
            return None

        # Read file (with 30% cap for large files)
        read_limit = None
        if file_size > MAX_FILE_SIZE:
            partial = True
            read_limit = int(file_size * 0.3)

        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            if read_limit:
                content = f.read(read_limit)
                lines = content.split("\n")
                if lines and not content.endswith("\n"):
                    lines = lines[:-1]  # drop incomplete last line
            else:
                lines = f.readlines()

        timestamp = None
        cwd = None
        summaries = []
        tools = set()
        files_touched = []
        msg_count = 0

        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            msg_type = obj.get("type")

            if msg_type == "user":
                msg = obj.get("message", {})
                content = msg.get("content", "")
                if isinstance(content, list):
                    content = " ".join(
                        c.get("text", "") for c in content if isinstance(c, dict)
                    )
                if not content or len(content.strip()) < 10:
                    continue
                if "<command-name>" in content:
                    continue

                msg_count += 1
                if timestamp is None:
                    timestamp = obj.get("timestamp")
                if cwd is None:
                    cwd = obj.get("cwd", "")
                summaries.append(content[:MAX_SUMMARY_CHARS])

            elif msg_type == "assistant":
                msg = obj.get("message", {})
                content_blocks = msg.get("content", [])
                if isinstance(content_blocks, list):
                    for block in content_blocks:
                        if isinstance(block, dict) and block.get("type") == "tool_use":
                            tool_name = block.get("name", "")
                            if tool_name:
                                tools.add(tool_name)
                            if tool_name in ("Write", "Edit"):
                                inp = block.get("input", {})
                                fp = inp.get("file_path", "")
                                if fp:
                                    files_touched.append(fp)

        if msg_count == 0:
            return None

        summary = " | ".join(summaries[:5])
        if len(summary) > MAX_SUMMARY_CHARS:
            summary = summary[:MAX_SUMMARY_CHARS]

        project = identify_project(cwd, dir_name)
        if source == "B":
            project = "Claude Desktop 작업"

        domain = classify_domain(summary, list(tools), files_touched)

        result = {
            "timestamp": timestamp,
            "cwd": cwd or "",
            "project": project,
            "summary": summary,
            "tools": sorted(tools),
            "files_touched": files_touched[:20],  # cap at 20
            "domain": domain,
            "msg_count": msg_count,
            "source": source,
        }
        if partial:
            result["tag"] = "[대용량-부분분석]"
        return result

    except Exception as e:
        print(f"Error processing {filepath}: {e}", file=sys.stderr)
        return None


def collect_source_a(start_dt, end_dt):
    """Claude Code CLI sessions"""
    home = Path.home()
    projects_dir = home / ".claude" / "projects"
    if not projects_dir.exists():
        return []

    results = []
    for project_dir in projects_dir.iterdir():
        if not project_dir.is_dir():
            continue
        dir_name = project_dir.name
        for jsonl_file in project_dir.glob("*.jsonl"):
            # Skip subagents and memory
            rel = str(jsonl_file.relative_to(project_dir))
            if "subagents" in rel or "memory" in rel:
                continue
            session = process_jsonl(str(jsonl_file), start_dt, end_dt, dir_name, "A")
            if session:
                results.append(session)
    return results


def collect_source_b(start_dt, end_dt):
    """Claude Desktop Agent Mode sessions"""
    local_app = os.environ.get("LOCALAPPDATA", "")
    if not local_app:
        return []
    base = Path(local_app) / "Packages" / "Claude_pzs8sxrjxfjjc" / "LocalCache" / "Roaming" / "Claude" / "local-agent-mode-sessions"
    if not base.exists():
        return []

    results = []
    for jsonl_file in base.rglob("*.jsonl"):
        rel = str(jsonl_file)
        if "subagents" in rel or jsonl_file.name == "audit.jsonl":
            continue
        session = process_jsonl(str(jsonl_file), start_dt, end_dt, source="B")
        if session:
            results.append(session)
    return results


def collect_source_c(start_dt, end_dt):
    """Claude Desktop Code Metadata (supplementary titles)"""
    local_app = os.environ.get("LOCALAPPDATA", "")
    if not local_app:
        return {}
    base = Path(local_app) / "Packages" / "Claude_pzs8sxrjxfjjc" / "LocalCache" / "Roaming" / "Claude" / "claude-code-sessions"
    if not base.exists():
        return {}

    titles = {}
    for json_file in base.rglob("local_*.json"):
        try:
            with open(json_file, "r", encoding="utf-8", errors="replace") as f:
                data = json.load(f)
            created = data.get("createdAt")
            if created:
                # createdAt is Unix ms
                if isinstance(created, (int, float)):
                    dt = datetime.fromtimestamp(created / 1000, tz=timezone.utc)
                else:
                    dt = parse_timestamp(str(created))
                if dt and start_dt <= dt <= end_dt:
                    cli_id = data.get("cliSessionId", "")
                    title = data.get("title", "")
                    cwd = data.get("cwd", "")
                    if cli_id and title:
                        titles[cli_id] = {"title": title, "cwd": cwd}
        except (json.JSONDecodeError, Exception):
            continue
    return titles


def main():
    start_dt, end_dt = parse_args()

    # Collect from all sources
    sessions_a = collect_source_a(start_dt, end_dt)
    sessions_b = collect_source_b(start_dt, end_dt)
    titles_c = collect_source_c(start_dt, end_dt)

    # Merge Source C titles into Source A sessions (by matching timestamp/cwd)
    # Source C provides titles but no direct session ID link in our simplified approach
    all_sessions = sessions_a + sessions_b

    # Sort by timestamp
    all_sessions.sort(key=lambda s: s.get("timestamp", ""))

    # Output
    output = {
        "date_range": {
            "start": sys.argv[1],
            "end": sys.argv[2],
        },
        "total_sessions": len(all_sessions),
        "source_a_count": len(sessions_a),
        "source_b_count": len(sessions_b),
        "source_c_titles": len(titles_c),
        "sessions": all_sessions,
    }

    # Write to stdout as JSON (force UTF-8 for Windows cp949 compatibility)
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
