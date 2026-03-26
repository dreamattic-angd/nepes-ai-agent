// failure-registry.js
// failures.jsonl에서 반복 실패 패턴을 감지하고 컨텍스트로 주입하는 유틸리티
// 워크플로우 시작 전에 호출하여 동일 실패 재발을 방지한다

const { queryFailures } = require('./failure-logger.js');

/**
 * 반복 실패 패턴을 조회한다.
 * (failureType, subType) 조합이 2회 이상 발생한 패턴을 반환한다.
 *
 * @param {Object} [options]
 * @param {string} [options.workflow] - 특정 워크플로우 필터
 * @param {number} [options.sinceDays] - 최근 N일 이내 (기본: 7)
 * @returns {Array} 반복 패턴 배열
 */
function getRecurringPatterns(options = {}) {
  const sinceDays = options.sinceDays || 7;
  const failures = queryFailures({
    workflow: options.workflow,
    sinceDays,
    limit: 500
  });

  // (failureType, subType) 기준으로 그룹핑
  const groups = {};
  for (const f of failures) {
    const key = f.subType ? `${f.failureType}/${f.subType}` : f.failureType;
    if (!groups[key]) {
      groups[key] = { failureType: f.failureType, subType: f.subType, count: 0, lastSeen: f.timestamp, causes: [] };
    }
    groups[key].count++;
    if (f.timestamp > groups[key].lastSeen) {
      groups[key].lastSeen = f.timestamp;
    }
    // 원인 수집 (중복 제거, 최대 3개)
    if (groups[key].causes.length < 3 && !groups[key].causes.includes(f.cause)) {
      groups[key].causes.push(f.cause);
    }
  }

  // 2회 이상 발생한 패턴만 반환 (빈도 내림차순)
  return Object.values(groups)
    .filter(g => g.count >= 2)
    .sort((a, b) => b.count - a.count)
    .map(g => ({
      failureType: g.failureType,
      subType: g.subType,
      count: g.count,
      lastSeen: g.lastSeen,
      typicalCause: g.causes[0] || '',
      suggestedPrevention: getSuggestion(g.failureType, g.subType)
    }));
}

/**
 * 실패 유형별 예방 제안을 반환한다.
 */
function getSuggestion(failureType, subType) {
  const suggestions = {
    'git_error/branch_exists': '브랜치 생성 전 기존 브랜치 존재 여부를 확인하세요.',
    'git_error/tag_exists': '태그 생성 전 기존 태그 존재 여부를 확인하세요.',
    'git_error/nothing_to_commit': 'Phase 1 변경사항 분석이 정확한지 재확인하세요.',
    'git_error/merge_conflict': '머지 전 develop 브랜치와의 차이를 사전 확인하세요.',
    'io_error/version_read': 'version.txt 또는 VERSION 파일 경로와 권한을 확인하세요.',
    'io_error/version_write': '버전 파일 쓰기 권한을 확인하세요.',
    'script_error': '스크립트 파일 존재 여부와 Node.js 호환성을 확인하세요.',
    'hook_block': '차단된 명령의 대안적 접근 방식을 사용하세요.',
    'validation_fail': '이전 Phase 출력 데이터의 완전성을 확인하세요.',
    'network_error': '네트워크 연결 상태를 확인하세요.'
  };

  const key = subType ? `${failureType}/${subType}` : failureType;
  return suggestions[key] || suggestions[failureType] || '실패 원인을 확인하고 조치하세요.';
}

/**
 * 반복 패턴을 워크플로우 컨텍스트 주입용 텍스트로 변환한다.
 *
 * @param {Array} patterns - getRecurringPatterns() 반환값
 * @returns {string} 주입용 텍스트 (패턴 없으면 빈 문자열)
 */
function formatContextBlock(patterns) {
  if (!patterns || patterns.length === 0) return '';

  const lines = ['⚠️ 반복 실패 패턴 감지 (최근 7일)'];
  for (const p of patterns) {
    const key = p.subType ? `${p.failureType}/${p.subType}` : p.failureType;
    lines.push(`- ${key}: ${p.count}회 발생. ${p.suggestedPrevention}`);
  }
  return lines.join('\n');
}

/**
 * 특정 워크플로우의 반복 패턴 컨텍스트를 반환한다.
 * 편의 함수: getRecurringPatterns + formatContextBlock 조합.
 *
 * @param {string} workflowName - 워크플로우명
 * @returns {string} 컨텍스트 텍스트 (패턴 없으면 빈 문자열)
 */
function getContextForWorkflow(workflowName) {
  const patterns = getRecurringPatterns({ workflow: workflowName });
  return formatContextBlock(patterns);
}

module.exports = { getRecurringPatterns, formatContextBlock, getContextForWorkflow };
