// checkpoint.js
// Phase 체크포인트 영속화 유틸리티
// 워크플로우 phase 완료 시 상태를 저장하고, 재개 시 복원

const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'state');

function saveCheckpoint(workflow, phase, data) {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    const checkpoint = {
      workflow,
      phase,
      timestamp: new Date().toISOString(),
      data
    };
    const filename = `${workflow}-latest.json`;
    fs.writeFileSync(path.join(STATE_DIR, filename), JSON.stringify(checkpoint, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`[checkpoint] 체크포인트 저장 실패: ${e.message}`);
    return false;
  }
}

function loadCheckpoint(workflow) {
  try {
    const filename = `${workflow}-latest.json`;
    const filepath = path.join(STATE_DIR, filename);
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`[checkpoint] ${workflow} 체크포인트 파일 손상 — 파싱 실패: ${e.message}`);
    console.error('[checkpoint] 손상된 체크포인트를 삭제하고 처음부터 시작합니다.');
    try { fs.unlinkSync(path.join(STATE_DIR, `${workflow}-latest.json`)); } catch (_) {}
    return null;
  }
}

function clearCheckpoint(workflow) {
  try {
    const filename = `${workflow}-latest.json`;
    const filepath = path.join(STATE_DIR, filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch (e) {
    console.error(`[checkpoint] 체크포인트 삭제 실패: ${e.message}`);
  }
}

module.exports = { saveCheckpoint, loadCheckpoint, clearCheckpoint, STATE_DIR };
