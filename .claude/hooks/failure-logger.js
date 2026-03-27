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

// 성공 로그 파일
const SUCCESS_FILE = path.join(LOG_DIR, 'successes.jsonl');
const MAX_SUCCESS_FILE_SIZE = 256 * 1024; // 256KB
const SUCCESS_ROTATE_KEEP_LINES = 100;

// ── 로테이션 ────────────────────────────────────────────────

const MAX_FAILURE_FILE_SIZE = 512 * 1024; // 512KB
const ROTATE_KEEP_LINES = 200;            // 로테이션 시 최근 N행 유지

/**
 * failures.jsonl이 MAX_FAILURE_FILE_SIZE를 초과하면
 * 최근 ROTATE_KEEP_LINES행만 남기고 나머지를 삭제한다.
 * 원자적 쓰기: 임시 파일 → 원본 교체.
 */
function rotateIfNeeded() {
  try {
    if (!fs.existsSync(FAILURE_FILE)) return;
    const stat = fs.statSync(FAILURE_FILE);
    if (stat.size <= MAX_FAILURE_FILE_SIZE) return;

    const lines = fs.readFileSync(FAILURE_FILE, 'utf8').trim().split('\n');
    const kept = lines.slice(-ROTATE_KEEP_LINES).join('\n') + '\n';
    const tmpFile = FAILURE_FILE + '.tmp';
    fs.writeFileSync(tmpFile, kept, 'utf8');
    fs.renameSync(tmpFile, FAILURE_FILE);
  } catch (e) {
    // 로테이션 실패는 워크플로우를 중단하지 않음
  }
}

/**
 * 실패 이벤트를 failures.jsonl에 기록한다.
 * 로깅 실패는 워크플로우를 중단하지 않는다 (best-effort).
 *
 * @param {Object} entry
 * @param {string} entry.workflow - 워크플로우명 (예: 'git-workflow')
 * @param {string} [entry.project] - 프로젝트 식별자 (예: 'RMSSERVER', 'YTAP')
 * @param {number|string} entry.phase - Phase 번호 또는 식별자
 * @param {string} entry.failureType - FAILURE_TYPES 중 하나
 * @param {string} [entry.subType] - 하위 유형 (예: 'branch_exists', 'tag_exists')
 * @param {string} entry.severity - SEVERITY 중 하나
 * @param {string} entry.cause - 에러 메시지 또는 원인 설명
 * @param {Object} [entry.context] - 관련 컨텍스트 (명령어, 파일 경로 등)
 * @param {string} [entry.recoveryAction] - 수행한 복구 조치
 * @param {boolean} [entry.resolved] - 복구 성공 여부
 * @param {number} [entry.retryCount] - 재시도 횟수
 * @param {string} [entry.condition] - 실패가 발생한 구체적 조건 (편향 방지: 무조건 금지 대신 조건부 판단)
 * @param {string} [entry.result] - 실패로 인해 실제 발생한 결과
 * @param {string} [entry.lesson] - 조건과 결과 기반 교훈
 * @param {boolean} [entry.verified] - 인간 검토 완료 여부 (false=가설, true=검증됨)
 * @param {string} [entry.expires] - 교훈 만료일 (ISO 날짜, 예: '2026-09-27')
 */
