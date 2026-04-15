#!/usr/bin/env node
/**
 * eval-runner.js
 * Matrix runner: judge × cases
 *
 * Usage:
 *   node evals/eval-runner.js
 *
 * For each judge in judge/thresholds.json × each case in judge/cases/*.json:
 *   Verifies that (score >= pass_threshold) matches expected_pass.
 *
 * To add a new judge: add one line to judge/thresholds.json.
 * To add a new score case: add one file to judge/cases/.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(process.argv[1]);
const THRESHOLDS_FILE = path.join(ROOT, 'judge', 'thresholds.json');
const CASES_DIR = path.join(ROOT, 'judge', 'cases');

function loadThresholds() {
  return JSON.parse(fs.readFileSync(THRESHOLDS_FILE, 'utf8'));
}

function loadCases() {
  return fs
    .readdirSync(CASES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), 'utf8'));
      return { file: f, ...data };
    });
}

function evaluate(score, threshold) {
  const pass = score >= threshold;
  return {
    pass,
    action: pass ? 'AUTO_APPROVED' : 'NEEDS_REVIEW',
  };
}

function main() {
  const thresholds = loadThresholds();
  const cases = loadCases();

  let passed = 0;
  let failed = 0;

  for (const [judge, { pass_threshold }] of Object.entries(thresholds)) {
    for (const testCase of cases) {
      const { file, description, input, expected_pass } = testCase;
      const { score } = input;
      const result = evaluate(score, pass_threshold);

      const ok = result.pass === expected_pass;
      const label = `[${judge}] ${file}`;

      if (ok) {
        console.log(`✅ PASS  ${label}`);
        passed++;
      } else {
        console.log(`❌ FAIL  ${label}`);
        console.log(`         ${description}`);
        console.log(`         threshold=${pass_threshold}, score=${score} → pass=${result.pass}, expected_pass=${expected_pass}`);
        failed++;
      }
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed (total ${passed + failed})`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
