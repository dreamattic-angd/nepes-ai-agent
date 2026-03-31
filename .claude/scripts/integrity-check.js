// integrity-check.js
// .claude/ 디렉토리 내 연동 무결성 자동 검증 스크립트
// Hook/유틸리티 연동, 커맨드-에이전트 참조, 에이전트 테이블, 버전 정합성을 검증

const fs = require('fs');
const path = require('path');

// 베이스 경로 계산
const CLAUDE_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(CLAUDE_DIR, '..');
const VERBOSE = process.argv.includes('--verbose');

// ────────────────────────────────────────
// 유틸리티 함수
// ────────────────────────────────────────

/**
 * 디렉토리를 재귀 탐색하여 파일 목록을 반환한다.
 * @param {string} dir - 탐색 시작 디렉토리
 * @param {string} [ext] - 필터링할 확장자 (예: '.md')
 * @returns {string[]} 파일 절대 경로 배열
 */
function walkDir(dir, ext) {
  const results = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        if (!ext || path.extname(entry.name) === ext) {
          results.push(fullPath);
        }
      }
    }
  }
  return results;
}

/**
 * 파일을 안전하게 읽는다. 실패 시 null을 반환한다.
 * @param {string} filePath
 * @returns {string|null}
 */
function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

// ────────────────────────────────────────
// Check 1: Hook/유틸리티 연동 확인
// ────────────────────────────────────────

/**
 * hooks/ 디렉토리의 .js 파일이 settings.json 또는 .md 파일에서 참조되는지 검증한다.
 * @returns {{ pass: boolean, details: Array<{file: string, status: string, ref: string}> }}
 */
function checkHookIntegration() {
  const hooksDir = path.join(CLAUDE_DIR, 'hooks');
  const details = [];

  // hooks/ 디렉토리의 .js 파일 수집
  let hookFiles = [];
  try {
    hookFiles = fs.readdirSync(hooksDir)
      .filter(f => path.extname(f) === '.js');
  } catch {
    // hooks/ 디렉토리가 없거나 비어있으면 PASS
    return { pass: true, details: [] };
  }

  if (hookFiles.length === 0) {
    return { pass: true, details: [] };
  }

  // settings.json 파싱
  let settingsHooks = null;
  const settingsPath = path.join(CLAUDE_DIR, 'settings.json');
  const settingsContent = safeReadFile(settingsPath);
  if (settingsContent) {
    try {
      const settings = JSON.parse(settingsContent);
      settingsHooks = settings.hooks || null;
    } catch {
      console.log('  [경고] settings.json 파싱 실패, .md 참조만 확인합니다.');
    }
  } else {
    console.log('  [경고] settings.json을 읽을 수 없습니다, .md 참조만 확인합니다.');
  }

  // .claude/ 하위 모든 .md 파일을 한 번만 읽어 캐싱
  const mdFiles = walkDir(CLAUDE_DIR, '.md');
  const mdCache = new Map();
  for (const mdPath of mdFiles) {
    const content = safeReadFile(mdPath);
    if (content) {
      mdCache.set(mdPath, content);
    }
  }

  // 각 hook .js 파일에 대해 검증
  for (const hookFile of hookFiles) {
    let foundInSettings = false;
    let settingsSection = '';

    // (a) settings.json hooks 섹션에서 검색
    if (settingsHooks) {
      for (const [sectionName, sectionArr] of Object.entries(settingsHooks)) {
        if (!Array.isArray(sectionArr)) continue;
        for (const item of sectionArr) {
          const hooks = item.hooks;
          if (Array.isArray(hooks)) {
            for (const hook of hooks) {
              if (hook.command && hook.command.includes(hookFile)) {
                foundInSettings = true;
                settingsSection = sectionName;
                break;
              }
            }
          }
          if (foundInSettings) break;
        }
        if (foundInSettings) break;
      }
    }

    if (foundInSettings) {
      details.push({ file: hookFile, status: 'PASS', ref: `settings.json ${settingsSection}` });
      continue;
    }

    // (b) 캐싱된 .md 파일에서 파일명 검색
    const mdRefs = [];
    for (const [mdPath, content] of mdCache) {
      if (content.includes(hookFile)) {
        const relPath = path.relative(CLAUDE_DIR, mdPath).replace(/\\/g, '/');
        mdRefs.push(relPath);
      }
    }

    if (mdRefs.length > 0) {
      const firstRef = mdRefs[0];
      const extraCount = mdRefs.length - 1;
      const refStr = extraCount > 0
        ? `${firstRef} 외 ${extraCount}건`
        : firstRef;
      details.push({ file: hookFile, status: 'PASS', ref: refStr, allRefs: mdRefs });
    } else {
      details.push({ file: hookFile, status: 'FAIL', ref: '참조 없음' });
    }
  }

  const pass = details.every(d => d.status === 'PASS');
  return { pass, details };
}

