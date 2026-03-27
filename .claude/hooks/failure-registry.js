// failure-registry.js
// failures.jsonl에서 반복 실패 패턴을 감지하고 컨텍스트로 주입하는 유틸리티
// 워크플로우 시작 전에 호출하여 동일 실패 재발을 방지한다
//
// 확증 편향 방지 설계:
// 1. 조건 명시 — 무조건 금지가 아니라 조건부 판단
// 2. 성공 사례 병행 주입 — 실패만 주입하는 비대칭 해소
// 3. verified 상태 구분 — 가설과 검증된 규칙 구분
// 4. expires 만료 처리 — 환경 변화 반영

const fs = require('fs');
const {
  queryFailures, FAILURE_FILE,
  querySuccesses, archiveExpired
} = require('./failure-logger.js');

/**
 * 반복 실패 패턴을 조회한다.
 * (failureType, subType) 조합이 2회 이상 발생한 패턴을 반환한다.
 * 만료된(expires 지남) 레코드는 자동 제외한다.
 *
 * @param {Object} [options]
 * @param {string} [options.workflow] - 특정 워크플로우 필터
 * @param {string} [options.project] - 특정 프로젝트 필터 (예: 'RMSSERVER')
 * @param {number} [options.sinceDays] - 최근 N일 이내 (기본: 7)
 * @returns {Array} 반복 패턴 배열
 */
