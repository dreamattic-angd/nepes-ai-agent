/**
 * install.bat에서 호출되는 설정 merge 스크립트.
 * Usage: node install-merge.js <sourceDir> <targetDir> [claudeMdPath]
 *
 * 전략: "사용자 기반 보존형 병합"
 * - settings.json: 사용자 설정 보존, 배포 키(statusLine, hooks)만 추가/갱신
 * - .mcp.json: 사용자 MCP 서버 보존, 배포 서버만 추가/갱신
 * - CLAUDE.md: 마커 구간만 교체/추가, 사용자 기존 내용 보존
 */
const fs = require('fs');
const path = require('path');

const sourceDir = process.argv[2];
const targetDir = process.argv[3];
const claudeMdPath = process.argv[4]; // 프로젝트 루트의 CLAUDE.md 경로

if (!sourceDir || !targetDir) {
    console.error('Usage: node install-merge.js <sourceDir> <targetDir> [claudeMdPath]');
    process.exit(1);
}

// settings.json에서 배포할 키 목록 (이 키만 추가/갱신, 나머지 사용자 설정은 보존)
const DEPLOY_KEYS = ['statusLine', 'hooks'];

function processJsonFile(filename, processFn) {
    const sourcePath = path.join(sourceDir, filename);
    const targetPath = path.join(targetDir, filename);

    if (!fs.existsSync(sourcePath)) {
        console.log(`  [SKIP] ${filename} - 소스 파일 없음`);
        return;
    }

    let existing = {};
    try {
        existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } catch (e) {
        // 파일이 없거나 파싱 실패 → 빈 객체로 시작
    }

    const deploy = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const result = processFn(existing, deploy);

    fs.writeFileSync(targetPath, JSON.stringify(result, null, 2));
    console.log(`  [OK] ${filename}`);
}

// 1. settings.json - 사용자 설정 기반, 배포 키(statusLine, hooks)만 추가/갱신
processJsonFile('settings.json', (existing, deploy) => {
    const result = { ...existing };

    for (const key of DEPLOY_KEYS) {
        if (!(key in deploy)) continue;

        if (key === 'hooks') {
            // hooks는 이벤트 레벨(PreToolUse, Notification 등) 병합
            // 사용자의 다른 이벤트 훅은 보존, 배포 이벤트만 추가/갱신
            result.hooks = { ...(existing.hooks || {}), ...deploy.hooks };
        } else {
            result[key] = deploy[key];
        }
    }

    return result;
});

// 2. .mcp.json - 배포 서버 기준으로 교체, 기존 사용자 서버 보존
processJsonFile('.mcp.json', (existing, deploy) => {
    const existingServers = (existing && existing.mcpServers) || {};
    const deployServers = (deploy && deploy.mcpServers) || {};

    return {
        mcpServers: { ...existingServers, ...deployServers }
    };
});

// 3. CLAUDE.md - 마커 구간만 교체/추가, 사용자 기존 내용 보존
const MARKER_START = '<!-- nepes-ai-agents:start -->';
const MARKER_END = '<!-- nepes-ai-agents:end -->';

function mergeClaudeMd(claudeMdSource, targetDir) {
    if (!claudeMdSource) return;

    const targetPath = path.join(targetDir, 'CLAUDE.md');
    const backupPath = path.join(targetDir, 'CLAUDE_BU.md');

    if (!fs.existsSync(claudeMdSource)) {
        console.log('  [SKIP] CLAUDE.md - 소스 파일 없음');
        return;
    }

    const deployContent = fs.readFileSync(claudeMdSource, 'utf8');

    // 배포 파일에 마커가 없으면 경고
    if (!deployContent.includes(MARKER_START) || !deployContent.includes(MARKER_END)) {
        console.log('  [WARN] CLAUDE.md - 배포 파일에 마커가 없습니다. 그대로 복사합니다.');
        fs.writeFileSync(targetPath, deployContent);
        console.log('  [OK] CLAUDE.md');
        return;
    }

    // 기존 파일이 없으면 그대로 복사
    if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, deployContent);
        console.log('  [OK] CLAUDE.md (신규)');
        return;
    }

    const existingContent = fs.readFileSync(targetPath, 'utf8');

    // 기존 파일에 마커가 있으면 → 마커 구간만 교체
    if (existingContent.includes(MARKER_START) && existingContent.includes(MARKER_END)) {
        const before = existingContent.substring(0, existingContent.indexOf(MARKER_START));
        const after = existingContent.substring(existingContent.indexOf(MARKER_END) + MARKER_END.length);
        const result = before + deployContent.trim() + after;
        fs.writeFileSync(targetPath, result);
        console.log('  [OK] CLAUDE.md (마커 구간 갱신, 사용자 내용 보존)');
        return;
    }

    // 기존 파일에 마커가 없음 → 사용자 전용 파일 → 백업 + 병합
    fs.writeFileSync(backupPath, existingContent);
    console.log('  [BACKUP] CLAUDE.md → CLAUDE_BU.md');

    const merged = existingContent.trimEnd() + '\n\n' + deployContent.trim() + '\n';
    fs.writeFileSync(targetPath, merged);
    console.log('  [OK] CLAUDE.md (기존 내용 보존 + 배포 내용 추가)');
}

mergeClaudeMd(claudeMdPath, targetDir);
