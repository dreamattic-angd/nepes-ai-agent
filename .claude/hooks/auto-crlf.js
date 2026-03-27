// auto-crlf.js
// PostToolUse Write 훅 — .bat/.cmd 파일 생성 시 LF → CRLF 자동 변환
// Windows 전용 실행 파일은 CRLF가 필요하므로 Write 직후 자동 처리한다.

const fs = require('fs');
const path = require('path');

const CRLF_EXTENSIONS = new Set(['.bat', '.cmd']);

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = input?.tool_input?.file_path;
  if (!filePath) process.exit(0);

  const ext = path.extname(filePath).toLowerCase();
  if (!CRLF_EXTENSIONS.has(ext)) process.exit(0);

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    process.exit(0);
  }

  // 이미 CRLF인 줄은 건드리지 않고, LF만 있는 줄을 CRLF로 변환
  const converted = content.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  if (converted === content) process.exit(0);

  try {
    fs.writeFileSync(filePath, converted, 'utf8');
  } catch {
    // 변환 실패해도 워크플로우를 중단하지 않는다
  }

  process.exit(0);
});
