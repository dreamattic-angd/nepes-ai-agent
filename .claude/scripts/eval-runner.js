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

// ── 타겟 디스패치 ──────────────────────────────────────────

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
  }
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

// ── 메인 ───────────────────────────────────────────────────

function main() {
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
