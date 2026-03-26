// check-sensitive-write.js
// PreToolUse(Write,Edit) Hook: 민감 파일 쓰기 차단
// settings.json의 PreToolUse matcher: "Write|Edit"로 등록

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = (input.tool_input && (input.tool_input.file_path || input.tool_input.path || ''));
    const normalized = filePath.replace(/\\\\/g, '/').toLowerCase();

    // 차단 패턴 목록
    const sensitivePatterns = [
      // API 키/시크릿 파일
      { pattern: /api_key\.txt$/i, desc: 'API Key 파일' },
      { pattern: /\.env$/i, desc: '.env 환경 파일' },
      { pattern: /\.env\.(local|production|staging)/i, desc: '.env 환경 파일' },
      { pattern: /credentials\.json$/i, desc: '인증 정보 파일' },
      { pattern: /secrets?\.(json|yaml|yml|toml)$/i, desc: '시크릿 파일' },
      { pattern: /\.pem$/i, desc: '인증서/키 파일' },
      { pattern: /id_rsa/i, desc: 'SSH 키 파일' },

      // 시스템 경로 (Linux)
      { pattern: /^\/etc\//i, desc: '시스템 설정 디렉토리' },
      { pattern: /^\/usr\/(bin|sbin|lib)\//i, desc: '시스템 바이너리 디렉토리' },

      // 시스템 경로 (Windows)
      { pattern: /[a-z]:\/windows\//i, desc: 'Windows 시스템 디렉토리' },
      { pattern: /[a-z]:\/program files/i, desc: 'Program Files 디렉토리' },

      // Git 내부 파일
      { pattern: /\.git\/(config|HEAD|hooks\/)/i, desc: 'Git 내부 파일' },
    ];

    for (const { pattern, desc } of sensitivePatterns) {
      if (pattern.test(normalized)) {
        console.error(`[SENSITIVE WRITE WARNING] 민감 파일 쓰기가 감지되었습니다: ${desc}`);
        console.error(`[SENSITIVE WRITE WARNING] 파일: ${filePath}`);
        console.error('[SENSITIVE WRITE WARNING] 이 파일은 보호 대상입니다. 쓰기가 차단되었습니다.');
        process.exit(2);
      }
    }
  } catch (e) {
    // 파싱 실패 시 조용히 통과
  }
});