function logFailure(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    rotateIfNeeded();

    // 기본 만료일: 기록일로부터 6개월 후
    const defaultExpires = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);

    const record = {
      timestamp: new Date().toISOString(),
      workflow: entry.workflow || 'unknown',
      project: entry.project || null,
      phase: entry.phase || 0,
      failureType: entry.failureType || 'unknown',
      subType: entry.subType || null,
      severity: entry.severity || SEVERITY.INFORMATIONAL,
      cause: entry.cause || '',
      context: entry.context || {},
      recoveryAction: entry.recoveryAction || null,
      resolved: entry.resolved !== undefined ? entry.resolved : false,
      retryCount: entry.retryCount || 0,
      // 편향 방지 필드
      condition: entry.condition || null,
      result: entry.result || null,
      lesson: entry.lesson || null,
      verified: entry.verified !== undefined ? entry.verified : false,
      expires: entry.expires || defaultExpires
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
 * @param {string} [filter.project] - 특정 프로젝트 필터 (예: 'RMSSERVER')
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
        if (filter.project && record.project !== filter.project) continue;
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

// ── 성공 기록 ────────────────────────────────────────────────

/**
 * successes.jsonl이 MAX_SUCCESS_FILE_SIZE를 초과하면
 * 최근 SUCCESS_ROTATE_KEEP_LINES행만 남기고 나머지를 삭제한다.
 */
function rotateSuccessIfNeeded() {
  try {
    if (!fs.existsSync(SUCCESS_FILE)) return;
    const stat = fs.statSync(SUCCESS_FILE);
    if (stat.size <= MAX_SUCCESS_FILE_SIZE) return;
    const lines = fs.readFileSync(SUCCESS_FILE, 'utf8').trim().split('\n');
    const kept = lines.slice(-SUCCESS_ROTATE_KEEP_LINES).join('\n') + '\n';
    const tmpFile = SUCCESS_FILE + '.tmp';
    fs.writeFileSync(tmpFile, kept, 'utf8');
    fs.renameSync(tmpFile, SUCCESS_FILE);
  } catch (e) {
    // 로테이션 실패는 워크플로우를 중단하지 않음
  }
}

/**
 * 워크플로우 성공을 successes.jsonl에 기록한다.
 * 실패만 기록하는 비대칭 편향을 방지하기 위한 균형 기록.
 *
 * @param {Object} entry
 * @param {string} entry.workflow - 워크플로우명
 * @param {string} [entry.project] - 프로젝트 식별자 (예: 'RMSSERVER', 'YTAP')
 * @param {string} [entry.condition] - 성공한 조건/상황 (예: '단순 파일 추가만 있는 feature 브랜치')
 * @param {string} [entry.approach] - 사용한 접근 방식 (예: '자동 merge 진행')
 * @param {string} [entry.result] - 결과 요약 (예: '충돌 없이 완료')
 */
function logSuccess(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    rotateSuccessIfNeeded();
    const record = {
      timestamp: new Date().toISOString(),
      workflow: entry.workflow || 'unknown',
      project: entry.project || null,
      condition: entry.condition || null,
      approach: entry.approach || null,
      result: entry.result || 'success'
    };
    fs.appendFileSync(SUCCESS_FILE, JSON.stringify(record) + '\n', 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * successes.jsonl에서 성공 이벤트를 조회한다.
 *
 * @param {Object} [filter]
 * @param {string} [filter.workflow] - 특정 워크플로우 필터
 * @param {string} [filter.project] - 특정 프로젝트 필터 (예: 'RMSSERVER')
 * @param {number} [filter.sinceDays] - 최근 N일 이내
 * @param {number} [filter.limit] - 최대 반환 건수 (기본: 50)
 * @returns {Array} 성공 레코드 배열
 */
function querySuccesses(filter = {}) {
  try {
    if (!fs.existsSync(SUCCESS_FILE)) return [];
    const lines = fs.readFileSync(SUCCESS_FILE, 'utf8').trim().split('\n');
    const sinceDate = filter.sinceDays
      ? new Date(Date.now() - filter.sinceDays * 86400000).toISOString()
      : null;
    const limit = filter.limit || 50;
    const results = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (filter.workflow && record.workflow !== filter.workflow) continue;
        if (filter.project && record.project !== filter.project) continue;
        if (sinceDate && record.timestamp < sinceDate) continue;
        results.push(record);
        if (results.length >= limit) break;
      } catch (_) {}
    }
    return results;
  } catch (e) {
    return [];
  }
}

// ── 만료 처리 ────────────────────────────────────────────────

/**
 * 만료된 실패 레코드를 archived 상태로 전환한다.
 * 삭제하지 않고 failures-archived.jsonl로 이동한다.
 *
 * @returns {{ archived: number, active: number }} 처리 결과
 */
function archiveExpired() {
  try {
    if (!fs.existsSync(FAILURE_FILE)) return { archived: 0, active: 0 };

    const lines = fs.readFileSync(FAILURE_FILE, 'utf8').trim().split('\n');
    const today = new Date().toISOString().slice(0, 10);
    const active = [];
    const expired = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (record.expires && record.expires <= today) {
          expired.push(line);
        } else {
          active.push(line);
        }
      } catch (_) {
        active.push(line);
      }
    }

    if (expired.length === 0) return { archived: 0, active: active.length };

    // 만료된 레코드를 아카이브 파일에 추가
    const archiveFile = path.join(LOG_DIR, 'failures-archived.jsonl');
    fs.appendFileSync(archiveFile, expired.join('\n') + '\n', 'utf8');

    // 원본 파일에서 만료된 레코드 제거 (원자적 쓰기)
    const tmpFile = FAILURE_FILE + '.tmp';
    fs.writeFileSync(tmpFile, active.length > 0 ? active.join('\n') + '\n' : '', 'utf8');
    fs.renameSync(tmpFile, FAILURE_FILE);

    return { archived: expired.length, active: active.length };
  } catch (e) {
    return { archived: 0, active: 0, error: e.message };
  }
}

/**
 * 특정 실패 레코드의 verified 상태를 변경한다.
 *
 * @param {string} failureType
 * @param {string|null} subType
 * @param {boolean} verified - 검증 상태
 * @param {string} [project] - 프로젝트 필터 (지정 시 해당 프로젝트 레코드만 변경)
 * @returns {{ updated: number }} 처리 결과
 */
function setVerified(failureType, subType, verified, project) {
  try {
    if (!fs.existsSync(FAILURE_FILE)) return { updated: 0 };

    const lines = fs.readFileSync(FAILURE_FILE, 'utf8').trim().split('\n');
    const updated = [];
    let count = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        const typeMatch = record.failureType === failureType;
        const subMatch = subType === null ? true : record.subType === subType;
        const projMatch = project ? record.project === project : true;
        if (typeMatch && subMatch && projMatch) {
          record.verified = verified;
          updated.push(JSON.stringify(record));
          count++;
        } else {
          updated.push(line);
        }
      } catch (_) {
        updated.push(line);
      }
    }

    const tmpFile = FAILURE_FILE + '.tmp';
    fs.writeFileSync(tmpFile, updated.length > 0 ? updated.join('\n') + '\n' : '', 'utf8');
    fs.renameSync(tmpFile, FAILURE_FILE);

    return { updated: count };
  } catch (e) {
    return { updated: 0, error: e.message };
  }
}

module.exports = {
  logFailure, queryFailures, FAILURE_TYPES, SEVERITY, FAILURE_FILE,
  logSuccess, querySuccesses, SUCCESS_FILE,
  archiveExpired, setVerified
};
