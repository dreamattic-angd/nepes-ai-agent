// status-line.js
// Claude Code 커스텀 상태 라인
// settings.json의 "statusLine" 에서 호출됨
// Windows Node.js 환경 호환

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

// 상태 라인 출력
const parts = [];
if (project) parts.push(`[${project}]`);
parts.push(`${branch}${changedIndicator}`);

process.stdout.write(parts.join(' '));
