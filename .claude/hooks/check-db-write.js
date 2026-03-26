let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const cmd = (input.tool_input && input.tool_input.command || '').toUpperCase();
    if (cmd.includes('SQLPLUS') && /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|MERGE)\b/.test(cmd)) {
      console.error('[DB WRITE WARNING] INSERT/UPDATE/DELETE/DDL 작업이 감지되었습니다. SQL을 반드시 확인하세요!');
      process.exit(2);
    }
  } catch (e) {}
});