// ────────────────────────────────────────
// Check 2: Commands -> Agents 참조 무결성
// ────────────────────────────────────────

/**
 * 커맨드 .md에서 참조하는 에이전트 파일이 실제 존재하는지 검증한다.
 * @returns {{ pass: boolean, details: Array<{command: string, agent: string, exists: boolean}> }}
 */
function checkCommandAgentRefs() {
  const commandsDir = path.join(CLAUDE_DIR, 'commands');
  const details = [];

  // 검증 제외 커맨드
  const skipCommands = ['help-cmd.md', 'handoff.md', 'review-claudemd.md', 'analyze-log.md'];

  let commandFiles = [];
  try {
    commandFiles = fs.readdirSync(commandsDir)
      .filter(f => path.extname(f) === '.md');
  } catch {
    return { pass: true, details: [] };
  }

  if (commandFiles.length === 0) {
    return { pass: true, details: [] };
  }

  for (const cmdFile of commandFiles) {
    if (skipCommands.includes(cmdFile)) continue;

    const cmdPath = path.join(commandsDir, cmdFile);
    const content = safeReadFile(cmdPath);
    if (!content) continue;

    const agentPaths = [];

    // 패턴 A: .claude/agents/ 로 시작하는 직접 경로 (후행 구두점 제거)
    const directRefs = content.match(/\.claude\/agents\/[^\s)`,]+\.md/g);
    if (directRefs) {
      for (const ref of directRefs) {
        agentPaths.push(ref);
      }
    }

    // 패턴 B: 에이전트 폴더 + 폴더 내 실제 .md 파일 대조
    // 중첩 경로도 지원: .claude/agents/naa/cm-audit/ → naa/cm-audit
    const folderPattern = /\.claude\/agents\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\//g;
    const folderMatches = content.match(folderPattern);
    if (folderMatches) {
      const folders = [...new Set(folderMatches.map(m => {
        const match = m.match(/\.claude\/agents\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\//);
        return match ? match[1] : null;
      }).filter(Boolean))];

      for (const folder of folders) {
        // 해당 폴더의 실제 .md 파일 목록을 가져와서 커맨드에서 참조하는지 확인
        const agentFolderPath = path.join(CLAUDE_DIR, 'agents', folder);
        let folderFiles = [];
        try {
          folderFiles = fs.readdirSync(agentFolderPath)
            .filter(f => path.extname(f) === '.md');
        } catch {
          continue;
        }

        // 폴더 언급 위치를 찾아서 해당 컨텍스트 블록(전후 500자)에서만 phase 매칭
        const folderRef = `.claude/agents/${folder}/`;
        const folderIdx = content.indexOf(folderRef);
        const contextStart = Math.max(0, folderIdx - 200);
        const contextEnd = Math.min(content.length, folderIdx + 2000);
        const contextBlock = folderIdx >= 0 ? content.slice(contextStart, contextEnd) : content;

        for (const mdFile of folderFiles) {
          const fullPath = `.claude/agents/${folder}/${mdFile}`;
          // 패턴 A에서 이미 잡힌 것은 스킵
          if (agentPaths.includes(fullPath)) continue;

          // 커맨드 내용에서 파일명이 직접 언급되는지 먼저 확인
          if (content.includes(mdFile)) {
            agentPaths.push(fullPath);
            continue;
          }

          // phase 파일인 경우: 폴더 컨텍스트 블록에서 phase 번호 언급 확인
          const baseName = mdFile.replace('.md', '');
          const phaseNumMatch = baseName.match(/^phase(\d+)/);
          if (phaseNumMatch) {
            const phaseNum = phaseNumMatch[1];
            const phaseRef = new RegExp(`Phase\\s*${phaseNum}|phase${phaseNum}`, 'i');
            if (phaseRef.test(contextBlock)) {
              agentPaths.push(fullPath);
            }
          }
        }
      }
    }

    // 중복 제거
    const uniquePaths = [...new Set(agentPaths)];

    if (uniquePaths.length === 0) continue;

    // 각 경로 존재 확인
    let allExist = true;
    let existCount = 0;
    const missingPaths = [];

    for (const agentPath of uniquePaths) {
      const absPath = path.join(PROJECT_ROOT, agentPath);
      const exists = fs.existsSync(absPath);
      if (exists) {
        existCount++;
      } else {
        allExist = false;
        missingPaths.push(agentPath);
      }
    }

    const cmdName = cmdFile;
    if (allExist) {
      details.push({
        command: cmdName,
        agent: `${existCount}개 참조 모두 존재`,
        exists: true,
        allPaths: uniquePaths
      });
    } else {
      for (const missing of missingPaths) {
        details.push({
          command: cmdName,
          agent: missing,
          exists: false
        });
      }
    }
  }

  const pass = details.every(d => d.exists);
  return { pass, details };
}

// ────────────────────────────────────────
// Check 3: version.txt 에이전트 테이블 <-> 파일시스템
// ────────────────────────────────────────

/**
 * version.txt의 운영 에이전트 테이블과 실제 디렉토리를 대조한다.
 * @returns {{ pass: boolean, warnings: number, details: Array<{agent: string, status: string, message: string}> }}
 */
function checkAgentTable() {
  const versionPath = path.join(CLAUDE_DIR, 'version.txt');
  const versionContent = safeReadFile(versionPath);
  const agentsDir = path.join(CLAUDE_DIR, 'agents');

  if (!versionContent) {
    return {
      pass: false,
      warnings: 0,
      details: [{ agent: '-', status: 'FAIL', message: 'version.txt 파일을 읽을 수 없습니다' }]
    };
  }

  const details = [];
  let warnings = 0;

  // 운영 에이전트 추출: "| 에이전트명 | ✅ 운영 |" 패턴
  const operationalPattern = /^\|\s*([^|]+?)\s*\|\s*✅ 운영/gm;
  const operationalAgents = [];
  let match;

  while ((match = operationalPattern.exec(versionContent)) !== null) {
    operationalAgents.push(match[1].trim());
  }

  // 에이전트명 -> 디렉토리 매핑 및 검증
  for (const agentName of operationalAgents) {
    // (skill) 접미사 -> 스킵
    if (agentName.includes('(skill)')) continue;

    // (통합) 접미사 제거
    let dirName = agentName.replace(/\s*\(통합\)\s*/, '').trim();

    // 디렉토리 또는 단일 .md 파일 경로 생성
    const agentDirPath = path.join(agentsDir, dirName);
    const agentFilePath = path.join(agentsDir, dirName + '.md');

    if (fs.existsSync(agentDirPath)) {
      details.push({ agent: agentName, status: 'PASS', message: '디렉토리 존재' });
    } else if (fs.existsSync(agentFilePath)) {
      details.push({ agent: agentName, status: 'PASS', message: '단일 파일 에이전트 존재' });
    } else {
      // commands/ 디렉토리에서도 찾기 (커맨드로 등록된 에이전트)
      const commandFilePath = path.join(CLAUDE_DIR, 'commands', dirName + '.md');
      if (fs.existsSync(commandFilePath)) {
        details.push({ agent: agentName, status: 'PASS', message: '커맨드 파일 존재' });
      } else {
        details.push({ agent: agentName, status: 'FAIL', message: `${dirName}/ 디렉토리 또는 ${dirName}.md 파일 없음` });
      }
    }
  }

  // 역방향: agents/ 직하위 디렉토리 및 단일 .md 파일이 테이블에 있는지 확인
  let agentEntries = [];
  try {
    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
    // 디렉토리
    agentEntries.push(...entries.filter(e => e.isDirectory()).map(e => e.name));
    // 단일 .md 파일 (확장자 제거)
    agentEntries.push(...entries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => e.name.replace(/\.md$/, '')));
  } catch {
    // agents/ 디렉토리를 읽을 수 없으면 스킵
  }

  for (const entry of agentEntries) {
    // 테이블에서 이 에이전트명으로 시작하는 운영 에이전트가 있는지 확인
    const hasMatch = operationalAgents.some(agent => {
      const cleaned = agent.replace(/\s*\(통합\)\s*/, '').replace(/\s*\(skill\)\s*/, '').trim();
      return cleaned === entry || cleaned.startsWith(entry + '/');
    });

    if (!hasMatch) {
      warnings++;
      details.push({ agent: entry, status: 'WARNING', message: 'version.txt 테이블에 없음' });
    }
  }

  const pass = details.filter(d => d.status === 'FAIL').length === 0;
  return { pass, warnings, details };
}

// ────────────────────────────────────────
// Check 4: 버전 정합성
// ────────────────────────────────────────

/**
 * version.txt와 CLAUDE.md의 버전이 일치하는지 검증한다.
 * @returns {{ pass: boolean, versionTxt: string, claudeMd: string }}
 */
function checkVersionConsistency() {
  const versionPath = path.join(CLAUDE_DIR, 'version.txt');
  const claudeMdPath = path.join(PROJECT_ROOT, 'CLAUDE.md');

  // version.txt 버전 추출
  const versionContent = safeReadFile(versionPath);
  let versionTxt = '';
  if (!versionContent) {
    return { pass: false, versionTxt: 'version.txt 파일 없음', claudeMd: '' };
  }

  const versionMatch = versionContent.match(/^## 현재 버전:\s*(\d+\.\d+\.\d+)/m);
  if (versionMatch) {
    versionTxt = versionMatch[1];
  } else {
    return { pass: false, versionTxt: '버전 형식을 파싱할 수 없음', claudeMd: '' };
  }

  // CLAUDE.md 버전 추출
  const claudeContent = safeReadFile(claudeMdPath);
  let claudeMd = '';
  if (!claudeContent) {
    return { pass: false, versionTxt, claudeMd: 'CLAUDE.md 파일 없음' };
  }

  const claudeMatch = claudeContent.match(/# nepes-ai-agents v(\d+\.\d+\.\d+)/);
  if (claudeMatch) {
    claudeMd = claudeMatch[1];
  } else {
    return { pass: false, versionTxt, claudeMd: '버전 형식을 파싱할 수 없음' };
  }

  const pass = versionTxt === claudeMd;
  return { pass, versionTxt, claudeMd };
}

// ────────────────────────────────────────
// Check 5: check-output-convention.js PostToolUse 등록 확인
// ────────────────────────────────────────

/**
 * hooks 섹션 배열에서 특정 커맨드 문자열을 포함하는 항목을 찾는다.
 * @param {Array} section - hooks 섹션 배열 (e.g. PostToolUse)
 * @param {string} keyword - 검색할 커맨드 키워드
 * @param {string} [matcher] - matcher 필터 (지정 시 해당 matcher만 검색)
 * @returns {boolean}
 */
function findHookInSection(section, keyword, matcher) {
  if (!Array.isArray(section)) return false;
  for (const item of section) {
    if (!item || typeof item !== 'object') continue;
    if (matcher && item.matcher !== matcher) continue;
    if (!Array.isArray(item.hooks)) continue;
    for (const hook of item.hooks) {
      if (!hook) continue;
      if (hook.command && hook.command.includes(keyword)) return true;
    }
  }
  return false;
}

/**
 * settings.json의 hooks.PostToolUse 배열에서
 * 'Write|Edit' matcher에 check-output-convention.js가 포함되어 있는지 검증한다.
 * @param {object} [cachedSettings] - 이미 파싱된 settings 객체 (없으면 직접 읽음)
 * @returns {{ pass: boolean, message: string }}
 */
function checkOutputConventionHook(cachedSettings) {
  let settings = cachedSettings;

  if (!settings) {
    const settingsPath = path.join(CLAUDE_DIR, 'settings.json');
    const settingsContent = safeReadFile(settingsPath);
    if (!settingsContent) {
      return { pass: false, message: 'settings.json 파일을 읽을 수 없습니다' };
    }
    try {
      settings = JSON.parse(settingsContent);
    } catch (e) {
      return { pass: false, message: `settings.json 파싱 실패: ${e.message}` };
    }
  }

  const postToolUse = settings.hooks && settings.hooks.PostToolUse;
  if (!Array.isArray(postToolUse)) {
    return { pass: false, message: 'hooks.PostToolUse 섹션이 없거나 배열이 아닙니다' };
  }

  // Write|Edit matcher에 check-output-convention.js가 있는지 확인
  if (findHookInSection(postToolUse, 'check-output-convention.js', 'Write|Edit')) {
    return { pass: true, message: 'PostToolUse Write|Edit 에 등록됨' };
  }

  // PreToolUse에 잘못 등록되었는지 확인
  const preToolUse = settings.hooks && settings.hooks.PreToolUse;
  if (findHookInSection(preToolUse, 'check-output-convention.js')) {
    return { pass: false, message: 'PreToolUse에 잘못 등록됨 (PostToolUse Write|Edit 으로 이동 필요)' };
  }

  return { pass: false, message: 'check-output-convention.js가 PostToolUse Write|Edit 에 등록되지 않음' };
}

// ────────────────────────────────────────
// 메인 실행
// ────────────────────────────────────────

function main() {
  console.log(' 연동 무결성 검증 시작...');
  console.log('');

  // settings.json을 한 번만 파싱해 Check 1, Check 5에서 공유
  let cachedSettings = null;
  const settingsContent = safeReadFile(path.join(CLAUDE_DIR, 'settings.json'));
  if (settingsContent) {
    try { cachedSettings = JSON.parse(settingsContent); } catch (e) {
      console.warn(`  [경고] settings.json 파싱 실패: ${e.message}`);
    }
  }

  let totalPass = 0;
  let totalFail = 0;

  // ── Check 1 ──
  console.log('[Check 1] Hook/유틸리티 연동');
  const check1 = checkHookIntegration();
  const check1Fails = check1.details.filter(d => d.status === 'FAIL').length;
  for (const d of check1.details) {
    const icon = d.status === 'PASS' ? '\u2705' : '\u274C';
    console.log(`  ${icon} ${d.file} -> ${d.ref}`);
    if (VERBOSE && d.allRefs && d.allRefs.length > 1) {
      for (const ref of d.allRefs) {
        console.log(`      - ${ref}`);
      }
    }
  }
  if (check1.pass) {
    console.log('  결과: PASS');
    totalPass++;
  } else {
    console.log(`  결과: FAIL (${check1Fails}건)`);
    totalFail++;
  }
  console.log('');

  // ── Check 2 ──
  console.log('[Check 2] Commands -> Agents 참조');
  const check2 = checkCommandAgentRefs();
  const check2Fails = check2.details.filter(d => !d.exists).length;
  for (const d of check2.details) {
    const icon = d.exists ? '\u2705' : '\u274C';
    console.log(`  ${icon} ${d.command} -> ${d.agent}`);
    if (VERBOSE && d.allPaths && d.allPaths.length > 0) {
      for (const p of d.allPaths) {
        console.log(`      - ${p}`);
      }
    }
  }
  if (check2.pass) {
    console.log('  결과: PASS');
    totalPass++;
  } else {
    console.log(`  결과: FAIL (${check2Fails}건)`);
    totalFail++;
  }
  console.log('');

  // ── Check 3 ──
  console.log('[Check 3] version.txt 에이전트 테이블');
  const check3 = checkAgentTable();
  const check3Fails = check3.details.filter(d => d.status === 'FAIL').length;
  const check3Passes = check3.details.filter(d => d.status === 'PASS').length;
  const check3Warnings = check3.warnings;

  for (const d of check3.details) {
    if (d.status === 'PASS' && !VERBOSE) continue;
    if (d.status === 'PASS') {
      console.log(`  \u2705 ${d.agent} -> ${d.message}`);
    } else if (d.status === 'FAIL') {
      console.log(`  \u274C ${d.agent} -> ${d.message}`);
    } else if (d.status === 'WARNING') {
      console.log(`  \u26A0\uFE0F ${d.agent} -> ${d.message}`);
    }
  }

  if (check3.pass) {
    if (check3Passes > 0) {
      console.log(`  \u2705 운영 에이전트 ${check3Passes}개 전수 일치`);
    }
    if (check3Warnings > 0) {
      console.log(`  결과: PASS (WARNING ${check3Warnings}건)`);
    } else {
      console.log('  결과: PASS');
    }
    totalPass++;
  } else {
    console.log(`  결과: FAIL (${check3Fails}건)`);
    totalFail++;
  }
  console.log('');

  // ── Check 4 ──
  console.log('[Check 4] 버전 정합성');
  const check4 = checkVersionConsistency();
  if (check4.pass) {
    console.log(`  \u2705 version.txt: ${check4.versionTxt} = CLAUDE.md: ${check4.claudeMd}`);
    console.log('  결과: PASS');
    totalPass++;
  } else {
    console.log(`  \u274C version.txt: ${check4.versionTxt} / CLAUDE.md: ${check4.claudeMd}`);
    console.log('  결과: FAIL');
    totalFail++;
  }
  console.log('');

  // ── Check 5 ──
  console.log('[Check 5] check-output-convention.js PostToolUse 등록');
  const check5 = checkOutputConventionHook(cachedSettings);
  if (check5.pass) {
    console.log(`  \u2705 ${check5.message}`);
    console.log('  결과: PASS');
    totalPass++;
  } else {
    console.log(`  \u274C ${check5.message}`);
    console.log('  결과: FAIL');
    totalFail++;
  }
  console.log('');

  // ── 종합 ──
  const total = totalPass + totalFail;
  const separator = '\u2550'.repeat(40);
  console.log(separator);
  if (totalFail === 0) {
    console.log(` 종합: PASS (${totalPass}/${total})`);
  } else {
    console.log(` 종합: FAIL (${totalFail}건 발견)`);
  }
  console.log(separator);

  process.exit(totalFail > 0 ? 1 : 0);
}

main();
