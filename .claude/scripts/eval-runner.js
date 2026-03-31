// eval-runner.js
// Eval 골든 셋 러너 — 하네스 로직을 단위 테스트 형식으로 자동 채점
// 사용: node eval-runner.js

const fs = require('fs');
const path = require('path');

const EVALS_DIR = path.resolve(__dirname, '..', 'evals');

// ── 로직 함수 (Phase 에이전트 규칙 미러링) ─────────────────

/**
 * 버전 계산 (Phase 3 규칙)
 * feat → MINOR +1, PATCH = 0
 * fix/improve/docs/refactor/chore → PATCH +1
 */
function calcVersion(currentVersion, commitType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  if (commitType === 'feat') {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * MAJOR 버전 계산 (Phase 3 — main 머지 시)
 * MAJOR +1, MINOR = 0, PATCH = 0
 */
function calcMajorVersion(currentVersion) {
  const [major] = currentVersion.split('.').map(Number);
  return `${major + 1}.0.0`;
}

/**
 * 차단 브랜치 검증 (Phase 1 규칙)
 */
function isBranchBlocked(branch, blockedBranches) {
  return blockedBranches.includes(branch);
}

/**
 * 코드 리뷰 판정 (Phase 3 + review-full.md 규칙)
 * REJECT: Critical ≥ 1
 * PASS: Critical = 0 AND Warning ≤ 3
 * REVIEW_NEEDED: Critical = 0 AND Warning ≥ 4
 */
function judgeReview(criticalCount, warningCount) {
  if (criticalCount >= 1) return 'REJECT';
  if (warningCount >= 4) return 'REVIEW_NEEDED';
  return 'PASS';
}

// ── 타겟 디스패치 ──────────────────────────────────────────

// 허용 커밋 타입 (validateCommitMsg와 TARGET_HANDLERS에서 공유)
const VALID_COMMIT_TYPES = ['feat', 'fix', 'improve', 'refactor', 'docs', 'chore', 'merge'];

/**
 * 브랜치명 형식 검증
 * prefix: feature/ 또는 bugfix/
 * 설명부: 소문자, 숫자, 하이픈만 허용 (양 끝 하이픈 불가)
 */
function validateBranchName(branchName) {
  const errors = [];
  if (!branchName) {
    errors.push('브랜치명이 비어있습니다.');
    return { valid: false, errors };
  }
  const match = branchName.match(/^(feature|bugfix)\/(.+)$/);
  if (!match) {
    errors.push(`prefix가 feature/ 또는 bugfix/ 이어야 합니다. 현재: "${branchName}"`);
    return { valid: false, errors };
  }
  const prefix = match[1];
  const description = match[2];
  // 단일 문자(예: feature/a)는 허용 — 중간 그룹이 optional이므로 통과
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(description)) {
    errors.push(`설명부는 소문자, 숫자, 하이픈만 허용되며 양 끝에 하이픈을 쓸 수 없습니다. 현재: "${description}"`);
  }
  const valid = errors.length === 0;
  return { valid, prefix, description, errors };
}

/**
 * 커밋 메시지 형식 검증
 * 형식: {type}: {description} [(#ITSM-숫자)]
 * type: feat|fix|improve|refactor|docs|chore|merge
 */
function validateCommitMsg(message) {
  const errors = [];
  if (!message) {
    errors.push('커밋 메시지가 비어있습니다.');
    return { valid: false, errors };
  }
  const match = message.match(/^([a-z]+):\s+(.+)$/);
  if (!match) {
    errors.push(`형식이 "{type}: {description}" 이어야 합니다. 현재: "${message}"`);
    return { valid: false, errors };
  }
  const type = match[1];
  const trimmedDescription = match[2].trim();
  if (!VALID_COMMIT_TYPES.includes(type)) {
    errors.push(`type이 유효하지 않습니다. 허용: ${VALID_COMMIT_TYPES.join('|')}, 현재: "${type}"`);
  }
  if (!trimmedDescription) {
    errors.push('description이 비어있습니다.');
  }
  // ITSM 번호 포함 시 형식 검증 (숫자만 허용, trim 후 검사)
  const itsmMatch = trimmedDescription.match(/\(#ITSM-(\d+)\)$/);
  if (trimmedDescription.includes('#ITSM') && !itsmMatch) {
    errors.push('ITSM 번호 형식이 올바르지 않습니다. 올바른 형식: (#ITSM-숫자)');
  }
  const valid = errors.length === 0;
  return { valid, type, description: trimmedDescription, errors };
}

const TARGET_HANDLERS = {
  'version-calc': (input) => {
    const newVersion = calcVersion(input.currentVersion, input.commitType);
    return { newVersion };
  },

  'version-calc-major': (input) => {
    const newVersion = calcMajorVersion(input.currentVersion);
    return { newVersion };
  },

  'branch-validation': (input) => {
    const shouldBlock = isBranchBlocked(input.branch, input.blockedBranches);
    return { shouldBlock };
  },

  'review-judgment': (input) => {
    const judgment = judgeReview(input.criticalCount, input.warningCount);
    return { judgment };
  },

  'branch-name-format': (input) => {
    return validateBranchName(input.branchName);
  },

  'commit-msg-format': (input) => {
    return validateCommitMsg(input.message);
  },
};

// ── 케이스 탐색 ────────────────────────────────────────────

function discoverCases() {
  const cases = [];
  if (!fs.existsSync(EVALS_DIR)) return cases;

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          cases.push({ path: fullPath, data });
        } catch (e) {
          cases.push({ path: fullPath, error: `파싱 실패: ${e.message}` });
        }
      }
    }
  }

  scanDir(EVALS_DIR);
  return cases;
}

