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
echo [0/7] 기존 파일 백업 (_backup, 직전 1세대만 유지)...
if exist "%BACKUP%" rmdir /S /Q "%BACKUP%" >nul
mkdir "%BACKUP%"
for %%F in (commands agents hooks scripts log-analyzer skills) do (
    if exist "%TARGET%\%%F" (
        xcopy /E /Y /I /Q "%TARGET%\%%F" "%BACKUP%\%%F" >nul 2>&1
    )
)
echo       OK

echo [1/7] commands 배포...
xcopy /E /Y /I "%SOURCE%\commands" "%TARGET%\commands" >nul
echo       OK

echo [2/7] agents 배포...
xcopy /E /Y /I "%SOURCE%\agents" "%TARGET%\agents" >nul
echo       OK

echo [3/7] hooks 배포...
xcopy /E /Y /I "%SOURCE%\hooks" "%TARGET%\hooks" >nul
echo       OK

echo [4/7] scripts 배포...
xcopy /E /Y /I "%SOURCE%\scripts" "%TARGET%\scripts" >nul
echo       OK

echo [5/7] log-analyzer 배포...
xcopy /E /Y /I "%SOURCE%\log-analyzer" "%TARGET%\log-analyzer" >nul
echo       OK

echo [6/7] skills 배포 (itsm-register 등 개인 skill은 보존)...
if exist "%SOURCE%\skills" (
    for /d %%D in ("%SOURCE%\skills\*") do (
        xcopy /E /Y /I "%%D" "%TARGET%\skills\%%~nxD" >nul
    )
)
echo       OK

echo [7/7] settings.json + .mcp.json + CLAUDE.md 병합...
node "%SCRIPTDIR%install-merge.js" "%SOURCE%" "%TARGET%" "%SCRIPTDIR%CLAUDE.md"
if errorlevel 1 (
    echo       [ERROR] 병합 실패. node.js가 설치되어 있는지 확인하세요.
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
