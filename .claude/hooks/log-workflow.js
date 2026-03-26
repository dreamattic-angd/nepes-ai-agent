// log-workflow.js
// 워크플로우 실행 로그를 JSONL 파일에 기록하는 유틸리티
// 다른 hook이나 커맨드에서 require하여 사용

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'workflow-runs.jsonl');
const TIMER_DIR = path.join(LOG_DIR, '.timers');

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

/**
 * 워크플로우 시작 시점을 파일에 기록한다.
 * 각 Phase가 별도 node 프로세스로 실행되므로 메모리가 아닌 파일 기반.
 * @param {string} workflowId - 워크플로우 식별자 (예: 'git-workflow')
 */
function startTimer(workflowId) {
  try {
    if (!fs.existsSync(TIMER_DIR)) {
      fs.mkdirSync(TIMER_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(TIMER_DIR, `${workflowId}.start`), Date.now().toString(), 'utf8');
  } catch (e) {
    // 타이머 실패는 워크플로우를 중단하지 않음
  }
}

/**
 * 워크플로우 시작 시점으로부터 경과시간(ms)을 반환한다.
 * @param {string} workflowId
 * @returns {number|null} 경과시간(ms). 타이머 없으면 null
 */
function getElapsedMs(workflowId) {
  try {
    const timerFile = path.join(TIMER_DIR, `${workflowId}.start`);
    if (!fs.existsSync(timerFile)) return null;
    const startTime = parseInt(fs.readFileSync(timerFile, 'utf8').trim(), 10);
    return Date.now() - startTime;
  } catch (e) {
    return null;
  }
}

/**
 * 워크플로우 타이머 파일을 삭제한다.
 * @param {string} workflowId
 */
function clearTimer(workflowId) {
  try {
    const timerFile = path.join(TIMER_DIR, `${workflowId}.start`);
    if (fs.existsSync(timerFile)) fs.unlinkSync(timerFile);
  } catch (e) {
    // best-effort
  }
}

module.exports = { logWorkflow, LOG_FILE, startTimer, getElapsedMs, clearTimer };