// ── 케이스 실행 ────────────────────────────────────────────

function runCase(evalCase) {
  const { id, target, input, expected } = evalCase;

  if (!TARGET_HANDLERS[target]) {
    return { id, pass: false, error: `알 수 없는 target: ${target}` };
  }

  try {
    const actual = TARGET_HANDLERS[target](input);

    // expected의 모든 키가 actual과 일치하는지 검증
    for (const key of Object.keys(expected)) {
      if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
        return {
          id, pass: false,
          expected: expected[key],
          actual: actual[key],
          field: key
        };
      }
    }

    return { id, pass: true };
  } catch (e) {
    return { id, pass: false, error: e.message };
  }
}

// ── --validate 단일 검증 모드 ──────────────────────────────

/**
 * --expected JSON 비교 헬퍼
 * 모든 키가 일치하면 pass 출력 후 exit(0), 불일치하면 fail 출력 후 exit(1)
 * @never 항상 process.exit()로 종료 — 반환하지 않음
 */
function compareWithExpected(target, actual, expectStr) {
  let expected;
  try {
    expected = JSON.parse(expectStr);
  } catch (e) {
    console.error(`[VALIDATE ERROR] --expected JSON 파싱 실패: ${e.message}`);
    process.exit(1);
  }

  const mismatches = [];
  for (const key of Object.keys(expected)) {
    const aStr = JSON.stringify(actual[key]);
    const eStr = JSON.stringify(expected[key]);
    if (aStr !== eStr) {
      mismatches.push(`  ${key}: 실제=${aStr}, 기대=${eStr}`);
    }
  }

  if (mismatches.length === 0) {
    console.log(`[VALIDATE PASS] ${target}: ${JSON.stringify(actual)}`);
    process.exit(0);
  } else {
    console.log(`[VALIDATE FAIL] ${target}:`);
    mismatches.forEach(m => console.log(m));
    process.exit(1);
  }
}

/**
 * --validate <target> --input '<json>' [--expected '<json>'] 모드
 * exit code 0: pass, 1: fail
 */
function validateMode(args) {
  const targetIdx = args.indexOf('--validate');
  const inputIdx  = args.indexOf('--input');
  const expectIdx = args.indexOf('--expected');

  const target   = targetIdx >= 0 ? args[targetIdx + 1] : null;
  const inputStr = inputIdx  >= 0 ? args[inputIdx  + 1] : null;
  const expectStr = expectIdx >= 0 ? args[expectIdx + 1] : null;

  if (!target || !inputStr) {
    console.error('[VALIDATE ERROR] --validate <target> --input <json> 형식으로 입력하세요.');
    process.exit(1);
  }

  if (!TARGET_HANDLERS[target]) {
    console.error(`[VALIDATE ERROR] 알 수 없는 target: ${target}`);
    console.error(`사용 가능한 target: ${Object.keys(TARGET_HANDLERS).join(', ')}`);
    process.exit(1);
  }

  let parsedInput;
  try {
    parsedInput = JSON.parse(inputStr);
  } catch (e) {
    console.error(`[VALIDATE ERROR] --input JSON 파싱 실패: ${e.message}`);
    process.exit(1);
  }

  let actual;
  try {
    actual = TARGET_HANDLERS[target](parsedInput);
  } catch (e) {
    console.error(`[VALIDATE ERROR] 핸들러 실행 실패: ${e.message}`);
    process.exit(1);
  }

  // --expected 지정 시: 헬퍼로 키별 비교 (내부에서 process.exit — 이후 코드 미실행)
  if (expectStr) {
    compareWithExpected(target, actual, expectStr);
  }

  // --expected 미지정 시: valid 필드 존재 여부 기준
  if (typeof actual.valid !== 'undefined') {
    if (actual.valid) {
      console.log(`[VALIDATE PASS] ${target}: ${JSON.stringify(actual)}`);
      process.exit(0);
    } else {
      console.log(`[VALIDATE FAIL] ${target}: ${JSON.stringify(actual)}`);
      if (actual.errors && actual.errors.length > 0) {
        actual.errors.forEach(e => console.log(`  → ${e}`));
      }
      process.exit(1);
    }
  }

  // valid 필드 없는 경우 결과 출력 후 pass
  console.log(`[VALIDATE PASS] ${target}: ${JSON.stringify(actual)}`);
  process.exit(0);
}

// ── 메인 ───────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--validate')) {
    validateMode(args);
    return;
  }

  const cases = discoverCases();

  if (cases.length === 0) {
    console.log('Eval 케이스를 찾을 수 없습니다.');
    console.log(`탐색 경로: ${EVALS_DIR}`);
    process.exit(1);
  }

  console.log('\nEval 결과');
  console.log('════════════════════════════════════════');

  let passCount = 0;
  let failCount = 0;

  for (const c of cases) {
    if (c.error) {
      console.log(` [ERR]  ${path.basename(c.path)}: ${c.error}`);
      failCount++;
      continue;
    }

    const result = runCase(c.data);

    if (result.pass) {
      console.log(` [PASS] ${result.id}`);
      passCount++;
    } else if (result.error) {
      console.log(` [FAIL] ${result.id}: ${result.error}`);
      failCount++;
    } else {
      console.log(` [FAIL] ${result.id}: ${result.field} = ${JSON.stringify(result.actual)} (기대: ${JSON.stringify(result.expected)})`);
      failCount++;
    }
  }

  console.log('════════════════════════════════════════');
  console.log(` 종합: ${passCount}/${passCount + failCount} PASS`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
