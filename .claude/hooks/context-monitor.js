// context-monitor.js
// PostToolUse Hook: 세션 내 도구 호출 횟수를 추적하여 컨텍스트 포화 사전 경고
// stdout → Claude가 수신 (지시), stderr → 사용자 터미널 표시 (시각적 경고)

const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'state');
const STATE_FILE = path.join(STATE_DIR, 'context-monitor.json');

const WARN_THRESHOLD = 40;
const CRITICAL_THRESHOLD = 70;
const SESSION_GAP_MS = 30 * 60 * 1000; // 30분

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (_) {}
  return { turnCount: 0, lastCallTimestamp: null, warnFired: false, criticalFired: false };
}

function saveState(state) {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (_) {
    // best-effort — 저장 실패해도 워크플로우 중단하지 않음
  }
}

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => data += chunk);
process.stdin.on('end', () => {
  try {
    JSON.parse(data);
  } catch {
    process.exit(0);
  }

  const now = new Date();
  let state = loadState();

  // 세션 감지: 30분 이상 간격이면 새 세션으로 리셋
  if (state.lastCallTimestamp) {
    const gap = now.getTime() - new Date(state.lastCallTimestamp).getTime();
    if (gap > SESSION_GAP_MS) {
      state = { turnCount: 0, lastCallTimestamp: null, warnFired: false, criticalFired: false };
    }
  }

  // 카운터 증가
  state.turnCount++;
  state.lastCallTimestamp = now.toISOString();

  // CRITICAL 임계값 (70회) — 1회만 발동
  if (state.turnCount >= CRITICAL_THRESHOLD && !state.criticalFired) {
    state.criticalFired = true;

    // stdout → Claude 수신
    console.log(
      '[CONTEXT MONITOR - CRITICAL] 도구 호출 ' + state.turnCount + '회 도달. ' +
      '컨텍스트 포화 임박. 현재 작업을 안전한 지점까지 마무리한 후 ' +
      '인수인계 문서를 작성하세요. 프로젝트 루트에 HANDOFF_{타임스탬프}.md를 생성하고 ' +
      '목표, 진행상황, 성공/실패 접근법, 핵심 컨텍스트, 다음 단계를 기록하세요.'
    );

    // stderr → 사용자 터미널
    console.error('');
    console.error('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
    console.error('\u2551  [CRITICAL] \ub3c4\uad6c \ud638\ucd9c ' + state.turnCount + '\ud68c \u2014 \ucee8\ud14d\uc2a4\ud2b8 \ud3ec\ud654 \uc784\ubc15           \u2551');
    console.error('\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563');
    console.error('\u2551  \uc790\ub3d9\uc73c\ub85c \uc778\uc218\uc778\uacc4 \ubb38\uc11c\ub97c \uc0dd\uc131\ud569\ub2c8\ub2e4.               \u2551');
    console.error('\u2551  \uc644\ub8cc \ud6c4 /clear \u2192 HANDOFF.md \uc77d\uae30\ub85c \uc774\uc5b4\uac00\uc138\uc694.    \u2551');
    console.error('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
    console.error('');

  // WARN 임계값 (40회) — 1회만 발동
  } else if (state.turnCount >= WARN_THRESHOLD && !state.warnFired) {
    state.warnFired = true;

    // stdout → Claude 수신
    console.log(
      '[CONTEXT MONITOR - WARNING] 도구 호출 ' + state.turnCount + '회 도달 ' +
      '(CRITICAL 임계값: ' + CRITICAL_THRESHOLD + '회). ' +
      '컨텍스트 포화가 가까워지고 있습니다. 현재 작업의 마무리를 서두르거나, ' +
      '사용자에게 인수인계 필요성을 안내하세요.'
    );

    // stderr → 사용자 터미널
    console.error('');
    console.error('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
    console.error('\u2551  [WARNING] \ub3c4\uad6c \ud638\ucd9c ' + state.turnCount + '\ud68c \u2014 \ucee8\ud14d\uc2a4\ud2b8 \ud3ec\ud654 \uc8fc\uc758            \u2551');
    console.error('\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563');
    console.error('\u2551  \uc791\uc5c5 \ub9c8\ubb34\ub9ac\ub97c \uc11c\ub450\ub974\uac70\ub098 /handoff \ub97c \uc2e4\ud589\ud558\uc138\uc694.   \u2551');
    console.error('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
    console.error('');
  }

  saveState(state);
  process.exit(0);
});
