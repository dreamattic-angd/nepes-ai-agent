// check-dangerous-cmd.js
// PreToolUse(Bash) Hook: 파괴적 시스템 명령어 차단
// 기존 check-db-write.js와 병렬 실행됨

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const cmd = (input.tool_input && input.tool_input.command || '');
    const cmdUpper = cmd.toUpperCase();

    // 차단 패턴 목록
    const dangerousPatterns = [
      // Linux/Unix 파괴적 명령
      { pattern: /\brm\s+(-[a-z]*f[a-z]*\s+)?(-[a-z]*r[a-z]*\s+)?\/(\s|$)/i, desc: 'rm -rf / (루트 삭제)' },
      { pattern: /\brm\s+(-[a-z]*r[a-z]*\s+)(-[a-z]*f[a-z]*\s+)?\/(\s|$)/i, desc: 'rm -rf / (루트 삭제)' },
      { pattern: /\bmkfs\b/i, desc: 'mkfs (파일시스템 포맷)' },
      { pattern: /\bdd\s+.*of=\/dev\//i, desc: 'dd of=/dev/ (디스크 덮어쓰기)' },
      { pattern: /\b:(){ :\|:& };:/i, desc: 'Fork bomb' },

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
      { pattern: /\bgit\s+push\s+.*--force(?!-with-lease)\b/i, desc: 'git push --force (원격 히스토리 덮어쓰기)' },
      { pattern: /\bgit\s+push\s+-f\b/i, desc: 'git push -f (원격 히스토리 덮어쓰기)' },
      { pattern: /\bgit\s+reset\s+--hard\b/i, desc: 'git reset --hard (로컬 변경사항 삭제)' },
      { pattern: /\bgit\s+clean\s+(-[a-z]*f[a-z]*\s+)?-[a-z]*d/i, desc: 'git clean -fd (추적 안 되는 파일/디렉토리 삭제)' },
      { pattern: /\bgit\s+checkout\s+\.\s*$/i, desc: 'git checkout . (모든 변경사항 폐기)' },
      { pattern: /\bgit\s+branch\s+-D\b/i, desc: 'git branch -D (브랜치 강제 삭제)' },
    ];

    for (const { pattern, desc } of dangerousPatterns) {
      if (pattern.test(cmd)) {
        console.error(`[DANGEROUS CMD WARNING] 위험한 명령어가 감지되었습니다: ${desc}`);
        console.error(`[DANGEROUS CMD WARNING] 명령어: ${cmd.substring(0, 200)}`);
        console.error('[DANGEROUS CMD WARNING] 이 명령은 시스템에 치명적인 영향을 줄 수 있습니다. 실행이 차단되었습니다.');
        process.exit(2);
      }
    }
  } catch (e) {
    // 파싱 실패 시 조용히 통과 (기존 패턴 유지)
  }
});
