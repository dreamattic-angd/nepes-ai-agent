// post-compact-notice.js
// Notification Hook: 자동 컨텍스트 압축(compact) 발생 시 HANDOFF.md 작성 안내
// Claude Code가 컨텍스트를 자동 압축할 때:
//   stdout → Claude에게 인수인계 문서 작성 지시
//   stderr → 사용자 터미널에 시각적 경고

const fs = require('fs');
const path = require('path');

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
      // stdout → Claude 수신: 인수인계 문서 작성 지시
      console.log(
        '[POST-COMPACT] 자동 컨텍스트 압축이 감지되었습니다. ' +
        '중요한 컨텍스트가 유실되었을 수 있습니다. ' +
        '즉시 인수인계 문서를 작성하세요. 프로젝트 루트에 HANDOFF_{타임스탬프}.md를 생성하고 ' +
        '목표, 진행상황, 성공/실패 접근법, 핵심 컨텍스트, 다음 단계를 기록하세요. ' +
        '압축 이후 기억 가능한 정보만으로 작성하되, 불확실한 부분은 [압축으로 유실 가능] 표시하세요.'
      );

      // stderr → 사용자 터미널 경고
      console.error('');
      console.error('╔══════════════════════════════════════════════════════╗');
      console.error('║  [CONTEXT WARNING] 자동 컨텍스트 압축이 감지됨      ║');
      console.error('╠══════════════════════════════════════════════════════╣');
      console.error('║  중요한 컨텍스트가 유실되었을 수 있습니다.          ║');
      console.error('║                                                      ║');
      console.error('║  자동으로 인수인계 문서를 생성합니다.               ║');
      console.error('║  완료 후 /clear → HANDOFF.md 읽기로 이어가세요.    ║');
      console.error('╚══════════════════════════════════════════════════════╝');
      console.error('');

      // context-monitor 상태 리셋 (압축 이후 카운터 무의미)
      try {
        const stateFile = path.join(
          process.env.USERPROFILE || process.env.HOME,
          '.claude', 'state', 'context-monitor.json'
        );
        if (fs.existsSync(stateFile)) {
          fs.unlinkSync(stateFile);
        }
      } catch (_) {}
    }
  } catch (e) {
    // 파싱 실패 시 조용히 통과
  }
});
