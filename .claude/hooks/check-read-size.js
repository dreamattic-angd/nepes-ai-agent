// check-read-size.js
// PreToolUse(Read) Hook: 대용량 파일 읽기 시 offset/limit 없으면 사전 차단
// Read 도구 호출 전 파일 줄 수를 확인하여 초과 시 deny + 줄 수 정보 제공

const fs = require('fs');
const path = require('path');

const LINE_THRESHOLD = 2000; // Read 도구 기본 limit

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const toolInput = input.tool_input || {};
    const filePath = toolInput.file_path || '';
    const offset = toolInput.offset;
    const limit = toolInput.limit;

    // offset 또는 limit이 이미 지정된 경우 → 통과
    if (offset !== undefined || limit !== undefined) {
      process.exit(0);
    }

    // 파일 경로가 없으면 통과
    if (!filePath) {
      process.exit(0);
    }

    // 경로 정규화 (Windows backslash 호환)
    let resolvedPath = path.resolve(filePath);
    if (!path.isAbsolute(filePath) && input.cwd) {
      resolvedPath = path.resolve(input.cwd, filePath);
    }

    if (!fs.existsSync(resolvedPath)) {
      // 파일이 없으면 Read 도구가 자체 에러를 내도록 통과
      process.exit(0);
    }

    // 바이너리/이미지/PDF 파일은 줄 수 체크 불필요 → 통과
    const ext = path.extname(resolvedPath).toLowerCase();
    const binaryExts = [
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
      '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
      '.exe', '.dll', '.so', '.dylib',
      '.mp3', '.mp4', '.wav', '.avi', '.mov',
      '.ipynb',
      '.woff', '.woff2', '.ttf', '.eot',
      '.xlsx', '.xls', '.docx', '.pptx',
      '.pyc', '.pyo', '.o', '.obj', '.class', '.jar',
      '.map',
    ];
    if (binaryExts.includes(ext)) {
      process.exit(0);
    }

    // 줄 수 카운트 (효율적: 버퍼 단위로 newline 수만 셈)
    const BUFFER_SIZE = 64 * 1024;
    let lineCount = 0;
    let earlyBreak = false; // 임계값 초과로 조기 종료 여부
    let fd;
    try {
      fd = fs.openSync(resolvedPath, 'r');
      const buf = Buffer.alloc(BUFFER_SIZE);
      let bytesRead;
      while ((bytesRead = fs.readSync(fd, buf, 0, BUFFER_SIZE, null)) > 0) {
        for (let i = 0; i < bytesRead; i++) {
          if (buf[i] === 0x0A) lineCount++;
        }
        // 임계값 초과 시 조기 종료 (전체 파일을 읽을 필요 없음)
        if (lineCount > LINE_THRESHOLD) {
          earlyBreak = true;
          break;
        }
      }
      // 마지막 바이트가 newline이 아니면 마지막 줄 보정
      // earlyBreak인 경우 이미 초과 확정이므로 보정 불필요
      if (!earlyBreak) {
        const stat = fs.fstatSync(fd);
        if (stat.size > 0) {
          const lastBuf = Buffer.alloc(1);
          fs.readSync(fd, lastBuf, 0, 1, stat.size - 1);
          if (lastBuf[0] !== 0x0A) lineCount++;
        }
      }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }

    if (lineCount > LINE_THRESHOLD) {
      // deny + 줄 수 정보 제공하여 Claude가 offset/limit을 붙여 재시도하도록 유도
      const result = {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason:
            `[check-read-size] 이 파일은 ${lineCount > LINE_THRESHOLD ? LINE_THRESHOLD + '+' : lineCount}줄 이상입니다 (임계값: ${LINE_THRESHOLD}줄). ` +
            `offset과 limit 파라미터를 지정하여 부분적으로 읽어주세요. ` +
            `예: offset=0, limit=500 → 1~500줄 읽기`
        }
      };
      process.stdout.write(JSON.stringify(result));
      process.exit(0);
    }

    // 임계값 이하 → 통과
    process.exit(0);
  } catch (e) {
    // 파싱/파일 접근 실패 시 조용히 통과 (기존 패턴 유지)
    process.exit(0);
  }
});
