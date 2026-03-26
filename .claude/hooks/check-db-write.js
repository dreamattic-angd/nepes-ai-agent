let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const cmd = (input.tool_input && input.tool_input.command || '').toUpperCase();
    if (cmd.includes('SQLPLUS') && /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|MERGE)\b/.test(cmd)) {
      console.error('[DB WRITE WARNING] INSERT/UPDATE/DELETE/DDL 작업이 감지되었습니다. SQL을 반드시 확인하세요!');
      try {
        const fl = require(process.env.USERPROFILE + '/.claude/hooks/failure-logger.js');
        fl.logFailure({ workflow: 'unknown', phase: 0, failureType: 'hook_block', subType: 'db_write', severity: 'critical', cause: cmd.substring(0, 200), context: { hook: 'check-db-write' }, recoveryAction: 'user_must_change_approach', resolved: false });
      } catch (_) {}
      process.exit(2);
    }
  } catch (e) {
    console.error('[check-db-write] 입력 파싱 실패 — 검증을 건너뜁니다:', e.message);
  }
});
