// log-workflow.js
// 워크플로우 실행 로그를 JSONL 파일에 기록하는 유틸리티
// 다른 hook이나 커맨드에서 require하여 사용

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'workflow-runs.jsonl');

function logWorkflow(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    const record = {
      timestamp: new Date().toISOString(),
      ...entry
    };
    fs.appendFileSync(LOG_FILE, JSON.stringify(record) + '\n', 'utf8');
  } catch (e) {
    // 로깅 실패는 워크플로우를 중단하지 않음
  }
}

module.exports = { logWorkflow, LOG_FILE };
