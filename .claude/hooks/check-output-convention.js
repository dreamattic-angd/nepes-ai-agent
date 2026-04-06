// check-output-convention.js
// PostToolUse Hook: .claude/agents/**/*.md, commands/**/*.md, skills/*/SKILL.md
// 작성·편집 후 구조 규칙 준수 여부를 검사하는 Advisory Hook
// exit code: 항상 0 (비차단, Advisory)

const fs = require('fs');
const path = require('path');

const MIN_CONTENT_LENGTH = 50;

// 허용된 베이스 경로: USERPROFILE 또는 HOME 기반 .claude 디렉토리
const ALLOWED_BASE = (process.env.USERPROFILE || process.env.HOME || '').replace(/\\/g, '/') + '/.claude';

// failure-logger는 선택적 의존성 (없어도 동작) — lazy loading
function logFailure(data) {
  try {
    const fl = require(path.join(process.env.USERPROFILE || process.env.HOME, '.claude', 'hooks', 'failure-logger.js'));
    fl.logFailure(data);
  } catch (_) {}
}

// stdin에서 hook 입력 읽기
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    run(input);
  } catch (e) {
    console.error(`[check-output-convention] 예외 발생: ${e.message}`);
    process.exit(0); // best-effort
  }
});

function run(rawInput) {
  let hookData = {};
  try {
    hookData = JSON.parse(rawInput);
  } catch (_) {
    process.exit(0);
  }

  const toolName = hookData.tool_name || '';
  if (toolName !== 'Write' && toolName !== 'Edit') {
    process.exit(0);
  }

  const rawFilePath = (hookData.tool_input || {}).file_path || '';
  if (!rawFilePath) process.exit(0);

  // 입력 검증: 길이 및 null byte
  if (rawFilePath.length > 1024 || rawFilePath.includes('\0')) {
    process.exit(0);
  }

  // 경로 정규화 (절대경로화 + Windows 백슬래시 → 슬래시)
  const resolvedPath = path.resolve(rawFilePath);
  const normalizedPath = resolvedPath.replace(/\\/g, '/');

  // 대상 파일 필터: 허용된 베이스 경로(ALLOWED_BASE) 내의 agents/commands/skills 만 처리
  if (!normalizedPath.startsWith(ALLOWED_BASE)) {
    process.exit(0);
  }
  const isAgent   = /\/agents\/.+\.md$/.test(normalizedPath);
  const isCommand = /\/commands\/.+\.md$/.test(normalizedPath);
  const isSkill   = /\/skills\/.+\/SKILL\.md$/.test(normalizedPath);

  if (!isAgent && !isCommand && !isSkill) {
    process.exit(0);
  }

  // 파일 내용 읽기
  let content = '';
  try {
    content = fs.readFileSync(resolvedPath, 'utf8');
  } catch (_) {
    process.exit(0);
  }

  const violations = [];
  const fileName = path.basename(resolvedPath);
  const isPhaseFile = /^phase\d+/.test(fileName); // 소문자 규칙 — /i 플래그 불필요

  // Rule E: 파일 내용 너무 짧음
  if (content.length < MIN_CONTENT_LENGTH) {
    violations.push(`Rule E: 파일 내용이 너무 짧습니다 (${content.length}자). 작성이 완료되었나요?`);
  }

  if (isAgent) {
    if (isPhaseFile) {
      // Rule B: Phase 파일 — ## Procedure 또는 ## Verification Procedure 필수
      if (!/^##\s+(Procedure|Verification Procedure|Verification Checklist)/m.test(content)) {
        violations.push('Rule B: ## Procedure 또는 ## Verification Procedure 섹션이 없습니다.');
      }
    } else {
      // Rule A: 일반 Agent 파일 — ## Role 또는 ## Role Definition 필수
      if (!/^##\s+(Role|Role Definition)/m.test(content)) {
        violations.push('Rule A: ## Role 또는 ## Role Definition 섹션이 없습니다.');
      }
    }
  }

  if (isSkill) {
    // frontmatter 블록(--- ~ --- 사이)만 추출하여 검사
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    // Rule C: YAML frontmatter에 name: 필수 (공백만 있는 값은 무효)
    if (!frontmatter || !/^name:\s*\S+/m.test(frontmatter)) {
      violations.push('Rule C: YAML frontmatter에 name: 필드가 없습니다.');
    }
    // Rule D: YAML frontmatter에 description: 필수
    if (!frontmatter || !/^description:/m.test(frontmatter)) {
      violations.push('Rule D: YAML frontmatter에 description: 필드가 없습니다.');
    }
  }

  // Rule F: 미교체 플레이스홀더 감지 (코드 블록 외부에서만)
  const knownPlaceholders = [
    '{PROJECT_NAME}',
    '{COMMIT_TYPE}',
    '{ITSM_NUMBER}',
    '{first 7 chars of commit hash}',
    '{old version}',
    '{new version}',
    '{branch name}',
  ];
  // 코드 블록(```...```) 제거: 닫히지 않은 블록은 파일 끝까지 제거
  const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?(?:```|$)/g, '');
  const foundPlaceholders = knownPlaceholders.filter(p => contentWithoutCodeBlocks.includes(p));
  if (foundPlaceholders.length > 0) {
    violations.push(`Rule F: 미교체 플레이스홀더 발견 (코드 블록 외부): ${foundPlaceholders.join(', ')}`);
  }

  if (violations.length === 0) {
    process.exit(0);
  }

  // Advisory 메시지 출력
  const claudeIdx = normalizedPath.indexOf('/.claude/');
  const relPath = claudeIdx >= 0 ? normalizedPath.slice(claudeIdx + 1) : fileName;
  const lines = [
    `⚠️ [Convention Check] 위반 감지: ${relPath}`,
    '',
    ...violations.map(v => `  → ${v}`),
    '',
    '교정이 필요하면 파일을 수정해 주세요.',
  ];
  process.stdout.write(lines.join('\n') + '\n');

  // failure-logger 기록 (best-effort)
  try {
    logFailure({
      workflow: 'convention-check',
      phase: 0,
      failureType: 'validation_fail',
      subType: 'convention_violation',
      severity: 'informational',
      cause: `규칙 위반: ${violations.join(' | ')}`,
      context: { file: resolvedPath, rules: violations },
      resolved: false,
    });
  } catch (_) {}

  process.exit(0); // Advisory — 항상 0
}
