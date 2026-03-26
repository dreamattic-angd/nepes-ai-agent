// status-line.js
// Claude Code 커스텀 상태 라인
// settings.json의 "statusLine" 에서 호출됨
// Windows Node.js 환경 호환

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 3000 }).trim();
  } catch {
    return '';
  }
}

// Git 브랜치명
const branch = run('git rev-parse --abbrev-ref HEAD') || 'no-git';

// 미커밋 변경 파일 수
const statusOutput = run('git status --porcelain');
const changedFiles = statusOutput ? statusOutput.split('\n').filter(l => l.trim()).length : 0;
const changedIndicator = changedFiles > 0 ? ` *${changedFiles}` : '';

// 프로젝트 감지 (git remote에서 repo명 추출)
let project = '';
const remote = run('git remote get-url origin');
if (remote) {
  const match = remote.match(/[/\\]([^/\\]+?)(?:\.git)?$/);
  if (match) {
    const repo = match[1];
    if (repo === 'nepes-ai-agents' || repo === '00_nepes-ai-agent') project = 'NAA';
    else if (repo === 'APP_RMSPAGE') project = 'RMS';
    else if (repo === 'YTAP') project = 'YTAP';
    else if (repo === 'RMSSERVER') project = 'RMSS';
    else if (repo === 'YTAP_MANAGER') project = 'YTAP_MGR';
    else project = repo.substring(0, 8);
  }
}

// ── 최근 워크플로우 실행 결과 ──────────────────────────────

const WORKFLOW_ABBREVS = { 'git-workflow': 'git-wf' };

function abbreviateWorkflow(name) {
  return WORKFLOW_ABBREVS[name] || name.substring(0, 6);
}

function formatRelativeTime(isoTimestamp) {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return '<1m';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * workflow-runs.jsonl 끝 4KB만 읽어서 마지막 터미널 이벤트를 찾는다.
 * 전체 파일을 읽지 않아 대용량에서도 빠르다.
 */
function getLastWorkflowStatus() {
  try {
    const logFile = path.join(
      process.env.USERPROFILE || process.env.HOME,
      '.claude', 'logs', 'workflow-runs.jsonl'
    );
    if (!fs.existsSync(logFile)) return '';

    const stat = fs.statSync(logFile);
    if (stat.size === 0) return '';

    // 끝 4KB만 읽기
    const fd = fs.openSync(logFile, 'r');
    const bufSize = Math.min(4096, stat.size);
    const buf = Buffer.alloc(bufSize);
    fs.readSync(fd, buf, 0, bufSize, stat.size - bufSize);
    fs.closeSync(fd);

    const lines = buf.toString('utf8').trim().split('\n');

    // 뒤에서부터 터미널 이벤트 탐색
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const record = JSON.parse(lines[i]);

        // workflow_complete (성공)
        if (record.event === 'workflow_complete') {
          const icon = (record.result === 'failure') ? 'x' : 'v';
          return `${icon}${abbreviateWorkflow(record.workflow)} ${formatRelativeTime(record.timestamp)}`;
        }

        // 실패/중단으로 종료
        if (record.result === 'failure' || record.result === 'aborted') {
          return `x${abbreviateWorkflow(record.workflow)} ${formatRelativeTime(record.timestamp)}`;
        }
      } catch (_) {
        // 파싱 실패 행은 건너뜀
      }
    }

    return '';
  } catch (_) {
    return '';
  }
}

const wfStatus = getLastWorkflowStatus();

// 상태 라인 출력
const parts = [];
if (project) parts.push(`[${project}]`);
parts.push(`${branch}${changedIndicator}`);
if (wfStatus) parts.push(`| ${wfStatus}`);

process.stdout.write(parts.join(' '));
