// workflow-stats.js
// 워크플로우 실행 통계 집계 스크립트
// 사용: node workflow-stats.js [--days 30] [--json]

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'logs');
const WORKFLOW_LOG = path.join(LOG_DIR, 'workflow-runs.jsonl');
const FAILURE_LOG = path.join(LOG_DIR, 'failures.jsonl');

// ── 인자 파싱 ──────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let days = 30;
  let jsonMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1], 10) || 30;
      i++;
    }
    if (args[i] === '--json') jsonMode = true;
  }

  return { days, jsonMode };
}

// ── JSONL 읽기 ─────────────────────────────────────────────

function readJsonl(filePath, sinceISO) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
    const records = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (sinceISO && record.timestamp < sinceISO) continue;
        records.push(record);
      } catch (_) {
        // 손상된 행은 건너뜀
      }
    }
    return records;
  } catch (e) {
    return [];
  }
}

// ── 워크플로우 통계 계산 ───────────────────────────────────

function calculateStats(workflowRecords) {
  const stats = {};

  for (const r of workflowRecords) {
    const wf = r.workflow || 'unknown';
    if (!stats[wf]) {
      stats[wf] = { totalRuns: 0, success: 0, failure: 0, aborted: 0, durations: [] };
    }

    // 성공 판정: result가 있으면 사용, 없으면 event 기반 (하위 호환)
    if (r.result === 'success' || (!r.result && r.event === 'workflow_complete')) {
      // workflow_complete만 1회의 완료된 실행으로 카운트
      if (r.event === 'workflow_complete') {
        stats[wf].totalRuns++;
        stats[wf].success++;
        if (r.durationMs) stats[wf].durations.push(r.durationMs);
      }
    } else if (r.result === 'failure') {
      // phase1_failed 등 워크플로우 종료 실패
      if (r.event && r.event.includes('failed')) {
        stats[wf].totalRuns++;
        stats[wf].failure++;
      }
    } else if (r.result === 'aborted') {
      stats[wf].totalRuns++;
      stats[wf].aborted++;
    }
  }

  // 통계 계산
  for (const wf of Object.keys(stats)) {
    const s = stats[wf];
    s.successRate = s.totalRuns > 0 ? ((s.success / s.totalRuns) * 100).toFixed(1) : '0.0';
    s.avgDurationMs = s.durations.length > 0
      ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)
      : null;
  }

  return stats;
}

// ── 실패 유형 집계 ─────────────────────────────────────────

function aggregateFailures(failureRecords) {
  const failures = {};

  for (const r of failureRecords) {
    const wf = r.workflow || 'unknown';
    if (!failures[wf]) failures[wf] = {};
    const key = r.subType ? `${r.failureType}/${r.subType}` : r.failureType;
    failures[wf][key] = (failures[wf][key] || 0) + 1;
  }

  return failures;
}

// ── 시간 포맷 ──────────────────────────────────────────────

function formatDuration(ms) {
  if (ms === null || ms === undefined) return '-';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hr}h ${remMin}m`;
}

// ── 텍스트 테이블 출력 ─────────────────────────────────────

function printTable(stats, failures, days) {
  console.log(`\n워크플로우 실행 통계 (최근 ${days}일)`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log(' Workflow        | Runs | OK | Fail | Abort | Rate   | Avg Time');
  console.log('─────────────────────────────────────────────────────────────────');

  const workflows = Object.keys(stats).filter(wf => stats[wf].totalRuns > 0).sort();
  if (workflows.length === 0) {
    console.log(' (기록 없음)');
  } else {
    for (const wf of workflows) {
      const s = stats[wf];
      const name = wf.padEnd(15);
      const runs = String(s.totalRuns).padStart(4);
      const ok = String(s.success).padStart(2);
      const fail = String(s.failure).padStart(4);
      const abort = String(s.aborted).padStart(5);
      const rate = (s.successRate + '%').padStart(6);
      const avg = formatDuration(s.avgDurationMs).padStart(8);
      console.log(` ${name} | ${runs} | ${ok} | ${fail} | ${abort} | ${rate} | ${avg}`);
    }
  }

  console.log('════════════════════════════════════════════════════════════════');

  // 실패 유형 출력
  const failWorkflows = Object.keys(failures).sort();
  if (failWorkflows.length > 0) {
    console.log('\n상위 실패 유형:');
    for (const wf of failWorkflows) {
      const types = Object.entries(failures[wf])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => `${type} (${count})`)
        .join(', ');
      console.log(` ${wf}: ${types}`);
    }
  }

  console.log('');
}

// ── 메인 ───────────────────────────────────────────────────

function main() {
  const { days, jsonMode } = parseArgs();
  const sinceISO = new Date(Date.now() - days * 86400000).toISOString();

  const workflowRecords = readJsonl(WORKFLOW_LOG, sinceISO);
  const failureRecords = readJsonl(FAILURE_LOG, sinceISO);

  const stats = calculateStats(workflowRecords);
  const failures = aggregateFailures(failureRecords);

  if (jsonMode) {
    console.log(JSON.stringify({
      dateRange: { days, since: sinceISO },
      stats,
      failures
    }, null, 2));
  } else {
    printTable(stats, failures, days);
  }
}

main();
