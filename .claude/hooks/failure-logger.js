// failure-logger.js
// 실패 이벤트를 JSONL 파일에 기록하고 조회하는 유틸리티
// 다른 hook이나 워크플로우 phase에서 require하여 사용

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'logs');
const FAILURE_FILE = path.join(LOG_DIR, 'failures.jsonl');

// 실패 유형 상수
const FAILURE_TYPES = {
  HOOK_BLOCK: 'hook_block',
  GIT_ERROR: 'git_error',
  VALIDATION_FAIL: 'validation_fail',
  SCRIPT_ERROR: 'script_error',
  IO_ERROR: 'io_error',
  REVIEW_REJECT: 'review_reject',
  MERGE_CONFLICT: 'merge_conflict',
  CHECKPOINT_ERROR: 'checkpoint_error',
  NETWORK_ERROR: 'network_error'
};

// 심각도 상수
const SEVERITY = {
  CRITICAL: 'critical',
  RECOVERABLE: 'recoverable',
  INFORMATIONAL: 'informational'
};

/**
 * 실패 이벤트를 failures.jsonl에 기록한다.
 * 로깅 실패는 워크플로우를 중단하지 않는다 (best-effort).
 *
 * @param {Object} entry
 * @param {string} entry.workflow - 워크플로우명 (예: 'git-workflow')
 * @param {number|string} entry.phase - Phase 번호 또는 식별자
 * @param {string} entry.failureType - FAILURE_TYPES 중 하나
 * @param {string} [entry.subType] - 하위 유형 (예: 'branch_exists', 'tag_exists')
 * @param {string} entry.severity - SEVERITY 중 하나
 * @param {string} entry.cause - 에러 메시지 또는 원인 설명
 * @param {Object} [entry.context] - 관련 컨텍스트 (명령어, 파일 경로 등)
 * @param {string} [entry.recoveryAction] - 수행한 복구 조치
 * @param {boolean} [entry.resolved] - 복구 성공 여부
 * @param {number} [entry.retryCount] - 재시도 횟수
 */
function logFailure(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    const record = {
      timestamp: new Date().toISOString(),
      workflow: entry.workflow || 'unknown',
      phase: entry.phase || 0,
      failureType: entry.failureType || 'unknown',
      subType: entry.subType || null,
      severity: entry.severity || SEVERITY.INFORMATIONAL,
      cause: entry.cause || '',
      context: entry.context || {},
      recoveryAction: entry.recoveryAction || null,
      resolved: entry.resolved !== undefined ? entry.resolved : false,
      retryCount: entry.retryCount || 0
    };
    fs.appendFileSync(FAILURE_FILE, JSON.stringify(record) + '\n', 'utf8');
    return true;
  } catch (e) {
    // 로깅 실패는 워크플로우를 중단하지 않음
    return false;
  }
}

/**
 * failures.jsonl에서 실패 이벤트를 조회한다.
 *
 * @param {Object} [filter]
 * @param {string} [filter.failureType] - 특정 실패 유형 필터
 * @param {string} [filter.workflow] - 특정 워크플로우 필터
 * @param {number} [filter.sinceDays] - 최근 N일 이내 (기본: 전체)
 * @param {number} [filter.limit] - 최대 반환 건수 (기본: 100)
 * @returns {Array} 실패 레코드 배열
 */
function queryFailures(filter = {}) {
  try {
    if (!fs.existsSync(FAILURE_FILE)) return [];

    const lines = fs.readFileSync(FAILURE_FILE, 'utf8').trim().split('\n');
    const sinceDate = filter.sinceDays
      ? new Date(Date.now() - filter.sinceDays * 86400000).toISOString()
      : null;
    const limit = filter.limit || 100;

    const results = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (filter.failureType && record.failureType !== filter.failureType) continue;
        if (filter.workflow && record.workflow !== filter.workflow) continue;
        if (sinceDate && record.timestamp < sinceDate) continue;
        results.push(record);
        if (results.length >= limit) break;
      } catch (_) {
        // 손상된 행은 건너뜀
      }
    }
    return results;
  } catch (e) {
    return [];
  }
}

module.exports = { logFailure, queryFailures, FAILURE_TYPES, SEVERITY, FAILURE_FILE };
