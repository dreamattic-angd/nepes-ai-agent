// install-verify.js
// install.bat 배포 후 검증 스크립트
// SOURCE(.claude)의 서브디렉토리가 TARGET(~/.claude)에 모두 존재하는지 확인한다.
// 누락 발견 시 failure-logger에 자동 기록한다.

const fs = require('fs');
const path = require('path');

const SOURCE = process.argv[2];
const TARGET = process.argv[3];

if (!SOURCE || !TARGET) {
  console.error('[install-verify] 인수 부족: SOURCE TARGET 경로 필요');
  process.exit(1);
}

// SOURCE의 서브디렉토리 목록 수집
let sourceDirs;
try {
  sourceDirs = fs.readdirSync(SOURCE, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
} catch (e) {
  console.error('[install-verify] SOURCE 읽기 실패:', e.message);
  process.exit(1);
}

const missing = [];
const ok = [];

for (const dir of sourceDirs) {
  const targetDir = path.join(TARGET, dir);
  if (fs.existsSync(targetDir)) {
    ok.push(dir);
  } else {
    missing.push(dir);
  }
}

if (missing.length === 0) {
  console.log('[install-verify] PASS — 모든 디렉토리 배포 확인 (' + ok.length + '개)');
  process.exit(0);
}

// 누락 디렉토리 발견 → failure-logger 기록
console.error('[install-verify] FAIL — 누락된 디렉토리: ' + missing.join(', '));

try {
  const fl = require(path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'hooks', 'failure-logger.js'));
  fl.logFailure({
    workflow: 'install',
    phase: 0,
    failureType: 'script_error',
    subType: 'deploy_missing_directory',
    severity: 'high',
    cause: '배포 후 디렉토리 누락: ' + missing.join(', '),
    condition: 'install.bat 실행 후 SOURCE 디렉토리가 TARGET에 없을 때',
    lesson: 'robocopy 명령 또는 /EXCLUDE 설정을 확인한다. xcopy /EXCLUDE는 CRLF 파일을 기대하므로 robocopy /XF /XD 인라인 파라미터 사용 권장',
    context: { source: SOURCE, target: TARGET, missing },
    recoveryAction: 'install.bat 재실행 또는 robocopy 명령 직접 확인',
    resolved: false,
    retryCount: 0,
    project: 'NEPES_AI_AGENTS'
  });
  console.error('[install-verify] 실패 기록 완료 (failure-logger)');
} catch (e) {
  console.error('[install-verify] failure-logger 기록 실패:', e.message);
}

process.exit(1);
