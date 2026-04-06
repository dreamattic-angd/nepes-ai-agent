// check-dangerous-cmd.js
// PreToolUse(Bash) Hook: 파괴적 시스템 명령어 차단

const path = require('path');
const { readStdinJson } = require(path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'hooks', 'stdin-json-reader.js'));

readStdinJson((err, input) => {
  if (err) {
    console.error('[check-dangerous-cmd] 입력 파싱 실패 — 검증을 건너뜁니다:', err.message);
    process.exit(0);
    return;
  }
  const cmd = (input.tool_input && input.tool_input.command || '');

  // 차단 패턴 목록
  const dangerousPatterns = [
    // Linux/Unix 파괴적 명령 — rm -rf 광범위 삭제 차단
    // (?:-[a-z]+\s+){0,2} : 최대 2개의 분리된 플래그 허용 (rm -r -f / 등 분리 형태 탐지)
    // ReDoS 방지: 중첩 정량자 없음, 각 이터레이션은 최소 3문자 소비
    { pattern: /\brm\s+(?:-[a-z]+\s+){0,2}-[a-z]*[rf][a-z]*\s+\/(\s|$)/i, desc: 'rm -rf / (루트 삭제)' },
    { pattern: /\brm\s+(?:-[a-z]+\s+){0,2}-[a-z]*[rf][a-z]*\s+\.\.?(\/|\s|$)/i, desc: 'rm -rf ./ 또는 ../ (현재/상위 디렉토리 삭제)' },
    { pattern: /\brm\s+(?:-[a-z]+\s+){0,2}-[a-z]*[rf][a-z]*\s+~(\/|\s|$)/i, desc: 'rm -rf ~ (홈 디렉토리 삭제)' },
    { pattern: /\brm\s+(?:-[a-z]+\s+){0,2}-[a-z]*[rf][a-z]*\s+\$HOME(\/|\s|$)/i, desc: 'rm -rf $HOME (홈 디렉토리 삭제)' },
    { pattern: /\brm\s+(?:-[a-z]+\s+){0,2}-[a-z]*[rf][a-z]*\s+\*(\s|$)/i, desc: 'rm -rf * (전체 삭제)' },
    { pattern: /\bmkfs\b/i, desc: 'mkfs (파일시스템 포맷)' },
    { pattern: /\bdd\s+.*of=\/dev\//i, desc: 'dd of=/dev/ (디스크 덮어쓰기)' },
    // Fork bomb: :(){ :|:& };: — 메타문자 이스케이프 수정, 세미콜론 전후 공백 허용
    { pattern: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:&\s*\}\s*;\s*:/i, desc: 'Fork bomb' },

    // Windows 파괴적 명령
    { pattern: /\bformat\s+[a-z]:/i, desc: 'format (디스크 포맷)' },
    { pattern: /\bdel\s+\/s\s+\/q\s+[a-z]:\\/i, desc: 'del /s /q (재귀 삭제)' },
    { pattern: /\brmdir\s+\/s\s+\/q\s+[a-z]:\\/i, desc: 'rmdir /s /q (디렉토리 재귀 삭제)' },
    { pattern: /\brd\s+\/s\s+\/q\s+[a-z]:\\/i, desc: 'rd /s /q (디렉토리 재귀 삭제)' },

    // 시스템 명령
    { pattern: /\bshutdown\s+(\/s|\/r|-h|-r)/i, desc: 'shutdown (시스템 종료/재시작)' },
    { pattern: /\btaskkill\s+\/f\s+\/im\s+(csrss|winlogon|lsass|services)/i, desc: 'taskkill (핵심 프로세스 종료)' },
    { pattern: /\bkill\s+-9\s+1\b/i, desc: 'kill -9 1 (init 프로세스 종료)' },

    // 레지스트리/시스템 파일
    { pattern: /\breg\s+delete\s+hk(lm|cr)\\/i, desc: 'reg delete (레지스트리 삭제)' },
    { pattern: /\bchmod\s+(-R\s+)?777\s+\//i, desc: 'chmod 777 / (루트 권한 변경)' },

    // Git 파괴적 명령
    // [^\n;|&]* : 명령 구분자를 넘지 않도록 스코프 제한 → 체인 명령에서 오탐 방지
    { pattern: /\bgit\s+push\b(?![^\n;|&]*--force-with-lease)[^\n;|&]*--force(\s|$)/i, desc: 'git push --force (원격 히스토리 덮어쓰기)' },
    { pattern: /\bgit\s+push\b(?![^\n;|&]*--force-with-lease)[^\n;|&]*\s-f(\s|$)/i, desc: 'git push -f (원격 히스토리 덮어쓰기)' },
    { pattern: /\bgit\s+reset\s+--hard\b/i, desc: 'git reset --hard (로컬 변경사항 삭제)' },
    { pattern: /\bgit\s+clean\s+(-[a-z]*f[a-z]*\s+)?-[a-z]*d/i, desc: 'git clean -fd (추적 안 되는 파일/디렉토리 삭제)' },
    { pattern: /\bgit\s+checkout\s+\.\s*$/i, desc: 'git checkout . (모든 변경사항 폐기)' },
    { pattern: /\bgit\s+branch\s+-D\b/, desc: 'git branch -D (브랜치 강제 삭제)' },
  ];

  for (const { pattern, desc } of dangerousPatterns) {
    if (pattern.test(cmd)) {
      console.error(`[DANGEROUS CMD WARNING] 위험한 명령어가 감지되었습니다: ${desc}`);
      console.error(`[DANGEROUS CMD WARNING] 명령어: ${cmd.substring(0, 200)}`);
      console.error('[DANGEROUS CMD WARNING] 이 명령은 시스템에 치명적인 영향을 줄 수 있습니다. 실행이 차단되었습니다.');
      try {
        const fl = require(path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'hooks', 'failure-logger.js'));
        fl.logFailure({ workflow: 'unknown', phase: 0, failureType: 'hook_block', subType: desc, severity: 'critical', cause: cmd.substring(0, 200), context: { hook: 'check-dangerous-cmd' }, recoveryAction: 'user_must_change_approach', resolved: false });
      } catch (_) {}
      process.exit(2);
    }
  }
});
