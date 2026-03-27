@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ============================================
echo  nepes-ai-agents 전역 설치
echo ============================================
echo.

set "TARGET=%USERPROFILE%\.claude"
set "SOURCE=%~dp0.claude"
set "SCRIPTDIR=%~dp0"

:: 소스 디렉토리 확인
if not exist "%SOURCE%" (
    echo [ERROR] .claude/ 디렉토리를 찾을 수 없습니다.
    echo         이 스크립트는 nepes-ai-agents 저장소 루트에서 실행해야 합니다.
    goto :end
)

:: 대상 디렉토리 생성
if not exist "%TARGET%" mkdir "%TARGET%"

:: 백업 (직전 1세대만 유지)
set "BACKUP=%TARGET%\_backup"
echo [0/2] 기존 파일 백업 (_backup, 직전 1세대만 유지)...
if exist "%BACKUP%" rmdir /S /Q "%BACKUP%" >nul
robocopy "%TARGET%" "%BACKUP%" /E /XD _backup /NFL /NDL /NJH /NJS >nul 2>&1
echo       OK

echo [1/2] .claude 전체 배포 (settings.json, settings.local.json 제외)...
robocopy "%SOURCE%" "%TARGET%" /E /XF settings.json settings.local.json /XD _backup /NFL /NDL /NJH /NJS >nul 2>&1
echo       OK

echo [2/3] settings.json + .mcp.json + CLAUDE.md 병합...
node "%SCRIPTDIR%install-merge.js" "%SOURCE%" "%TARGET%" "%SCRIPTDIR%CLAUDE.md"
if errorlevel 1 (
    echo       [ERROR] 병합 실패. node.js가 설치되어 있는지 확인하세요.
)

echo [3/3] 배포 검증...
node "%SCRIPTDIR%install-verify.js" "%SOURCE%" "%TARGET%"
if errorlevel 1 (
    echo       [WARNING] 일부 디렉토리가 배포되지 않았습니다. 위 메시지를 확인하세요.
)

echo.
echo ============================================
echo  설치 완료!
echo ============================================
echo.
echo  설치 경로: %TARGET%
echo.
echo  확인 사항:
echo  - settings.json 의 내용 확인
echo  - .mcp.json 의 기존 MCP 서버 보존 여부 확인
echo  - 백업 경로: %TARGET%\_backup (직전 1세대)
echo.

:end
echo.
echo 아무 키나 누르면 종료합니다...
pause >nul
