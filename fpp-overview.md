# FDC Portal — 시스템 개요 문서

> 작성일: 2026-04-16  
> 대상: 프로젝트 참여자, 신규 팀원, 내부 기술 검토자  
> 저장소: https://ngit.nepes.co.kr/FA_Part/fdc_portal.git

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [주요 기능](#4-주요-기능)
5. [디렉토리 구조](#5-디렉토리-구조)
6. [데이터베이스 설계](#6-데이터베이스-설계)
7. [백엔드 — Python FastAPI](#7-백엔드--python-fastapi)
8. [프론트엔드 — Next.js](#8-프론트엔드--nextjs)
9. [SPC 엔진](#9-spc-엔진)
10. [PCA 챔버 건강](#10-pca-챔버-건강)
11. [AI 챗 기능](#11-ai-챗-기능)
12. [ETL 파이프라인](#12-etl-파이프라인)
13. [인증 및 보안](#13-인증-및-보안)
14. [API 엔드포인트 목록](#14-api-엔드포인트-목록)
15. [배포 및 운영](#15-배포-및-운영)
16. [테스트 전략](#16-테스트-전략)
17. [핵심 규칙 및 제약사항](#17-핵심-규칙-및-제약사항)
18. [용량 계획](#18-용량-계획)
19. [향후 로드맵](#19-향후-로드맵)

---

## 1. 프로젝트 개요

**FDC Portal**은 Nepes 반도체 공장의 **Fault Detection & Classification(FDC) 플랫폼**입니다. 실시간 장비 모니터링, SPC 통계 분석, PCA 챔버 건강 진단, AI 에이전트를 통한 지능형 운영 지원을 제공하는 내부 웹 포털입니다.

### 목적

- 플릿(Fleet) 내 모든 장비의 **이상 상태를 한눈에 모니터링**
- **SPC(Statistical Process Control)** 알고리즘으로 공정 이탈 자동 감지
- **로트(Lot) 여정 추적**으로 불량 원인 분석
- **AI 챗**을 통한 자연어 기반 장비·공정 분석 (24개 FDC 도구)
- **PCA(주성분 분석)** 기반 챔버-간(C2C) 건강 상태 모니터링

### 연동 시스템

| 시스템 | 역할 | 비고 |
|--------|------|------|
| Oracle EES (NEPESDB1) | 장비 트레이스 데이터 원천 | BISTel EES, gzip BLOB, CP949 |
| Oracle CCUBE | MES 로트·레시피·챔버 매핑 | 읽기 전용 |
| TimescaleDB 2.26 | 시계열 저장소 (분석 DB) | PostgreSQL 17 + 하이퍼테이블 |
| Gemini 2.0 Flash / 3.0 Pro | AI 챗 기본 제공자 | 회사 프록시 → Google 직접 폴백 |
| Anthropic Claude Sonnet | AI 챗 대체 제공자 | 최종 폴백 |
| Microsoft Entra ID | 사용자 인증 (SSO) | NextAuth.js v5 |

### 운영 규모 (2026-04 기준)

| 항목 | 현황 |
|------|------|
| 모니터링 장비 | 77개 (NS2 팹) |
| DCP (Data Collection Point) | 53개 |
| 일일 수집 행수 | ~6,300만 행 (~21 GB raw) |
| DB 누적 행수 | ~60억 행 |
| DB 저장 용량 | ~420 GB (42% / 1 TB SATA) |
| TimescaleDB 압축률 | ~400K:1 |

---

## 2. 기술 스택

### 프론트엔드

| 항목 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.1.6 |
| UI 라이브러리 | React | 19.2.3 |
| 언어 | TypeScript | 5.x (strict mode) |
| 스타일링 | CSS Modules + 디자인 토큰 (다크/라이트) | — |
| 폰트 | Pretendard CDN | v1.3.9 |
| 마크다운 | react-markdown, remark-gfm | 10.1.0 / 4.0.1 |
| 인증 | NextAuth.js | 5.0.0-beta.30 |
| AI SDK (Google) | @google/genai | 1.48.0 |
| AI SDK (Anthropic) | @anthropic-ai/sdk | 0.80.0 |

### 백엔드

| 항목 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | FastAPI + uvicorn | 최신 |
| 언어 | Python | 3.11+ |
| 패키지 관리 | uv | — |
| DB 드라이버 | psycopg2 (ThreadedConnectionPool 20) | — |
| Oracle 드라이버 | oracledb Thick Mode | 19.25 |
| 수치 계산 | numpy, scipy | — |
| 클러스터링 | scikit-learn (DBSCAN) | — |
| 변점 감지 | ruptures (PELT) | — |

### 데이터베이스

| DB | 역할 |
|----|------|
| PostgreSQL 17 + TimescaleDB 2.26 | 시계열 저장 (하이퍼테이블, 압축, 연속 집계) |
| Oracle 11g NEPESDB1 | 장비 이벤트 BLOB (EES, 읽기 전용) |
| Oracle CCUBE | MES 로트 이력·레시피·챔버 매핑 (읽기 전용) |

### 인프라 & 배포

| 항목 | 기술 |
|------|------|
| 서비스 관리 | systemd (5개 서비스) |
| 역방향 프록시 | nginx (HTTPS + TLS) |
| 운영 서버 | Linux (Ubuntu 24.04 LTS, 192.168.100.230) |
| 테스트 (E2E) | Playwright |
| 테스트 (단위) | Vitest (TS) / pytest (Python) |

---

## 3. 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│ 클라이언트 (브라우저)                                              │
│  - 사내: https://fdc.nepes.co.kr  (Azure SSO 필수)              │
│  - 개발: http://localhost:3000     (SSO 바이패스)                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (nginx reverse proxy)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ Next.js Portal (:3000)                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 페이지: Fleet / History / Compare / Trace / Analytics   │   │
│  │         Agents                                           │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ API Routes                                               │   │
│  │  - /api/auth/[...nextauth]  (Azure AD OAuth callback)   │   │
│  │  - /api/chat                (AI 스트리밍 SSE)            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ Middleware: auth check + /api/v1/* → :8100 rewrite      │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ /api/v1/* 프록시
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│ FastAPI 백엔드 (:8100)                                           │
│  - 48개 REST 엔드포인트                                           │
│  - ThreadedConnectionPool (psycopg2, 20 connections)            │
│  - CORS: localhost:3000, 192.168.100.230:3000                   │
│  - Swagger UI: /docs                                             │
└──────────────────┬─────────────────────┬────────────────────────┘
                   │                     │
                   ▼                     ▼
          ┌──────────────┐     ┌──────────────────────┐
          │ TimescaleDB  │     │ Oracle DB (읽기 전용) │
          │ (tsdb:5432)  │     │  - NEPESDB1 (EES)    │
          │ - svid_trace │     │  - CCUBE (MES)        │
          │ - svid_spc_* │     └──────────────────────┘
          │ - equipment  │              ▲
          │ - pca_*      │              │ ETL
          └──────┬───────┘              │
                 ▲                      │
                 └──────────────────────┘
                        ▲
          ┌─────────────────────────────────────┐
          │ 백그라운드 서비스 (systemd / cron)   │
          │  fdc-extractor  (Oracle→TimescaleDB) │
          │  spc-runner     (60s poll, SPC 배치) │
          │  fdc-pca        (15min, PCA 배치)    │
          │  seed-baselines (hourly cron ×3)     │
          │  alarm-review   (3x/day cron)        │
          └─────────────────────────────────────┘
```

### 배포 환경 비교

| 항목 | Production (linux-server) | Development (로컬 PC) |
|------|--------------------------|----------------------|
| Portal URL | https://fdc.nepes.co.kr | http://localhost:3000 |
| Portal 빌드 | `next build` + systemd | `next build` + `next start` |
| API URL | :8100 (내부, CORS) | :8100 via SSH 터널 |
| DB | 192.168.100.230:5432 | 공유 (동일) |
| 인증 | Azure AD SSO (필수) | localhost 바이패스 |
| nginx | TLS + reverse proxy | 없음 |

### Next.js API 리라이트

`next.config.ts`에서 `/api/v1/*` 요청을 FastAPI로 프록시합니다.

```typescript
rewrites: [{ source: '/api/v1/:path*', destination: 'http://localhost:8100/api/v1/:path*' }]
```

---

## 4. 주요 기능

### 4.1 Fleet Monitor (장비 현황, `/fdc`)

- **Equipment 탭**: 77개 장비 카드 그리드
  - 키워드 검색, 공정 타입 필터 (Sputter / Plating / Coating / Developer / Etch / Bake / 기타)
  - FAB 선택 (ALL / NS1 / NS2)
  - 장비 상태 도트: RUN(초록) / IDLE(노랑) / DOWN(빨강) / UNKNOWN(회색)
  - OOC / OOS / PCA 배지 → 클릭 시 Trace Viewer 딥링크
  - AI 채팅 버튼 (장비 맥락 자동 포함)
  - 30초 자동 새로고침
- **OOC/OOS 탭**: 주간 리포트
  - OOC rate, OOS rate 추이 차트
  - 장비 히트맵 (CV-band 기반)
  - Top 장비 / SVID 랭킹
  - CSV 내보내기

### 4.2 History Explorer (이력 조회, `/fdc/history`)

- 좌측 패널: 장비 선택 → 시간 범위 (8h / 24h / 3d / 7d) → 해상도 (auto / raw / 1min / 15min) → Lot / Recipe 필터 → SVID 체크리스트
- 우측 Canvas 시계열 차트 (10K+ 포인트 성능 보장)
- 하단 PCA 패널 (T² / SPE 챔버 건강)
- 내보내기: PNG + CSV

### 4.3 Compare Tool (비교 분석, `/fdc/compare`)

#### Manual Overlay 탭
- 3개 모드: Time Series / By Recipe / By SVID
- 2~8개 소스 추가 가능
- 크로스 장비 SVID 오버레이
- CSV 내보내기

#### Fleet Analysis 탭 (동적 분석)
- **Health Scorecard**: 장비별 건강도 점수 (편차, OOC%, OOS, 챔버 Δ)
- **Alarm Pareto**: 알람 파레토 분포 (장비 → SVID 드릴다운)
- **Cross-C2C**: 공정별 챔버 간 자동 비교 (20개 챔버 패턴, 7개 패밀리)
- Auto-grouping: Jaccard 유사도 + 계층 클러스터링

### 4.4 Trace Viewer (추적 조회, `/fdc/trace`)

- **Lot 검색**: CCUBE MES 기반 로트 자동완성
- **Lot Journey**: BPMN 스타일 장비 스텝 DAG
  - 챔버별 체류 시간 + 웨이퍼 수
  - Companion lot 자동 감지
- **4개 뷰 모드**:
  1. **Detail**: 시계열 + 레시피/단계 오버레이
  2. **Substrates**: 기판 간 비교
  3. **Lots**: 유사 Lot 간 비교
  4. **SPC**: 제어 차트 (scroll-to-zoom, baseline simulation, alarm table)
- **Alarm Sidebar** (`mode=alarms`): 장비별 OOS/OOC 목록

#### SpcTab 세부 기능

| 기능 | 설명 |
|------|------|
| CV-band 배지 | Noise Floor / Stable / Dynamic / Multi-Modal / State Detection |
| Scroll-to-zoom | 마우스 휠로 시간 축 확대/축소 |
| Baseline simulation | Crosshair 드래그 → 고스트 UCL/LCL |
| Alarm table | 중복 제거, 복합 배지 (EWMA+R1+CS+ 등) |
| Hover highlights | 배지 호버 시 차트 해당 포인트 강조 |
| Spec limits overlay | 빨간 점선 (Oracle USL/LSL) |
| PELT changepoints | 수직 점선 표시 |
| Cluster SPC mode | ≥2 클러스터 자동 감지, 클러스터별 EWMA |

### 4.5 Analytics (AI Framework, `/fdc/analytics`)

- CV Decision Tree: CV 분류 로직 시각화
- 72개 Case Studies: 실제 불량 케이스 분석
- Evidence Matrix: 통계 신호 vs 물리적 원인
- Knowledge Pipeline: 공정 물리 규칙

### 4.6 Agents (에이전트, `/fdc/agents`)

- **Showcase**: fdc-cli 명령어 + MCP 서버 소개
- **Playground**: 18개 라이브 API 명령 직접 실행

### 4.7 AI Chat Panel

- **4개 진입점**: Fleet "AI" 버튼, Trace "Investigate", SPC "Ask AI", 전역 Chat FAB
- **24개 FDC 도구** (아래 11절 참조)
- **스트리밍**: Gemini SSE (120초 턴 타임아웃)
- **프리로드 데이터**: 알람 리뷰 (4h 캐시), SPC 요약, 챔버 정보
- **병렬 실행**: `Promise.all`로 복수 도구 동시 실행
- **CSV 내보내기**: 도구별 다운로드

---

## 5. 디렉토리 구조

```
fdc-portal/
├── app/                                   # Next.js 16 App Router
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth 핸들러 (Azure AD)
│   │   └── chat/
│   │       ├── route.ts                  # POST /api/chat (SSE 스트리밍)
│   │       └── lib/
│   │           ├── system-prompt.ts      # LLM 프롬프트 빌더 (3가지 scope)
│   │           ├── gemini-runner.ts      # Gemini 스트림 루프
│   │           ├── anthropic-runner.ts   # Anthropic 폴백 러너
│   │           ├── tool-executor.ts      # 도구 호출 + 결과 처리
│   │           ├── alarm-cache.ts        # 알람 리뷰 4h 캐시
│   │           └── case-study.ts         # 케이스 스터디 인덱싱
│   ├── fdc/
│   │   ├── page.tsx                      # Fleet Monitor (장비 카드 그리드)
│   │   ├── layout.tsx                    # FDC 탑바 (탭, FAB selector, Chat FAB)
│   │   ├── OocOosTab.tsx                 # OOC/OOS 집계 탭
│   │   ├── history/
│   │   │   ├── page.tsx                  # History Explorer
│   │   │   └── page.module.css
│   │   ├── compare/
│   │   │   ├── page.tsx                  # Manual Overlay 탭
│   │   │   └── FleetAnalysis.tsx         # Fleet Analysis (Scorecard, Pareto, C2C)
│   │   ├── trace/
│   │   │   ├── page.tsx                  # Trace Viewer (Lot journey + 4 modes)
│   │   │   ├── SpcTab.tsx                # SPC 제어 차트
│   │   │   ├── SpcChatPanel.tsx          # SPC AI 채팅
│   │   │   ├── AlarmSidebar.tsx          # Alarm quickfix 사이드바
│   │   │   ├── cluster-segments.ts       # 클러스터 기반 EWMA 세그먼트
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── components/
│   │   │   │   ├── JourneyBar.tsx        # Lot 여정 BPMN DAG
│   │   │   │   ├── SvidSidebar.tsx       # SVID 체크리스트
│   │   │   │   ├── CompareView.tsx       # Substrate/Lot 비교
│   │   │   │   └── TooltipCard.tsx       # 호버 툴팁
│   │   │   ├── hooks/
│   │   │   │   ├── useTraceData.ts       # Lot 데이터 + 필터 상태
│   │   │   │   └── useCanvasRenderer.ts  # Canvas 드로잉
│   │   │   └── types.ts                  # CSV 빌드 함수
│   │   ├── analytics/page.tsx            # AI Framework 쇼케이스 (정적)
│   │   └── agents/page.tsx               # Showcase + Playground
│   ├── components/
│   │   ├── ChatPanel.tsx                 # AI Chat 패널 (420px 좌측)
│   │   ├── CvBandBar.tsx                 # CV-band 스택 바 차트
│   │   ├── Modal.tsx                     # 재사용 가능 모달
│   │   └── Navbar.tsx                    # 상단 네비바 (logo + links)
│   ├── login/
│   │   └── page.tsx                      # 로그인 페이지 (오류 배너 포함)
│   ├── page.tsx                          # 홈 페이지 (카드 그리드)
│   ├── layout.tsx                        # Root layout (theme 선택)
│   ├── providers.tsx                     # SessionProvider
│   └── globals.css                       # 디자인 토큰 (다크/라이트 테마)
│
├── lib/                                   # 공유 유틸리티
│   ├── timeseries-client.ts             # FastAPI 클라이언트 (25+ 함수)
│   ├── types.ts                          # TypeScript 인터페이스 (100+ 타입)
│   ├── chat-context.ts                   # 4가지 Chat 컨텍스트 타입
│   ├── fdc-llm-format.ts                 # LLM 친화적 텍스트 포맷
│   ├── chamber-utils.ts                  # CCUBE 챔버 매핑
│   ├── chart-utils.ts                    # findNearestPoint, getProcessType
│   ├── use-fab.ts                        # FAB 선택 hook
│   ├── chat-csv.ts                       # Chat 도구별 CSV 빌드
│   ├── greeting.ts                       # Nepes 인사말 생성
│   └── normalize-fab.ts                  # FAB 정규화
│
├── auth.ts                               # NextAuth 설정 (Azure AD)
├── middleware.ts                         # 요청 라우팅 + 인증 미들웨어
├── next.config.ts                        # Next.js 설정 (API 프록시)
│
├── tooling/
│   └── extractor/                        # Python 백엔드
│       ├── api.py                        # FastAPI 메인 (48 엔드포인트)
│       ├── main.py                       # ETL CLI (폴링/백필/레지스트리 동기화)
│       ├── config.py                     # Oracle/CCUBE/TimescaleDB 설정
│       ├── blob_parser.py                # BLOB 파싱 (gzip + CP949 → JSON)
│       ├── oracle_reader.py              # Oracle 연결 + 조회
│       ├── timescale_writer.py           # TimescaleDB COPY 삽입
│       │
│       ├── spc_engine.py                 # EWMA, CUSUM, WECO 알고리즘
│       ├── spc_runner.py                 # SPC 배치 + OOS 스펙 체크
│       ├── spc_config.py                 # SPC 매개변수 + SVID 분류
│       ├── spc_baselines.py              # 베이스라인 해석 (adaptive window)
│       ├── cluster_segments.ts           # 클러스터 EWMA 세그먼트 (TS 미러)
│       │
│       ├── pca_engine.py                 # PCA: T²/SPE 스코어 + 기여도
│       ├── pca_runner.py                 # PCA 배치 실행
│       │
│       ├── alarm_helpers.py              # OOC/OOS 필터 + 이벤트 키
│       ├── fleet_alarm_review.py         # 3x/day 정기 알람 리뷰
│       ├── fleet_report.py               # /fleet/report 빌더
│       ├── ooc_oos.py                    # 주간 리포트
│       ├── t2t_analysis.py               # T2T 비교 (DBSCAN + Hotelling T²)
│       │
│       ├── bootstrap_baselines.py        # 베이스라인 시드 (raw → 1min)
│       ├── seed_step_baselines.py        # 스텝별 베이스라인 (hourly :15)
│       ├── seed_recipe_baselines.py      # 레시피별 베이스라인 (hourly :30)
│       ├── seed_cluster_baselines.py     # 클러스터 베이스라인 (hourly :45)
│       ├── changepoint_detector.py       # PELT 변화점 감지
│       ├── check_health_spec.py          # Health SVID 스펙 체크 (hourly :50)
│       │
│       ├── scripts/                      # 관리 스크립트 (16개+)
│       │   ├── sync_ccube_chambers.py
│       │   ├── sync_equipment.py
│       │   ├── backfill_*.py
│       │   └── classify_svids.py
│       │
│       ├── tests/
│       │   ├── test_api_contracts.py     # API 계약 + 필터 테스트
│       │   └── test_t2t_analysis.py      # T2T V2 (50개 테스트)
│       │
│       └── schema.sql                    # TimescaleDB 스키마
│
├── e2e/                                  # Playwright E2E 테스트
│   ├── fdc-portal.spec.ts               # 8개 테스트 (Fleet, History, Compare, Trace)
│   ├── spc.spec.ts                       # 19개 테스트 (API perf, SPC chart, nav)
│   ├── trace-interactions.spec.ts        # 7개 상호작용 테스트
│   ├── trace-resilience.spec.ts          # 4개 복원력 테스트
│   ├── oos-link.spec.ts                  # 6개 OOS/OOC 링크 테스트
│   └── helpers.ts                        # 테스트 유틸 (setTheme, coordClick)
│
├── __tests__/                            # Vitest 단위 테스트 (12개 파일)
│   ├── chart-utils.test.ts
│   ├── spc-tab.test.ts
│   ├── fdc-llm-format.test.ts
│   ├── api-integration.test.ts
│   ├── export-csv.test.ts
│   └── ...
│
├── docs/                                 # 설계 + 실행 계획
│   ├── fdc-portal-overview.md           # 이 문서
│   ├── fdc-tuning-reference.org         # 튜닝 파라미터 레퍼런스
│   ├── changelog.org                     # 변경 이력
│   ├── deployment-guide.md              # 배포 가이드
│   └── superpowers/
│       ├── specs/                        # 31개 기능 설계 문서
│       └── plans/                        # 25개 실행 계획
│
├── auth.ts                               # NextAuth 설정
├── middleware.ts                         # 요청 라우팅
├── package.json                          # npm 의존성
├── next.config.ts                        # Next.js 설정
├── tsconfig.json                         # TypeScript 설정
├── fdc-portal.service                    # systemd 서비스 유닛
└── README.org                            # 프로젝트 문서
```

---

## 6. 데이터베이스 설계

### 주요 테이블

#### `equipment` — 장비 메타데이터

| 컬럼 | 타입 | 설명 |
|------|------|------|
| eqp_id | TEXT PK | 장비 ID (예: SPU14, PLA36) |
| dcp_id | TEXT | DCP ID |
| model | TEXT | 장비 모델명 |
| campus | TEXT | 캠퍼스 (ns1campus / ns2campus) |
| status | TEXT | RUN / IDLE / DOWN / UNKNOWN |
| status_since | TIMESTAMPTZ | 상태 변경 시각 |
| current_lot_id | TEXT | 현재 처리 중인 로트 |
| current_recipe_id | TEXT | 현재 레시피 |

#### `svid_registry` — SVID 메타데이터

| 컬럼 | 타입 | 설명 |
|------|------|------|
| eqp_id + svid_name | PK | 복합 기본키 |
| variable_id | TEXT | 변수 ID |
| chamber | TEXT | 챔버 (A, B, C 등) |
| units | TEXT | 단위 (°C, V, A, sccm 등) |
| category | TEXT | `recipe` / `health` / `context` |
| alarm_lo / alarm_hi | FLOAT | 소프트 알람 한계 |

#### `svid_trace` — 원본 시계열 (Hypertable)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| ts | TIMESTAMPTZ | 타임스탬프 (파티션 키) |
| eqp_id | TEXT | 장비 ID |
| svid_name | TEXT | SVID 이름 |
| value | FLOAT | 측정값 |
| lot_id | TEXT | 로트 ID |
| recipe_id | TEXT | 레시피 ID |
| step_id | TEXT | 공정 스텝 |
| substrate_id | TEXT | 기판 ID |

> 청크 간격: 1일 / 압축 정책: 3일 후 / 파티션: `PDYYYYMMDD`

#### `svid_1min` / `svid_15min` — 연속 집계 (Continuous Aggregate)

- avg, min, max, stddev, sample_count 포함
- `svid_trace` 변경 시 자동 갱신
- 해상도 선택 기준: ≤1h → raw, ≤24h → 1min, >24h → 15min

#### `svid_spc_results` — SPC 결과 (Hypertable)

| 컬럼 | 설명 |
|------|------|
| ts | 타임스탬프 |
| eqp_id + svid_name | 식별자 |
| algorithm | `ewma` / `cusum` / `weco` / `spec` |
| statistic | SPC 통계값 |
| ucl / lcl | 제어 한계 |
| alarm | 알람 여부 (bool) |
| rule | 위반 규칙 (예: `weco_rule1`, `cusum_upper`) |
| effective_sigma | 베이스라인 σ |

> **OOS 알람의 유일한 소스**: `algorithm='spec'`

#### `svid_spc_baselines` — SPC 베이스라인

| 컬럼 | 설명 |
|------|------|
| eqp_id + svid_name + recipe_id | 키 |
| mu / sigma | 평균 / 표준편차 |
| n_samples | 샘플 수 |
| computed_at | 계산 시각 |
| cluster_id | 클러스터 ID (DBSCAN 결과) |

#### 기타 테이블

| 테이블 | 설명 |
|--------|------|
| `pca_results` | PCA T²/SPE 스코어 (Hypertable) |
| `pca_models` | PCA 모델 직렬화 (numpy) |
| `alarm_daily_summary` | 일별 알람 집계 |
| `lot_registry` | CCUBE 로트 캐시 |
| `recipe_registry` | 레시피 메타데이터 |

### 인덱스 전략

```sql
-- 시계열 핵심 쿼리
CREATE INDEX idx_svid_trace_eqp_svid_ts ON svid_trace (eqp_id, svid_name, ts DESC);
-- 로트 여정 추적
CREATE INDEX idx_svid_trace_lot ON svid_trace (lot_id, ts DESC);
-- SPC 알람 조회
CREATE INDEX idx_spc_results_eqp_ts ON svid_spc_results (eqp_id, ts DESC);
-- 장비 이벤트
CREATE INDEX idx_svid_events_eqp ON svid_events (eqp_id, ts DESC);
```

---

## 7. 백엔드 — Python FastAPI

### 모듈 구성

```
tooling/extractor/
├── api.py              FastAPI 서버 진입점 (48 엔드포인트)
├── main.py             ETL CLI (폴링/백필/레지스트리 동기화)
├── config.py           Oracle + TimescaleDB 연결 설정
│
├── [데이터 수집]
│   ├── oracle_reader.py      Oracle EES BLOB 페치
│   ├── blob_parser.py        BLOB 디코딩 (gzip + CP949)
│   └── timescale_writer.py   TimescaleDB COPY 삽입
│
├── [SPC 분석]
│   ├── spc_engine.py         알고리즘 (EWMA, CUSUM, WECO, PELT)
│   ├── spc_runner.py         배치 처리 (53KB)
│   ├── spc_config.py         파라미터, SVID 분류
│   ├── spc_baselines.py      베이스라인 관리 (adaptive window)
│   ├── seed_step_baselines.py      스텝 기반 시더
│   ├── seed_recipe_baselines.py    레시피 기반 시더
│   └── seed_cluster_baselines.py   DBSCAN 클러스터 시더
│
├── [PCA 챔버 건강]
│   ├── pca_engine.py         T², SPE 계산 + 기여도 분석
│   └── pca_runner.py         배치 처리 (15분 poll)
│
├── [T2T 비교]
│   └── t2t_analysis.py       DBSCAN + Hotelling T² (V2)
│
├── [알람 & 리포트]
│   ├── alarm_helpers.py          OOC/OOS 필터 + 이벤트 키
│   ├── fleet_alarm_review.py     3x/day 자동 알람 리뷰
│   ├── fleet_report.py           /fleet/report 빌더
│   ├── ooc_oos.py                OOC/OOS 주간 리포트
│   ├── changepoint_detector.py   PELT 변점 감지
│   └── check_health_spec.py      Health SVID 스펙 체크
│
└── scripts/              관리 스크립트 (16개)
```

### SVID 분류 (`categorize_svid()`)

SVID는 3가지 카테고리로 분류됩니다.

| 카테고리 | 의미 | 예시 |
|---------|------|------|
| `recipe` | 공정 파라미터 (분석 대상) | 온도, 압력, 가스 유량 |
| `health` | 장비 건강 지표 | 냉각수 온도, 진공도 |
| `context` | 메타 정보 (분석 제외) | 로트 ID, 스텝 번호 |

> **반드시 `categorize_svid()`를 사용**. `is_svid_excluded()` 직접 호출 금지.

### 알람 리뷰 자동화

**파일**: `fleet_alarm_review.py`

- 하루 3회 cron 실행 (07:00, 15:00, 23:00 KST)
- OOC + OOS + suspect 스펙 한계 감지
- 3단계 자동 치유:
  1. **Annotate**: 알람에 주석 추가
  2. **Retire**: 만료된 베이스라인 폐기
  3. **Dispatch**: fdc-analytics YAML 플랜 실행
- 결과 4h 캐싱 (Gemini context 최적화)

---

## 8. 프론트엔드 — Next.js

### 페이지 구성

| 경로 | 이름 | 주요 기능 |
|------|------|---------|
| `/` | 홈 | 카드 그리드 (포털 진입점) |
| `/fdc` | Fleet Monitor | 장비 카드, OOC/OOS 탭, 실시간 상태 |
| `/fdc/history` | History Explorer | 시계열 + PCA 패널 + CSV 내보내기 |
| `/fdc/compare` | Compare Tool | Manual Overlay + Fleet Analysis |
| `/fdc/trace` | Trace Viewer | Lot Journey + 4 view modes + SPC |
| `/fdc/analytics` | Analytics | AI Framework 쇼케이스 (정적) |
| `/fdc/agents` | Agents | fdc-cli + Playground |
| `/login` | 로그인 | Azure AD SSO + 오류 배너 |

### 공통 컴포넌트

| 컴포넌트 | 설명 |
|---------|------|
| `ChatPanel.tsx` | AI Chat 패널 (420px 좌측, SSE 스트리밍) |
| `CvBandBar.tsx` | CV-band 스택 바 차트 |
| `Modal.tsx` | 재사용 가능 모달 |
| `Navbar.tsx` | 상단 네비바 (로고 + 링크) |

### 주요 Hook

| Hook | 설명 |
|------|------|
| `useTraceData` | Lot 데이터 + 필터 상태 관리 |
| `useCanvasRenderer` | Canvas 드로잉 (10K+ 포인트) |
| `use-fab` | FAB 선택 (URL + localStorage 동기화) |

### 상태 관리

- **URL 파라미터**: 주요 상태 (eqp_id, lot_id, svid, fab, mode 등)
- **localStorage**: FAB 선택, 테마 선택
- **React state**: 로컬 UI 상태 (필터, 체크리스트 등)
- **Session (NextAuth)**: 인증 정보 (JWT 쿠키)

### SpcTab 알람 하이라이트 규칙

| 배지 | 차트 강조 방식 |
|------|--------------|
| R1 (3σ 이탈) | UCL/LCL 영역 펄스 |
| R2/R4/R5 (WECO) | 중심선 + 폴리라인 |
| EWMA | UCL/LCL 펄스 + 채우기 |
| CS+ / CS− | 값 주석 + 방향 화살표 |
| OOS | USL/LSL 펄스 + 빨간 영역 |

---

## 9. SPC 엔진

### 알고리즘

#### EWMA (Exponentially Weighted Moving Average)

지수 가중 이동 평균으로 점진적 드리프트 감지.

```
z_t = λ × x_t + (1-λ) × z_{t-1}
UCL = μ + L × σ × √(λ/(2-λ))
LCL = μ - L × σ × √(λ/(2-λ))
파라미터: λ=0.2, L=3.0
```

#### CUSUM (Cumulative Sum)

누적 합산으로 작은 공정 이탈 감지.

```
C+ = max(0, C+_{t-1} + (x_t - μ)/σ - k)
C- = max(0, C-_{t-1} - (x_t - μ)/σ - k)
알람: C+ > h 또는 C- > h
파라미터: k=0.5, h=5.0
```

#### WECO (Western Electric Rules)

5가지 규칙 기반 패턴 감지:

| 규칙 | 조건 |
|------|------|
| Rule 1 | 3σ 초과 (단발 이탈) |
| Rule 2 | 9연속 동일 방향 |
| Rule 4 | 2/3가 2σ 초과 |
| Rule 5 | 4/5가 1σ 초과 |

#### PELT (Pruned Exact Linear Time)

변점(Changepoint) 감지 알고리즘.

- 베이스라인 드리프트 감지 및 자동 재설정 트리거
- SPC 차트에 수직 점선으로 표시
- 클러스터 SPC 모드 전환 신호

### 베이스라인 전략

| 유형 | 설명 | 크론 시각 |
|------|------|---------|
| 레시피 베이스라인 | 레시피별 30일 윈도우 | 매시 :30 |
| 스텝 베이스라인 | 레시피+스텝 계층화 | 매시 :15 |
| 클러스터 베이스라인 | DBSCAN 시간 클러스터링 | 매시 :45 |

**Adaptive window** (베이스라인 해석):
- 24h: 동적 스텝 (동일 recipe, 스텝별 샘플)
- 168h: 멀티 레시피 (혼합 샘플)
- 720h: 단일 레시피 (전체 기간)

### Cluster SPC 모드

```
1. DBSCAN으로 데이터 클러스터 할당
2. 클러스터별 독립 EWMA 세그먼트 계산
3. 클러스터 전환 시 ◇ 다이아몬드 마커 표시
4. WECO R4/R5 규칙은 클러스터 전환 구간 스킵
5. ≥2 클러스터 감지 시 자동 활성화
```

### OOC vs OOS 구분

| 분류 | 정의 | 데이터 소스 |
|------|------|-----------|
| **OOC** (Out of Control) | SPC 알람 위반 | `svid_spc_results` where `algorithm IN ('ewma','cusum','weco')` |
| **OOS** (Out of Spec) | 스펙 한계 위반 | `svid_spc_results` where `algorithm='spec'` |

> 이벤트 중복 제거: 동일한 `(eqp, svid, lot, substrate, recipe, step)` = 1개 이벤트로 집계.

---

## 10. PCA 챔버 건강

### 목적

챔버 간(C2C) 공정 균일도 모니터링. 특정 챔버가 fleet 평균에서 벗어나는 경우 조기 감지.

### 알고리즘

```
1. 입력: 챔버별 SVID 값 (최근 1시간, min 50 샘플, min 3 피처)
2. PCA 모델 학습 (scikit-learn)
3. Hotelling T² 스코어 계산 (다변량 이탈 감지)
4. SPE (Squared Prediction Error) 계산 (모델 외 변동)
5. 기여도 분석 (어떤 SVID가 이탈 원인인지)
6. 출력: pca_results 테이블 (ts, t2, spe, alarm, contributors)
```

### 시각화

- Fleet Monitor: PCA 배지 (T² / SPE 초과 시 강조)
- History Explorer: 하단 PCA 패널 (T²/SPE 시계열)
- Trace Viewer: 챔버별 건강 상태 표시
- Compare/Fleet Analysis: Cross-C2C 비교

---

## 11. AI 챗 기능

### 4개 진입점

| 위치 | 컨텍스트 |
|------|---------|
| Fleet Monitor "AI" 버튼 | 특정 장비 + fleet 알람 요약 |
| Trace Viewer "Investigate" | Lot + SVID + SPC 결과 |
| SPC Tab "Ask AI" | 해당 SVID SPC 분석 전체 |
| 전역 Chat FAB | 포털 전체 (사용자 질문 기반) |

### 24개 FDC 도구

| 도구명 | 설명 |
|--------|------|
| `spc` | SPC 제어 차트 데이터 쿼리 |
| `spc_baselines` | SPC 베이스라인 조회 |
| `spc_summary` | SPC 알람 요약 |
| `spc_context` | SPC 분석 컨텍스트 |
| `equipment_svids` | 장비 SVID 목록 |
| `query` | 시계열 원본 데이터 |
| `stats` | 통계 요약 |
| `spec_limits` | Oracle USL/LSL 스펙 한계 |
| `changepoints` | PELT 변점 목록 |
| `lot_history` | 로트 이력 비교 |
| `compare` | 장비 간 SVID 비교 |
| `recipe_compare` | 레시피 간 비교 |
| `fleet_alarm_summary` | 플릿 전체 알람 수 요약 |
| `alarm_review` | 정기 알람 리뷰 결과 |
| `chamber_health` | PCA 챔버 건강 현황 |
| `t2t_analysis` | T2T 비교 (DBSCAN 그룹핑) |
| `c2c_analysis` | 챔버 간 비교 분석 |
| `cross_c2c` | 공정별 교차 챔버 비교 |
| `health_scorecard` | 건강도 점수표 |
| `cluster_baselines` | 클러스터 베이스라인 정보 |
| `lot_genealogy` | 로트 계보 (split/merge/hold) |
| `case_study_search` | 72개 케이스 스터디 검색 |
| `fdc_reference` | FDC 레퍼런스 조회 |
| `fleet_report` | 통합 OOC/OOS 리포트 |

### 기술 구현

```
POST /api/chat
├── 시스템 프롬프트 빌드 (3가지 scope: fleet/equipment/lot)
│   ├── 알람 리뷰 캐시 (4h TTL)
│   ├── SPC 요약 프리로드
│   └── 챔버 정보 프리로드
│
├── Gemini 스트림 루프 (gemini-runner.ts)
│   ├── 도구 호출 감지 → tool-executor.ts
│   ├── 결과를 컨텍스트에 추가 → 다음 턴
│   └── 병렬 실행: Promise.all
│
├── 실패 시 Anthropic 폴백 (anthropic-runner.ts)
│
└── SSE 이벤트 스트림
    ├── event: text      → 텍스트 청크
    ├── event: tool-call → 도구 호출 표시
    ├── event: tool-result → 도구 결과
    └── event: error     → 오류 메시지
```

### 시스템 프롬프트 특징

- 한국어 대응 + "superstar!" 인사말
- 영문 기술 용어 유지 (SVID, OOC, OOS, UCL/LCL 등)
- Portal 딥링크 (상대 경로)
- 420px 좁은 패널 최적화 (간결한 표 형식)

---

## 12. ETL 파이프라인

### 데이터 수집 흐름

```
Oracle NEPESDB1 (EES)
  └── eqp_trace_trx_fdc 테이블 (gzip BLOB, CP949)
        │
        ▼ oracle_reader.py
  BLOB 페치 + 워터마크 추적 (마지막 ts 기준)
        │
        ▼ blob_parser.py
  gzip 압축 해제 → CP949 디코딩
  컬럼 CSV 파싱 → BISTel 마커 제거 (@^)
  챔버 이름 추출
  컬럼 → 행 pivot (zip_longest)
        │
        ▼ timescale_writer.py
  COPY 배치 삽입 (기본 5,000행)
        │
        ▼ TimescaleDB
  svid_trace (hypertable)
        │
        ▼ 자동 연속 집계 (TimescaleDB Continuous Aggregate)
  svid_1min, svid_15min
```

### SPC 처리 흐름 (60초 poll)

```
spc-runner 서비스
  1. svid_1min 최근 업데이트 로드
  2. Adaptive window로 베이스라인 추론
  3. EWMA / CUSUM / WECO / PELT 계산
  4. OOS 스펙 체크 (recipe-keyed)
  5. Cluster EWMA 세그먼트 (≥2 클러스터 시)
  6. svid_spc_results 저장 (timestamp, alarm flag, rule, ucl/lcl)
  7. svid_spc_baselines 업데이트 (필요 시)
```

### PCA 처리 흐름 (15분 poll)

```
fdc-pca 서비스
  1. svid_1min 챔버별 SVID 로드 (최근 1시간)
  2. PCA 모델 학습 (min 50 samples, 3 features)
  3. T²/SPE 스코어 계산
  4. 기여도 분석
  5. pca_results 저장
  6. pca_models 저장 (직렬화)
```

### ETL CLI 사용법

```bash
# 실시간 폴링 (연속)
python -m extractor.main --dcp PLA36_DCP,COA05_DCP

# 히스토리 백필
python -m extractor.main --backfill --start 20260221 --end 20260228

# SVID 레지스트리 동기화
python -m extractor.main --sync-registry --eqp PLA36

# 대량 백필 (재개 지원)
python -m extractor.backfill_all --start 20260203 --end 20260305 --resume
```

### 크론 작업 일정

| 시각 | 작업 | 파일 |
|------|------|------|
| 매시 :15 | 스텝 베이스라인 시더 | `seed_step_baselines.py` |
| 매시 :30 | 레시피 베이스라인 시더 | `seed_recipe_baselines.py` |
| 매시 :45 | 클러스터 베이스라인 시더 | `seed_cluster_baselines.py` |
| 매시 :50 | Health SVID 스펙 체크 | `check_health_spec.py` |
| 07:00 KST | OOC/OOS 알람 리뷰 | `fleet_alarm_review.py` |
| 15:00 KST | OOC/OOS 알람 리뷰 | `fleet_alarm_review.py` |
| 23:00 KST | OOC/OOS 알람 리뷰 | `fleet_alarm_review.py` |

---

## 13. 인증 및 보안

### 인증 모델

- **프로토콜**: OAuth 2.0 + OpenID Connect
- **제공자**: Microsoft Entra ID (Azure AD)
- **라이브러리**: NextAuth.js v5 (beta.30)
- **JWT**: Azure OIDC claims 포함 (oid, upn, preferred_username)
- **세션**: 암호화된 쿠키 (next-auth.session-token)

### 보호 범위

| URL 패턴 | 보호 여부 | 동작 |
|---------|---------|------|
| `/fdc/*` | Yes | 미인증 → `/login` 리다이렉트 |
| `/api/chat` | Yes | 미인증 → 401 JSON |
| `/` (홈) | No | 공개 페이지 |
| `/login` | No | NextAuth 로그인 페이지 |
| `/api/v1/*` (FastAPI 직접) | No | 내부 네트워크 전용, CLI/E2E 사용 |

### localhost 바이패스

개발 환경에서 Azure 인증을 스킵합니다.

```typescript
// middleware.ts
if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
  return NextResponse.next(); // auth 스킵
}
```

### 자격증명 관리

- **개발 (Mac)**: macOS Keychain + direnv
- **프로덕션 (Linux)**: `pass` (GPG store) + systemd `EnvironmentFile=`
- **코드**: 평문 자격증명 없음 (모든 env vars)

### 필수 환경 변수

```bash
# Oracle EES
NC_EES_PROD_USER=...
NC_EES_PROD_PASS=...
NC_EES_PROD_HOST=...

# Oracle CCUBE
CCUBE_DB_USER=...
CCUBE_DB_PASS=...
CCUBE_DB_HOST=...

# TimescaleDB
TSDB_HOST=...
TSDB_DBNAME=fdc
TSDB_USER=...
TSDB_PASSWORD=...

# Azure AD (NextAuth)
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...
AUTH_SECRET=...
AUTH_URL=https://fdc.nepes.co.kr

# LLM
GEMINI_API_KEY=...
GEMINI_BASE_URL=...     # 회사 프록시 (선택)
ANTHROPIC_API_KEY=...   # 폴백용
CHAT_MODEL=...          # 기본: gemini-2.0-flash

# Portal
NEXT_PUBLIC_FDC_API_URL=http://192.168.100.230:8100
FDC_API_INTERNAL_URL=http://localhost:8100
AUTH_TRUST_HOST=true
```

---

## 14. API 엔드포인트 목록

### 장비 & SVID (7개)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/equipment` | 전체 장비 목록 + SVID 수 |
| GET | `/api/v1/equipment/{id}/svids` | SVID 목록 + 분류 |
| GET | `/api/v1/equipment/{id}/chambers` | 챔버 목록 + CCUBE 매핑 |
| GET | `/api/v1/equipment/{id}/recipes` | 레시피 목록 (최근 3일) |
| GET | `/api/v1/equipment/{id}/lots` | Lot 목록 (CCUBE MES) |
| GET | `/api/v1/svid-categories` | SVID 카테고리 벌크 조회 |
| GET | `/health` | 헬스 체크 |

### 시계열 데이터 (5개)

| 메서드 | 경로 | 해상도 | 최대 윈도우 |
|--------|------|--------|-----------|
| GET | `/api/v1/query` | auto (≤1h: raw, ≤24h: 1min, >24h: 15min) | 7일 |
| GET | `/api/v1/compare` | 선택 가능 | — |
| GET | `/api/v1/stats/{id}` | — | — |
| GET | `/api/v1/stream/{id}` | raw (SSE) | 실시간 |
| GET | `/api/v1/lot-history` | — | — |

### SPC (7개)

| 메서드 | 경로 | 기본 윈도우 | 최대 윈도우 |
|--------|------|-----------|-----------|
| GET | `/api/v1/spc/{id}` | 24시간 | 168시간 |
| GET | `/api/v1/spc/{id}/baselines` | — | — |
| GET | `/api/v1/spc/{id}/summary` | — | — |
| GET | `/api/v1/spc/{id}/context` | — | — |
| GET | `/api/v1/equipment/{id}/changepoints` | — | — |
| POST | `/api/v1/spc/{id}/baselines/recompute` | — | — |
| POST | `/api/v1/spc/baselines/recover` | — | — |

### Lot & Trace (5개)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/lots` | Lot 목록 (시간 윈도우) |
| GET | `/api/v1/lot-svids` | Lot별 SVID |
| GET | `/api/v1/substrates` | 기판 ID 목록 |
| GET | `/api/v1/trace` | Lot Journey (방문 장비 목록) |
| GET | `/api/v1/lot/{lot_id}/genealogy` | Lot 계보 (split/merge/hold) |

### Fleet (11개)

| 메서드 | 경로 | 기본 윈도우 | 최대 윈도우 |
|--------|------|-----------|-----------|
| GET | `/api/v1/fleet/alarm-summary` | 8시간 | 168시간 |
| GET | `/api/v1/fleet/alarm-detail/{id}` | — | — |
| GET | `/api/v1/fleet/alarm-review` | — | — |
| GET | `/api/v1/fleet/alarm-rate-comparison` | — | — |
| GET | `/api/v1/fleet/chamber-health` | — | — |
| GET | `/api/v1/fleet/chamber-health/{id}` | — | — |
| GET | `/api/v1/equipment/{id}/chamber-health/history` | 1시간 | 24시간 |
| GET | `/api/v1/fleet/report` | — | — |
| GET | `/api/v1/fleet/cv-band-detail` | — | — |
| GET | `/api/v1/fleet/t2t-comparison` | — | — |
| GET | `/api/v1/fleet/health-scorecard` | — | — |

### Compare (3개)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/fleet/recipe-compare` | 레시피 간 SVID 비교 |
| GET | `/api/v1/fleet/svid-compare` | SVID 간 비교 |
| GET | `/api/v1/spec-limits` | Oracle USL/LSL |

---

## 15. 배포 및 운영

### systemd 서비스 목록

| 서비스 유닛 | 역할 | 포트 |
|-----------|------|------|
| `fdc-portal.service` | Next.js 프론트엔드 | :3000 |
| `fdc-api.service` | FastAPI 백엔드 | :8100 |
| `fdc-extractor.service` | Oracle → TimescaleDB ETL | — |
| `spc-runner.service` | SPC 배치 처리 | — |
| `fdc-pca.service` | PCA 챔버 건강 배치 | — |

### 배포 명령

```bash
# 프론트엔드 배포 (pull + build + restart)
ssh linux-server 'cd ~/fdc-portal && git pull && npx next build && \
  sudo -n systemctl restart fdc-portal'

# 백엔드 배포 (서비스당 1개씩 sudo 호출)
ssh linux-server 'cd ~/fdc-portal && git pull && \
  sudo -n systemctl restart fdc-api && \
  sudo -n systemctl restart spc-runner && \
  sudo -n systemctl restart fdc-extractor && \
  sudo -n systemctl restart fdc-pca'
```

> **주의**: `sudo -n` 호출은 서비스 1개당 1번. 동시에 여러 서비스 재시작 금지.

### 로컬 개발 서버 설정

```bash
# 1. SSH 터널 (Mac sleep 후 재실행 필요)
ssh -f -N -L 8100:localhost:8100 linux-server

# 2. 빌드 + 서빙
npx next build && npx next start   # localhost:3000 → localhost:8100 (터널)
```

> `next dev`(hot reload)는 집에서 작동 안 함. 반드시 `next build` + `next start` 사용.

### 데이터 보존 정책

| 레이어 | 보존 기간 | 비고 |
|--------|---------|------|
| `svid_trace` (raw) | 90일 | 자동 삭제 정책 |
| `svid_1min` | 90일 | 연동 |
| `svid_15min` | 90일 | 연동 |
| 압축 정책 | raw 3일 후 압축 | segment: eqp_id, svid_name |

### 쿼리 윈도우 제한

| 엔드포인트 | 기본 | 최대 |
|-----------|------|------|
| `/query` | 자동 해상도 | 7일 |
| `/spc/{id}` | 24h | 168h |
| `/fleet/alarm-summary` | 8h | 168h |
| `/fleet/chamber-health` | 1h | 24h |
| `/lots`, `/trace` | 3일 | 30~90일 |

---

## 16. 테스트 전략

### 테스트 피라미드

```
         ┌─────────────────────────┐
         │   E2E (40+ 테스트)      │  Playwright (실제 브라우저)
         │   Fleet, History,       │  실행: ssh linux-server
         │   Compare, Trace, SPC   │
         ├─────────────────────────┤
         │  단위 TS (100+ 테스트)  │  Vitest (node 환경)
         │  chart-utils, spc-tab,  │  실행: npx vitest run
         │  export, llm-format     │
         ├─────────────────────────┤
         │  Python (900+ 테스트)   │  pytest (uv)
         │  api_contracts, t2t,    │  cd tooling && uv run ...
         │  spc_engine, baselines  │
         └─────────────────────────┘
```

### 테스트 실행 명령

```bash
# Python 백엔드
cd tooling && uv run --project extractor pytest -x -q \
  --ignore=extractor/tests/test_config.py

# 프론트엔드 단위 테스트
npx vitest run

# E2E (linux 서버, 모든 localhost)
ssh linux-server 'cd ~/fdc-portal && npx playwright test --workers=1'

# E2E (사무실 LAN, Mac → linux 직접)
BASE_URL=http://192.168.100.230:3000 npx playwright test
```

### E2E 스펙 파일

| 파일 | 테스트 수 | 내용 |
|------|---------|------|
| `fdc-portal.spec.ts` | 8개 | Fleet, History, Compare, Trace 기본 플로우 |
| `spc.spec.ts` | 19개 | API perf, SPC chart, 네비게이션 |
| `trace-interactions.spec.ts` | 7개 | Trace 상호작용 |
| `trace-resilience.spec.ts` | 4개 | 복원력 (에러 처리) |
| `oos-link.spec.ts` | 6개 | OOS/OOC 딥링크 |

### 코드 변경 후 테스트 규칙

| 변경 범위 | 실행 테스트 |
|---------|-----------|
| Python 변경 | pytest |
| 프론트엔드 변경 | vitest + E2E |
| API 변경 | pytest + E2E |

---

## 17. 핵심 규칙 및 제약사항

### 1. OOS 알람 단일 소스 원칙

OOS 알람은 **반드시** `svid_spc_results WHERE algorithm='spec'`에서만 읽어야 합니다.

```sql
-- 올바른 방법
SELECT * FROM svid_spc_results WHERE algorithm = 'spec' AND alarm = TRUE;

-- 금지: EES 데이터 병합
SELECT * FROM ees_faults JOIN svid_spc_results ...;
```

### 2. SVID 필터링 원칙

```python
# 올바른 방법
category = categorize_svid(svid_name, overrides)
if category == 'recipe': ...

# 금지: 직접 호출
if is_svid_excluded(svid_name): ...
```

### 3. 배포 원칙

- `git pull + systemctl restart`만 사용
- 한 번의 `sudo -n` 호출에 서비스 1개만 재시작
- 복수 서비스 재시작 시 각각 별도 `sudo -n` 명령 사용

### 4. 튜닝 파라미터 변경 원칙

1. 먼저 `docs/fdc-tuning-reference.org` 업데이트
2. 그 다음 코드 변경

### 5. Chat AI 도구 추가 원칙

1. fdc-cli `--llm` 명령으로 CLI 구현 먼저
2. 그 다음 Chat API 도구로 연결
3. 설계 문서: `docs/superpowers/specs/2026-03-31-chat-ai-design.md`

### 6. 쿼리 윈도우 규칙

TimescaleDB 압축 청크 회피 및 SATA 디스크 부하 방지를 위해 엔드포인트별 최대 윈도우를 준수합니다.

---

## 18. 용량 계획

### 현재 상태 (2026-04)

| 지표 | 현황 |
|------|------|
| 디스크 사용 | ~420 GB (42% / 1 TB SATA) |
| DB 행수 | ~60억 행 |
| 일일 수집 | 63M 행 (~21 GB raw) |
| 압축 후 | ~53 KB/day |
| 장비 수 | 77개 (NS2) |

### 6개월 예상

| 지표 | 예상 |
|------|------|
| 디스크 사용 | ~800 GB (SATA 한계 근접) |
| DB 행수 | ~175억 행 |
| 장비 수 | 250개 (NS1+NS2+NS3) |

### NVMe 2 TB 업그레이드

- **상태**: 승인됨
- **효과**: 현재 수집 속도로 ~2년 용량 확보
- **마이그레이션**: TimescaleDB `ALTER TABLE SET TABLESPACE` + 물리 디스크 교체

---

## 19. 향후 로드맵

### 완료 (2026 Q1-Q2)

- Azure Entra ID SSO (2026-04-07)
- Cluster SPC 모드 (DBSCAN + 클러스터별 EWMA)
- OOS 스펙 폭 신뢰성 체크 (37% 거짓 OOS 감소)
- T2T V2 (Auto-grouping, DBSCAN 기반)
- Cross-C2C 비교 (공정별 챔버 교차 분석)
- Companion lot 자동 감지
- Recipe-independent cluster baselines
- Bake 공정 타입 추가 (BAK09 온보딩)

### 진행 중

- NVMe 2 TB 업그레이드 (디스크 교체)
- NS1 팹 온보딩 (250개 장비 목표)
- Lot 계보 추적 (split/merge/hold/resume) — CCUBE LOTHST 조사 중

### 계획 중

- Streaming Replication (HA 구성)
- Step pattern auto-discovery 고도화
- AI 에이전트 자동 치유 확장 (3단계 → 5단계)

---

*이 문서는 FDC Portal 2026-04-16 기준으로 작성되었습니다. 시스템 변경 시 반드시 갱신해주세요.*