function getRecurringPatterns(options = {}) {
  const sinceDays = options.sinceDays || 7;
  const today = new Date().toISOString().slice(0, 10);
  const failures = queryFailures({
    workflow: options.workflow,
    project: options.project,
    sinceDays,
    limit: 500
  });

  // (failureType, subType) 기준으로 그룹핑
  const groups = {};
  for (const f of failures) {
    // 만료된 레코드는 제외
    if (f.expires && f.expires <= today) continue;

    const key = f.subType ? `${f.failureType}/${f.subType}` : f.failureType;
    if (!groups[key]) {
      groups[key] = {
        failureType: f.failureType,
        subType: f.subType,
        count: 0,
        lastSeen: f.timestamp,
        causes: [],
        conditions: [],
        lessons: [],
        verifiedCount: 0,
        unverifiedCount: 0
      };
    }
    groups[key].count++;
    if (f.timestamp > groups[key].lastSeen) {
      groups[key].lastSeen = f.timestamp;
    }
    // 원인 수집 (중복 제거, 최대 3개)
    if (groups[key].causes.length < 3 && !groups[key].causes.includes(f.cause)) {
      groups[key].causes.push(f.cause);
    }
    // 조건 수집 (중복 제거, 최대 2개)
    if (f.condition && groups[key].conditions.length < 2 && !groups[key].conditions.includes(f.condition)) {
      groups[key].conditions.push(f.condition);
    }
    // 교훈 수집 (중복 제거, 최대 2개)
    if (f.lesson && groups[key].lessons.length < 2 && !groups[key].lessons.includes(f.lesson)) {
      groups[key].lessons.push(f.lesson);
    }
    // 검증 상태 카운트
    if (f.verified) {
      groups[key].verifiedCount++;
    } else {
      groups[key].unverifiedCount++;
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
      conditions: g.conditions,
      lessons: g.lessons,
      verifiedCount: g.verifiedCount,
      unverifiedCount: g.unverifiedCount,
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
 * 편향 방지: verified 여부를 명시하고, 조건을 포함하며,
 * 관련 성공 사례도 함께 제공한다.
 *
 * @param {Array} patterns - getRecurringPatterns() 반환값
 * @param {Object} [options]
 * @param {string} [options.workflow] - 성공 사례 조회용 워크플로우명
 * @param {string} [options.project] - 성공 사례 조회용 프로젝트명
 * @returns {string} 주입용 텍스트 (패턴 없으면 빈 문자열)
 */
function formatContextBlock(patterns, options = {}) {
  if (!patterns || patterns.length === 0) return '';

  // 먼저 만료된 레코드를 아카이브 처리 (best-effort)
  try { archiveExpired(); } catch (_) {}

  const lines = [
    '<external_data source="failure-history">',
    '이전 실패 패턴 참고 (검토 대기 가설 포함)',
    '아래는 과거 특정 조건에서의 경험이다. 현재 상황이 해당 조건에 부합할 때만 적용하고, 조건이 다르면 독립적으로 판단한다.',
    ''
  ];

  // 검증된 패턴과 미검증 가설 분리
  const verified = patterns.filter(p => p.verifiedCount > 0);
  const unverified = patterns.filter(p => p.verifiedCount === 0);

  if (verified.length > 0) {
    lines.push('[검증된 규칙]');
    for (const p of verified) {
      const key = p.subType ? `${p.failureType}/${p.subType}` : p.failureType;
      const condText = p.conditions.length > 0 ? ` 조건: ${p.conditions[0]}` : '';
      const lessonText = p.lessons.length > 0 ? ` → ${p.lessons[0]}` : ` → ${p.suggestedPrevention}`;
      lines.push(`- ${key} (${p.count}회).${condText}${lessonText}`);
    }
    lines.push('');
  }

  if (unverified.length > 0) {
    lines.push('[미검증 가설 — 참고만, 맹신 금지]');
    for (const p of unverified) {
      const key = p.subType ? `${p.failureType}/${p.subType}` : p.failureType;
      const condText = p.conditions.length > 0 ? ` 조건: ${p.conditions[0]}` : '';
      const lessonText = p.lessons.length > 0 ? ` → ${p.lessons[0]}` : ` → ${p.suggestedPrevention}`;
      lines.push(`- ${key} (${p.count}회, 미검증).${condText}${lessonText}`);
    }
    lines.push('');
  }

  // 관련 성공 사례 병행 주입 (비대칭 편향 방지)
  if (options.workflow) {
    const successes = querySuccesses({ workflow: options.workflow, project: options.project, sinceDays: 7, limit: 3 });
    if (successes.length > 0) {
      lines.push('[최근 성공 사례 — 균형 참고]');
      for (const s of successes) {
        const condText = s.condition ? ` 조건: ${s.condition}` : '';
        const appText = s.approach ? ` 방식: ${s.approach}` : '';
        lines.push(`- ${s.result || 'success'}.${condText}${appText}`);
      }
      lines.push('');
    }
  }

  lines.push('</external_data>');
  return lines.join('\n');
}

/**
 * 특정 워크플로우의 반복 패턴 컨텍스트를 반환한다.
 * 편의 함수: getRecurringPatterns + formatContextBlock 조합.
 * 성공 사례도 함께 주입한다.
 *
 * @param {string} workflowName - 워크플로우명
 * @param {string} [projectName] - 프로젝트명 (예: 'RMSSERVER')
 * @returns {string} 컨텍스트 텍스트 (패턴 없으면 빈 문자열)
 */
function getContextForWorkflow(workflowName, projectName) {
  const patterns = getRecurringPatterns({ workflow: workflowName, project: projectName });
  return formatContextBlock(patterns, { workflow: workflowName, project: projectName });
}

// ── 증류 (Distillation) ─────────────────────────────────────

/**
 * 증류 후보 패턴을 조회한다.
 * 편향 방지: verified: true인 레코드가 포함된 패턴만 후보로 인정한다.
 * 기본 임계값: 최근 30일 내 3회 이상 반복 + 1건 이상 검증됨.
 *
 * @param {Object} [options]
 * @param {number} [options.minCount] - 최소 반복 횟수 (기본: 3)
 * @param {number} [options.sinceDays] - 조회 기간 (기본: 30)
 * @param {string} [options.project] - 특정 프로젝트 필터
 * @param {boolean} [options.includeUnverified] - 미검증 항목도 포함 (기본: false)
 * @returns {Array} 증류 후보 패턴 배열
 */
function getDistillCandidates(options = {}) {
  const minCount = options.minCount || 3;
  const sinceDays = options.sinceDays || 30;
  const includeUnverified = options.includeUnverified || false;
  const patterns = getRecurringPatterns({ sinceDays, project: options.project });
  return patterns.filter(p => {
    if (p.count < minCount) return false;
    // 편향 방지: 미검증 항목은 기본적으로 증류 대상에서 제외
    if (!includeUnverified && p.verifiedCount === 0) return false;
    return true;
  });
}

/**
 * 미검증(unverified) 패턴 목록을 반환한다.
 * review-claudemd 또는 별도 검토 커맨드에서 사용자에게 보여줄 때 사용.
 *
 * @param {Object} [options]
 * @param {number} [options.sinceDays] - 조회 기간 (기본: 30)
 * @param {string} [options.project] - 특정 프로젝트 필터
 * @returns {Array} 미검증 패턴 배열
 */
function getUnverifiedPatterns(options = {}) {
  const sinceDays = options.sinceDays || 30;
  const patterns = getRecurringPatterns({ sinceDays, project: options.project });
  return patterns.filter(p => p.unverifiedCount > 0 && p.verifiedCount === 0);
}

/**
 * 증류 완료된 패턴의 원본 레코드를 failures.jsonl에서 제거한다.
 * 원자적 쓰기: 임시 파일 → 원본 교체.
 *
 * @param {string} failureType - 제거할 실패 유형
 * @param {string|null} subType - 제거할 하위 유형 (null이면 failureType만으로 매칭)
 * @param {string} [project] - 프로젝트 필터 (지정 시 해당 프로젝트 레코드만 제거)
 * @returns {{ removed: number, kept: number }} 처리 결과
 */
function purgeDistilled(failureType, subType, project) {
  try {
    if (!fs.existsSync(FAILURE_FILE)) return { removed: 0, kept: 0 };

    const lines = fs.readFileSync(FAILURE_FILE, 'utf8').trim().split('\n');
    const kept = [];
    let removed = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        const typeMatch = record.failureType === failureType;
        const subMatch = subType === null ? true : record.subType === subType;
        const projMatch = project ? record.project === project : true;
        if (typeMatch && subMatch && projMatch) {
          removed++;
        } else {
          kept.push(line);
        }
      } catch (_) {
        kept.push(line); // 파싱 실패 행은 유지
      }
    }

    // 원자적 쓰기
    const tmpFile = FAILURE_FILE + '.tmp';
    fs.writeFileSync(tmpFile, kept.length > 0 ? kept.join('\n') + '\n' : '', 'utf8');
    fs.renameSync(tmpFile, FAILURE_FILE);

    return { removed, kept: kept.length };
  } catch (e) {
    return { removed: 0, kept: 0, error: e.message };
  }
}

/**
 * 증류 후보 패턴을 CLAUDE.md에 삽입할 규칙 텍스트로 변환한다.
 * 편향 방지: 조건을 포함하여 무조건 금지가 아닌 조건부 규칙으로 생성한다.
 *
 * @param {Array} candidates - getDistillCandidates() 반환값
 * @returns {string} CLAUDE.md에 추가할 마크다운 텍스트
 */
function formatDistillRules(candidates) {
  if (!candidates || candidates.length === 0) return '';

  const lines = [];
  for (const c of candidates) {
    const key = c.subType ? `${c.failureType}/${c.subType}` : c.failureType;
    const cause = c.typicalCause ? ` (주요 원인: ${c.typicalCause})` : '';
    const condition = c.conditions.length > 0 ? ` [조건: ${c.conditions[0]}]` : '';
    lines.push(`- **${key}** (${c.count}회, 검증됨): ${c.suggestedPrevention}${cause}${condition}`);
  }
  return lines.join('\n');
}

module.exports = {
  getRecurringPatterns, formatContextBlock, getContextForWorkflow,
  getDistillCandidates, getUnverifiedPatterns, purgeDistilled, formatDistillRules
};
