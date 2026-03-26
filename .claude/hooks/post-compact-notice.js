// post-compact-notice.js
// Notification Hook: 자동 컨텍스트 압축(compact) 발생 시 HANDOFF.md 작성 안내
// Claude Code가 컨텍스트를 자동 압축할 때 사용자에게 알림

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);

    // compact 관련 알림 감지
    // Notification 이벤트의 message 필드에서 compact/compress 키워드 탐지
    const message = (input.message || input.notification || '').toLowerCase();
    const type = (input.type || '').toLowerCase();

    const isCompact = message.includes('compact') ||
                      message.includes('compress') ||
                      message.includes('context') ||
                      type.includes('compact');

    if (isCompact) {
      console.error('');
      console.error('╔══════════════════════════════════════════════════════╗');
      console.error('║  [CONTEXT WARNING] 자동 컨텍스트 압축이 감지됨      ║');
      console.error('╠══════════════════════════════════════════════════════╣');
      console.error('║  중요한 컨텍스트가 유실되었을 수 있습니다.          ║');
      console.error('║                                                      ║');
      console.error('║  권장 조치:                                          ║');
      console.error('║  1. /handoff 로 인수인계 문서 작성                    ║');
      console.error('║  2. /clear 후 HANDOFF.md 읽고 작업 이어가기         ║');
      console.error('╚══════════════════════════════════════════════════════╝');
      console.error('');
    }
  } catch (e) {
    // 파싱 실패 시 조용히 통과
  }
});
