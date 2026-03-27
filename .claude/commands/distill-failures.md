# 실패 패턴 증류

반복 실패 패턴을 CLAUDE.md 영구 규칙으로 승격하고, 원본 로그를 정리한다.

## 자동 트리거

git-workflow 실행 시 마지막 증류 날짜를 자동으로 확인한다.
**14일 이상 경과** 시 워크플로우 진입 전에 이 커맨드를 자동 실행한다.
수동 실행도 가능: `/distill-failures`

## 확증 편향 방지 원칙

1. **verified: true인 패턴만 승격 가능** — 미검증 가설은 CLAUDE.md에 올라가지 않는다
2. **사용자(인간) 검토 필수** — 자동 승격 없음. 조건이 정확한지, 지금도 유효한지 확인
3. **만료된 레코드 자동 제외** — expires가 지난 패턴은 후보에서 제외
4. **프로젝트별 격리** — 각 프로젝트의 실패/성공 기록은 project 필드로 구분, 교차 오염 방지

## 절차

### 0단계: 프로젝트 감지

현재 프로젝트를 감지한다. `git remote get-url origin`에서 repo명을 추출하여 프로젝트 식별자를 결정한다:
- `nepes-ai-agents` → NEPES_AI_AGENTS
- `RMSSERVER` → RMSSERVER
- `YTAP` → YTAP
- `APP_RMSPAGE` → APP_RMSPAGE
- `Web_rmspage` → WEB_RMSPAGE
- `YTAP_MANAGER` → YTAP_MANAGER

감지된 프로젝트를 이후 모든 단계에서 필터로 사용한다.

### 1단계: 마지막 실행일 기록 확인 및 만료 아카이브

마지막 증류 실행일을 확인한다:

```bash
node -e "const fs=require('fs'),p=require('path'),f=p.join(process.env.USERPROFILE||process.env.HOME,'.claude','logs','distill-last-run.json'); if(!fs.existsSync(f)){console.log('__NEVER_RUN__')}else{const d=JSON.parse(fs.readFileSync(f,'utf8')); console.log(JSON.stringify(d))}"
```

- **`__NEVER_RUN__`** → 첫 실행. 진행
- **데이터 있음** → 마지막 실행일로부터 경과일 계산. 14일 미만이면 "증류가 {N}일 전에 실행되었습니다. 건너뜁니다." 출력 후 종료 (단, 수동 실행 시에는 무시하고 계속 진행)

만료된 실패 레코드를 아카이브 처리한다:

```bash
node -e "const fl=require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js'); const r=fl.archiveExpired(); console.log(JSON.stringify(r));"
```

### 2단계: 미검증 가설 검토 요청

현재 프로젝트의 미검증(verified: false) 패턴 목록을 출력하여 사용자 검토를 요청한다:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const u=fr.getUnverifiedPatterns({sinceDays:30, project:'{PROJECT}'}); if(u.length===0) console.log('__NO_UNVERIFIED__'); else console.log(JSON.stringify(u,null,2));"
```

- **`__NO_UNVERIFIED__`** → "미검증 가설이 없습니다." 출력 후 3단계로 진행
- **미검증 패턴이 있으면** → 표 형태로 보여주고 검증 여부를 확인한다:

```
📋 [{PROJECT}] 미검증 실패 가설 (사용자 검토 필요)

아래 패턴은 아직 가설 상태입니다. 각 항목의 조건이 정확한지, 교훈이 유효한지 확인해주세요.

| # | 유형 | 반복 | 조건 | 교훈 | 검증? |
|---|------|------|------|------|-------|
| 1 | {type} | {count}회 | {condition 또는 '조건 미기록'} | {lesson 또는 cause} | Y/N |

검증할 패턴 번호를 선택하세요 (쉼표 구분, 'skip'으로 건너뛰기):
```

⛔ **반드시 사용자 응답을 기다린다.**

- **`skip`** → 검증 없이 3단계로 진행
- **번호 선택** → 선택된 패턴을 verified: true로 변경:

```bash
node -e "const fl=require(process.env.USERPROFILE+'/.claude/hooks/failure-logger.js'); const r=fl.setVerified('{failureType}', '{subType}', true, '{PROJECT}'); console.log(JSON.stringify(r));"
```

### 3단계: 증류 후보 조회

현재 프로젝트에서 최근 30일간 3회 이상 반복 + verified: true인 패턴을 조회한다:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const c=fr.getDistillCandidates({project:'{PROJECT}'}); if(c.length===0) console.log('__NO_CANDIDATES__'); else console.log(JSON.stringify(c,null,2));"
```

- **`__NO_CANDIDATES__`** → "증류할 패턴이 없습니다." 출력 후 5단계(실행일 기록)로 진행
- **후보가 있으면** → 4단계로 진행

### 4단계: 사용자 확인 및 CLAUDE.md 승격

후보 패턴을 표 형태로 보여주고 승격 여부를 확인한다:

```
📋 [{PROJECT}] 증류 후보 패턴 (3회 이상 반복 + 검증됨)

| # | 유형 | 반복 횟수 | 조건 | 교훈 | 예방 제안 |
|---|------|----------|------|------|----------|
| 1 | {failureType/subType} | {count}회 | {condition} | {lesson} | {suggestedPrevention} |

승격할 패턴 번호를 선택하세요 (쉼표 구분, 'all' 또는 'none'):
```

⛔ **반드시 사용자 응답을 기다린다.**

- **`none`** → "증류를 건너뜁니다." 출력 후 5단계로 진행
- **번호 또는 `all`** → 선택된 패턴을 CLAUDE.md에 추가:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const c=fr.getDistillCandidates({project:'{PROJECT}'}); const text=fr.formatDistillRules(c); console.log(text);"
```

**프로젝트 CLAUDE.md** (저장소 내 `CLAUDE.md`)에서 `## 실패 방지 규칙` 섹션을 찾는다:
- **섹션이 있으면** → 기존 규칙 아래에 새 규칙 추가 (중복 확인)
- **섹션이 없으면** → 파일 끝에 새 섹션 생성

규칙을 추가하기 전에 사용자에게 추가될 내용을 보여주고 확인을 받는다.

승격된 패턴의 원본 레코드를 제거:

```bash
node -e "const fr=require(process.env.USERPROFILE+'/.claude/hooks/failure-registry.js'); const r=fr.purgeDistilled('{failureType}', '{subType}', '{PROJECT}'); console.log(JSON.stringify(r));"
```

### 5단계: 실행일 기록 및 결과 보고

마지막 실행일을 기록한다:

```bash
node -e "const fs=require('fs'),p=require('path'),d=p.join(process.env.USERPROFILE||process.env.HOME,'.claude','logs'); if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true}); const f=p.join(d,'distill-last-run.json'); const prev=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{}; prev['{PROJECT}']=new Date().toISOString().slice(0,10); fs.writeFileSync(f,JSON.stringify(prev,null,2),'utf8'); console.log('saved:',prev['{PROJECT}']);"
```

```
✅ [{PROJECT}] 실패 패턴 증류 완료

만료 아카이브: {archived}건
검증 처리: {verified}건
승격된 패턴: {N}건
- {failureType/subType}: {count}회 [조건: {condition}] → CLAUDE.md 규칙으로 승격
정리된 로그: {total removed}건 삭제, {total kept}건 유지
다음 자동 실행: {14일 후 날짜}
```
