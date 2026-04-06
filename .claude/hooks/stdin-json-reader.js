// stdin-json-reader.js
// 공통 유틸리티: stdin에서 JSON을 읽어 콜백으로 전달
// PreToolUse/PostToolUse Hook에서 공통으로 require하여 사용

const STDIN_TIMEOUT_MS = 10000; // 10초 무응답 시 실패 처리

/**
 * stdin 전체를 읽어 JSON으로 파싱한 후 callback(err, input)을 호출한다.
 * 파싱 성공: callback(null, parsedObject)
 * 파싱 실패: callback(error, null)
 * 타임아웃/에러: callback(error, null)
 *
 * @param {function(Error|null, object|null): void} callback
 */
function readStdinJson(callback) {
  let data = '';
  let settled = false;

  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    process.stdin.destroy(); // 타임아웃 후 스트림 종료 — 버퍼 계속 누적 방지
    callback(new Error('stdin 읽기 타임아웃 (10초)'), null);
  }, STDIN_TIMEOUT_MS);

  process.stdin.setEncoding('utf8');

  process.stdin.on('data', chunk => { data += chunk; });

  process.stdin.on('end', () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    try {
      const input = JSON.parse(data);
      callback(null, input);
    } catch (e) {
      callback(e, null);
    }
  });

  process.stdin.on('error', (err) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    callback(err, null);
  });
}

module.exports = { readStdinJson };
