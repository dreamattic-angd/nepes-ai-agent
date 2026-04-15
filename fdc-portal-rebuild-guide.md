# FDC Portal — 처음부터 재구현 가이드

> 이 문서는 FDC Portal을 빈 서버에서 완전히 재구현하기 위한 종합 설계서입니다.  
> 인프라 구축 → DB 설계 → 백엔드 → 프론트엔드 → 배포까지 순서대로 기술합니다.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [서버 인프라 구축](#2-서버-인프라-구축)
3. [데이터베이스 설계](#3-데이터베이스-설계)
4. [데이터 수집 파이프라인](#4-데이터-수집-파이프라인)
5. [Python 백엔드 (FastAPI)](#5-python-백엔드-fastapi)
6. [SPC 알고리즘 구현](#6-spc-알고리즘-구현)
7. [PCA 건강도 분석](#7-pca-건강도-분석)
8. [Next.js 프론트엔드](#8-nextjs-프론트엔드)
9. [인증 (Azure AD SSO)](#9-인증-azure-ad-sso)
10. [AI 챗봇 통합](#10-ai-챗봇-통합)
11. [차트 시각화](#11-차트-시각화)
12. [systemd 서비스 설정](#12-systemd-서비스-설정)
13. [배포 워크플로우](#13-배포-워크플로우)
14. [테스트 전략](#14-테스트-전략)
15. [환경변수 전체 목록](#15-환경변수-전체-목록)

---

## 1. 프로젝트 개요

### 1.1 무엇을 만드는가

**FDC Portal**은 반도체 제조 공장의 장비 신호를 실시간으로 모니터링하는 웹 포털입니다.

- **FDC**: Fault Detection & Classification (결함 감지 및 분류)
- **77개 장비**를 실시간으로 감시 (Sputter, Plating, Etch, CMP 등)
- 장비마다 수백 개의 **SVID(Signal Variable ID)** — 온도, 압력, 유량 등

### 1.2 핵심 기능

| 기능 | 설명 |
|------|------|
| **Fleet Monitor** | 모든 장비의 알람 현황을 카드 UI로 표시 |
| **History Explorer** | 특정 장비의 SVID 시계열 데이터 조회 + PCA 건강도 |
| **Compare Tool** | 여러 장비/SVID 간 비교 분석 |
| **Trace Viewer** | LOT 번호로 생산 이력 추적 (어느 장비 → 어느 챔버 → 어떤 파라미터) |
| **Analytics** | CV Decision Tree, Case Study 등 알고리즘 설명 |
| **AI 챗봇** | Gemini/Claude 기반 진단 어시스턴트 (24개 도구 통합) |

### 1.3 전체 아키텍처

```
Oracle MES (CCUBE)                       사내 네트워크
    │  (Oracle oracledb 커넥터)
    ↓
Python Extractor (main.py)           ← 1분마다 BLOB 폴링
    │
    ├──→ TimescaleDB (PostgreSQL 17)
    │        svid_trace (raw)
    │        svid_1min (1분 롤업)
    │        svid_spc_results
    │        chamber_health
    │        lot_equipment_map
    │
    ├──→ SPC Runner (spc_runner.py)   ← 1분마다 알람 감지
    └──→ PCA Runner (pca_runner.py)   ← 15분마다 건강도 계산

FastAPI 서버 (api.py)                ← port 8100
    │
    ↓
Next.js 서버 (fdc-portal)            ← port 3000 (nginx 프록시)
    ├── /fdc/*  (UI 페이지)
    └── /api/v1/* (FastAPI 역방향 프록시)
          └──→ FastAPI :8100

브라우저 (사용자)
    └── Azure AD SSO → /fdc/* 접근
```

---

## 2. 서버 인프라 구축

### 2.1 하드웨어 요구사항

| 구분 | 최소 사양 | 권장 사양 |
|------|---------|---------|
| CPU | 8 core | 16 core |
| RAM | 32 GB | 64 GB |
| Storage | SSD 500 GB | NVMe SSD 2 TB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Network | 1 Gbps 사내 LAN | 10 Gbps |

> **왜 스토리지가 중요한가**: 77개 장비 × 1분 롤업 × 90일 = 약 8억 행. 압축 후 약 50~100 GB.

### 2.2 OS 초기 설정

```bash
# 사용자 생성 (전용 서비스 계정)
sudo useradd -m -s /bin/bash ai-equipment
sudo usermod -aG sudo ai-equipment

# 필수 패키지
sudo apt update && sudo apt install -y \
    git curl wget \
    nginx \
    build-essential \
    python3.11 python3.11-dev python3.11-venv \
    libpq-dev \
    nodejs npm

# Node.js LTS 설치 (apt 버전이 오래됐으면 NodeSource 사용)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# uv (Python 패키지 관리자) 설치
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2.3 PostgreSQL 17 + TimescaleDB 설치

```bash
# PostgreSQL 17 설치
sudo apt install -y postgresql-17 postgresql-server-dev-17

# TimescaleDB 저장소 등록 및 설치
sudo sh -c "echo 'deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $(lsb_release -c -s) main' > /etc/apt/sources.list.d/timescaledb.list"
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
sudo apt update
sudo apt install -y timescaledb-2-postgresql-17

# TimescaleDB 활성화 (postgresql.conf 자동 설정)
sudo timescaledb-tune --quiet --yes

# PostgreSQL 재시작
sudo systemctl restart postgresql
```

### 2.4 데이터베이스 생성

```bash
sudo -u postgres psql <<EOF
-- FDC 전용 DB 생성
CREATE DATABASE fdc;

-- 전용 사용자 생성
CREATE USER fdc_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE fdc TO fdc_user;

-- TimescaleDB extension 설치 권한
\c fdc
CREATE EXTENSION IF NOT EXISTS timescaledb;
EOF
```

### 2.5 Oracle 클라이언트 설치

Oracle DB에서 BLOB 데이터를 가져오기 위해 oracledb Python 패키지 사용.  
Oracle 19c+ 환경에서는 **Thin Mode**로 별도 Oracle 클라이언트 불필요.

```python
# oracledb thin mode (클라이언트 설치 없이 사용 가능)
import oracledb
conn = oracledb.connect(
    user=os.getenv("ORACLE_USER"),
    password=os.getenv("ORACLE_PASSWORD"),
    dsn=os.getenv("ORACLE_DSN")  # "hostname:port/service_name"
)
```

### 2.6 nginx 설정

```nginx
# /etc/nginx/sites-available/fdc-portal
server {
    listen 80;
    server_name fdc.company.co.kr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name fdc.company.co.kr;

    ssl_certificate     /etc/ssl/fdc/cert.pem;
    ssl_certificate_key /etc/ssl/fdc/key.pem;

    # Azure AD 콜백 URL 강제 HTTPS 정규화용
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Host $host;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 3. 데이터베이스 설계

### 3.1 테이블 전체 구조

```
TimescaleDB (fdc 데이터베이스)
│
├── [메타데이터 - 일반 PostgreSQL 테이블]
│   ├── equipment           장비 목록 + 현재 상태
│   ├── svid_registry       SVID 파라미터 카탈로그
│   ├── svid_classification SVID 분류 (recipe/health/grey)
│   ├── chamber_mapping     챔버 ID 매핑 (FDC ↔ CCUBE)
│   ├── sequence_recipe_map 챔버별 레시피 분해
│   └── extraction_watermark BLOB 추출 진행 상태
│
├── [시계열 - TimescaleDB 하이퍼테이블]
│   ├── svid_trace          Raw SVID 데이터 (1hr 청크, 90일 보존)
│   ├── svid_1min           1분 롤업 (1day 청크, 90일 보존)
│   ├── svid_spc_results    SPC 알람 결과 (1day 청크, 90일 보존)
│   ├── svid_events         이벤트 로그 (7day 청크)
│   ├── svid_transition_log 클러스터 전환 로그
│   ├── chamber_health      PCA T²/SPE 결과 (7day 청크, 90일 보존)
│   └── lot_genealogy       LOT 이력 이벤트
│
├── [모델/통계 - 일반 PostgreSQL 테이블]
│   ├── svid_spc_baselines  SPC 베이스라인 (μ, σ)
│   ├── svid_transition_profiles 클러스터 전환 프로파일
│   ├── pca_models          PCA 모델 (직렬화 바이너리)
│   ├── alarm_rate_daily    일별 알람율 요약
│   └── ees_fault_events    EES 결함 이벤트
│
└── [LOT 추적 - 일반 PostgreSQL 테이블]
    ├── lot_equipment_map   LOT ↔ 장비 방문 이력
    └── maintenance_events  정비 이벤트
```

### 3.2 핵심 테이블 상세 설명

#### equipment 테이블

```sql
CREATE TABLE equipment (
    eqp_id       TEXT PRIMARY KEY,       -- 장비 ID (e.g., "PLA36")
    dcp_id       TEXT NOT NULL,          -- Oracle DCP ID (e.g., "PLA36_DCP")
    model        TEXT,                   -- 장비 모델명
    campus       TEXT DEFAULT 'ns1campus', -- 캠퍼스/팹 구분
    location     TEXT,                   -- 물리적 위치
    node         TEXT,                   -- 공정 노드
    status       TEXT DEFAULT 'UNKNOWN', -- RUN/IDLE/DOWN 등
    status_since TIMESTAMPTZ,            -- 상태 변경 시각
    current_lot_id TEXT,                 -- 현재 진행 중인 LOT
    current_recipe_id TEXT,              -- 현재 실행 중인 레시피
    created_at   TIMESTAMPTZ DEFAULT now()
);
```

> **campus 컬럼 사용법**: `ns1campus` → FAB 1, `ns2campus` → FAB 2. 프론트엔드 FAB 필터와 연동.

#### svid_registry 테이블

SVID = **S**ignal **V**ariable **ID**. 장비가 출력하는 센서 파라미터.

```sql
CREATE TABLE svid_registry (
    eqp_id      TEXT NOT NULL,
    svid_name   TEXT NOT NULL,      -- "Cup1_Temp_PV", "RF_Power" 등
    chamber     TEXT,               -- "Cup1", "Metal5", "CP5" 등
    sensor      TEXT,               -- 챔버 접두사 제거 후 센서명
    units       TEXT,               -- "°C", "V", "sccm", "kPa"
    alarm_lo    DOUBLE PRECISION,   -- Oracle MES 스펙 하한
    alarm_hi    DOUBLE PRECISION,   -- Oracle MES 스펙 상한
    PRIMARY KEY (eqp_id, svid_name)
);
```

> **챔버 명명 규칙**: `Cup1_Temp_PV`에서 `Cup1`이 챔버, `Temp_PV`가 센서. BLOB 파서가 자동 분리.

#### svid_trace 하이퍼테이블

```sql
CREATE TABLE svid_trace (
    ts           TIMESTAMPTZ NOT NULL,  -- 측정 시각
    eqp_id       TEXT NOT NULL,
    svid_name    TEXT NOT NULL,
    value        DOUBLE PRECISION,
    lot_id       TEXT,                  -- 생산 LOT 번호
    recipe_id    TEXT,                  -- 레시피 ID
    step_id      TEXT,                  -- 공정 스텝
    product_id   TEXT,
    substrate_id TEXT                   -- 웨이퍼/기판 ID
);

-- 1시간 청크 (77장비 × 기준)
SELECT create_hypertable('svid_trace', 'ts',
    chunk_time_interval => INTERVAL '1 hour');

-- 인덱스: 가장 많이 쓰는 쿼리 패턴
CREATE INDEX idx_svid_trace_eqp_svid_ts
    ON svid_trace (eqp_id, svid_name, ts DESC);

-- LOT 기반 쿼리용
CREATE INDEX idx_svid_trace_lot
    ON svid_trace (lot_id, ts DESC)
    WHERE lot_id IS NOT NULL;

-- 3일 이상 데이터 자동 압축
ALTER TABLE svid_trace SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'eqp_id, svid_name',
    timescaledb.compress_orderby = 'ts DESC'
);
SELECT add_compression_policy('svid_trace', INTERVAL '3 days');

-- 90일 이상 데이터 자동 삭제
SELECT add_retention_policy('svid_trace', INTERVAL '90 days');
```

#### svid_1min 테이블

```sql
-- 연속 집계가 아닌 일반 하이퍼테이블로 구현
-- 이유: TimescaleDB Continuous Aggregate는 압축과 충돌 위험
--      Extractor가 BLOB 처리 후 직접 계산하여 UPSERT
CREATE TABLE svid_1min (
    bucket       TIMESTAMPTZ NOT NULL,
    eqp_id       TEXT NOT NULL,
    svid_name    TEXT NOT NULL,
    avg_val      DOUBLE PRECISION,
    min_val      DOUBLE PRECISION,
    max_val      DOUBLE PRECISION,
    stddev_val   DOUBLE PRECISION,
    sample_count INTEGER,
    PRIMARY KEY (bucket, eqp_id, svid_name)
);

SELECT create_hypertable('svid_1min', 'bucket',
    chunk_time_interval => INTERVAL '1 day');
```

#### svid_spc_results 테이블

```sql
CREATE TABLE svid_spc_results (
    ts             TIMESTAMPTZ NOT NULL,
    eqp_id         TEXT NOT NULL,
    svid_name      TEXT NOT NULL,
    recipe_id      TEXT,
    algorithm      TEXT NOT NULL,      -- 'spec', 'ewma', 'cusum', 'weco'
    value          DOUBLE PRECISION,   -- 입력값 (avg_val)
    statistic      DOUBLE PRECISION,   -- 제어 통계량
    ucl            DOUBLE PRECISION,   -- 관리 상한 (Upper Control Limit)
    lcl            DOUBLE PRECISION,   -- 관리 하한 (Lower Control Limit)
    alarm          BOOLEAN DEFAULT FALSE,
    rule           TEXT,               -- 'ewma_ooc', '2/3_rule' 등
    classification TEXT DEFAULT 'ooc', -- 'ooc' 또는 'oos'
    step_id        TEXT,
    lot_id         TEXT DEFAULT '',
    substrate_id   TEXT DEFAULT '',
    effective_sigma DOUBLE PRECISION   -- sigma floor 적용 시 비-NULL
);

-- 중복 방지
CREATE UNIQUE INDEX idx_spc_results_unique
    ON svid_spc_results (ts, eqp_id, svid_name, algorithm);

-- 알람 조회 최적화
CREATE INDEX idx_spc_results_eqp_alarm
    ON svid_spc_results (eqp_id, ts DESC)
    WHERE alarm = TRUE;
```

#### svid_spc_baselines 테이블

```sql
-- SPC 기준선: 각 (장비, SVID, 레시피, 스텝) 조합마다 μ와 σ 저장
CREATE TABLE svid_spc_baselines (
    eqp_id      TEXT NOT NULL,
    svid_name   TEXT NOT NULL,
    recipe_id   TEXT NOT NULL,
    step_id     TEXT NOT NULL DEFAULT '',  -- 스텝 없으면 빈 문자열
    mu          DOUBLE PRECISION NOT NULL,
    sigma       DOUBLE PRECISION NOT NULL,
    n_samples   INTEGER NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT now(),
    valid_from  TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,               -- NULL = 현재 유효
    last_assigned_at TIMESTAMPTZ,          -- 클러스터 모드: 마지막 사용 시각
    PRIMARY KEY (eqp_id, svid_name, recipe_id, step_id, valid_from)
);

-- 현재 유효한 베이스라인 빠른 조회
CREATE INDEX idx_spc_baselines_active
    ON svid_spc_baselines (eqp_id, svid_name, recipe_id, step_id)
    WHERE valid_until IS NULL;
```

### 3.3 스키마 초기화

```bash
# schema.sql을 DB에 적용
psql -U fdc_user -d fdc -f tooling/extractor/schema.sql
```

---

## 4. 데이터 수집 파이프라인

### 4.1 Oracle BLOB 구조 이해

CCUBE MES 시스템은 장비 파라미터를 Oracle의 `FDC_EQUIP_PARAM` 테이블에 BLOB 형식으로 저장합니다.

```
BLOB 내용 (텍스트 포맷):
PARAM_NAME|VALUE|TIMESTAMP|LOT_ID|RECIPE_ID|STEP_ID|SUBSTRATE_ID
Cup1_Temp_PV|350.2|2026-04-15 10:23:01|LOT001|RCP_A|STEP1|W01
Cup1_Pressure|1.2e-5|2026-04-15 10:23:01|LOT001|RCP_A|STEP1|W01
RF_Power|500.0|2026-04-15 10:23:01|LOT001|RCP_A|STEP1|W01
...
```

### 4.2 추출 워커 구조 (main.py)

```python
# 핵심 루프 구조 (의사코드)
def main_loop():
    """57개 DCP를 1분마다 폴링하는 메인 루프"""
    while True:
        for dcp_id, eqp_id in DCP_MAPPING.items():
            # 1. 워터마크 읽기 (어디까지 처리했는지)
            last_rawid = get_watermark(dcp_id)
            
            # 2. Oracle에서 새 BLOB 페치
            blobs = oracle_reader.fetch_new_blobs(dcp_id, last_rawid)
            
            # 3. BLOB 파싱 → 행으로 변환
            rows = []
            for blob in blobs:
                rows.extend(blob_parser.parse(blob, eqp_id))
            
            # 4. TimescaleDB에 배치 삽입
            if rows:
                timescale_writer.batch_insert(rows)
                
                # 5. 1분 롤업 계산 및 UPSERT
                timescale_writer.upsert_1min_agg(rows, eqp_id)
                
                # 6. SVID 레지스트리 업데이트
                timescale_writer.upsert_svid_registry(rows, eqp_id)
                
                # 7. 워터마크 업데이트
                update_watermark(dcp_id, max(b.rawid for b in blobs))
        
        time.sleep(60)  # 1분 대기
```

### 4.3 BLOB 파서 (blob_parser.py)

```python
def parse_blob(blob_bytes: bytes, eqp_id: str) -> list[dict]:
    """Oracle BLOB → svid_trace 행 리스트 변환"""
    rows = []
    text = blob_bytes.decode('utf-8', errors='replace')
    
    for line in text.strip().split('\n'):
        fields = line.split('|')
        if len(fields) < 3:
            continue
        
        param_name, value_str, timestamp_str = fields[0], fields[1], fields[2]
        lot_id = fields[3] if len(fields) > 3 else None
        recipe_id = fields[4] if len(fields) > 4 else None
        step_id = fields[5] if len(fields) > 5 else None
        substrate_id = fields[6] if len(fields) > 6 else None
        
        try:
            value = float(value_str)
            ts = parse_timestamp(timestamp_str)
        except (ValueError, TypeError):
            continue
        
        # 챔버 분리: "Cup1_Temp_PV" → chamber="Cup1", sensor="Temp_PV"
        chamber, sensor = extract_chamber(param_name)
        
        rows.append({
            'ts': ts,
            'eqp_id': eqp_id,
            'svid_name': param_name,
            'value': value,
            'lot_id': lot_id,
            'recipe_id': recipe_id,
            'step_id': step_id,
            'substrate_id': substrate_id,
        })
    
    return rows

def extract_chamber(param_name: str) -> tuple[str, str]:
    """
    "Cup1_Temp_PV" → ("Cup1", "Temp_PV")
    "RF_Power" → ("", "RF_Power")
    
    챔버 접두사 패턴: Cup1, Cup2, Metal1-5, CP1-8, LL (LoadLock) 등
    """
    CHAMBER_PATTERNS = ['Cup', 'Metal', 'CP', 'LL', 'TM', 'PM']
    for prefix in CHAMBER_PATTERNS:
        if param_name.startswith(prefix) and '_' in param_name:
            # "Cup1_Temp" → "Cup1"
            chamber = param_name.split('_')[0]
            if chamber[len(prefix):].isdigit():
                sensor = param_name[len(chamber)+1:]
                return chamber, sensor
    return '', param_name
```

### 4.4 TimescaleDB 배치 삽입 (timescale_writer.py)

```python
def batch_insert(rows: list[dict], conn):
    """COPY 명령으로 빠른 배치 삽입"""
    import io
    
    buf = io.StringIO()
    for r in rows:
        buf.write(f"{r['ts']}\t{r['eqp_id']}\t{r['svid_name']}\t"
                  f"{r['value'] or ''}\t{r['lot_id'] or ''}\t"
                  f"{r['recipe_id'] or ''}\t{r['step_id'] or ''}\t"
                  f"{r['substrate_id'] or ''}\n")
    buf.seek(0)
    
    with conn.cursor() as cur:
        cur.copy_from(buf, 'svid_trace',
            columns=['ts','eqp_id','svid_name','value',
                     'lot_id','recipe_id','step_id','substrate_id'],
            null='',
            sep='\t')
    conn.commit()

def upsert_1min_agg(rows: list[dict], eqp_id: str, conn):
    """1분 집계 계산 후 svid_1min에 UPSERT"""
    from collections import defaultdict
    import statistics
    
    # (bucket, svid_name)별로 그룹화
    groups = defaultdict(list)
    for r in rows:
        bucket = r['ts'].replace(second=0, microsecond=0)
        groups[(bucket, r['svid_name'])].append(r['value'])
    
    records = []
    for (bucket, svid_name), values in groups.items():
        valid = [v for v in values if v is not None]
        if not valid:
            continue
        records.append({
            'bucket': bucket,
            'eqp_id': eqp_id,
            'svid_name': svid_name,
            'avg_val': statistics.mean(valid),
            'min_val': min(valid),
            'max_val': max(valid),
            'stddev_val': statistics.stdev(valid) if len(valid) > 1 else 0.0,
            'sample_count': len(valid),
        })
    
    with conn.cursor() as cur:
        cur.executemany("""
            INSERT INTO svid_1min
                (bucket, eqp_id, svid_name, avg_val, min_val, max_val, stddev_val, sample_count)
            VALUES (%(bucket)s, %(eqp_id)s, %(svid_name)s,
                    %(avg_val)s, %(min_val)s, %(max_val)s, %(stddev_val)s, %(sample_count)s)
            ON CONFLICT (bucket, eqp_id, svid_name)
            DO UPDATE SET
                avg_val = EXCLUDED.avg_val,
                min_val = EXCLUDED.min_val,
                max_val = EXCLUDED.max_val,
                stddev_val = EXCLUDED.stddev_val,
                sample_count = EXCLUDED.sample_count
        """, records)
    conn.commit()
```

### 4.5 CCUBE 동기화 (부가 데이터)

Oracle CCUBE 시스템에서 다음 데이터를 주기적으로 동기화합니다.

| 소스 테이블 | 동기화 주기 | 대상 테이블 | 용도 |
|------------|------------|-----------|------|
| `CCUBE.EQPLOTHST` | 5분 | `lot_equipment_map` | LOT 방문 이력 |
| `CCUBE.EQPSTSHST` | 1분 | `equipment.status` | 장비 상태 |
| `CCUBE.LOTHST` | 5분 | `lot_genealogy` | LOT 계보 |
| `CCUBE.ADM_EQUIP_RECIPE` | 일 1회 | `sequence_recipe_map` | 챔버별 레시피 |

---

## 5. Python 백엔드 (FastAPI)

### 5.1 프로젝트 구조

```
tooling/extractor/
├── api.py              # FastAPI 앱 (port 8100)
├── main.py             # BLOB 추출 루프
├── spc_runner.py       # SPC 알람 감지 루프
├── pca_runner.py       # PCA 건강도 루프
├── spc_engine.py       # EWMA/CUSUM/WECO 구현
├── pca_engine.py       # PCA T²/SPE 구현
├── spc_baselines.py    # 베이스라인 관리
├── spc_config.py       # SVID 분류 설정
├── blob_parser.py      # Oracle BLOB 파싱
├── oracle_reader.py    # Oracle DB 커넥터
├── timescale_writer.py # TimescaleDB 쓰기
├── config.py           # 환경변수 설정
├── alarm_helpers.py    # 알람 집계 헬퍼
├── fleet_report.py     # Fleet 리포트 생성
├── ooc_oos.py          # OOC/OOS 계산
├── t2t_analysis.py     # Tool-to-Tool 비교
├── schema.sql          # DB 스키마
└── pyproject.toml      # Python 의존성
```

### 5.2 의존성 (pyproject.toml)

```toml
[project]
name = "fdc-extractor"
requires-python = ">=3.11"
dependencies = [
    "oracledb>=2.0",          # Oracle DB 커넥터 (Thin mode)
    "psycopg2-binary>=2.9",   # PostgreSQL 커넥터
    "fastapi>=0.115",          # API 서버
    "uvicorn[standard]>=0.30", # ASGI 서버
    "numpy>=2.4",              # 수치 계산
    "scipy>=1.14",             # 통계 계산
    "ruptures>=1.1",           # Changepoint 감지
    "scikit-learn>=1.4",       # PCA, DBSCAN
    "diptest>=0.8",            # 다봉분포 검정
]
```

### 5.3 FastAPI 엔드포인트 전체 목록

```python
# api.py 핵심 구조

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FDC API", version="1.0.0")

# CORS (내부 네트워크이므로 넓게 허용)
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 서버 상태 확인 |
| GET | `/api/v1/equipment` | 장비 목록 + 현재 상태 |
| GET | `/api/v1/equipment/{eqp_id}/svids` | SVID 레지스트리 |
| GET | `/api/v1/query` | 시계열 데이터 조회 |
| GET | `/api/v1/compare` | 다중 SVID 비교 |
| GET | `/api/v1/stats` | 통계 요약 (최근 N시간) |
| GET | `/api/v1/trace` | LOT Journey (방문 장비 목록) |
| GET | `/api/v1/lots` | LOT 목록 |
| GET | `/api/v1/spc/{eqp_id}` | SPC 알람 현황 |
| GET | `/api/v1/spc/{eqp_id}/baselines` | SPC 베이스라인 |
| GET | `/api/v1/spc/{eqp_id}/chart` | SPC 차트 데이터 |
| GET | `/api/v1/spec-limits` | Oracle MES 스펙 한계 |
| GET | `/api/v1/chamber-health` | PCA 챔버 건강도 |
| GET | `/api/v1/fleet-alarm-summary` | Fleet 전체 알람 요약 |
| GET | `/api/v1/fleet-alarm-trend` | 시간별 알람 추이 |
| GET | `/api/v1/fleet-report` | Fleet OOC 리포트 |
| GET | `/api/v1/alarm-review` | AI 알람 리뷰 |
| GET | `/api/v1/t2t-analysis` | Tool-to-Tool 비교 |
| GET | `/api/v1/changepoints` | 변화점 감지 |

### 5.4 시계열 쿼리 엔드포인트

```python
@app.get("/api/v1/query")
async def query_timeseries(
    eqp_id: str,
    svid_name: str,
    start: str,          # ISO 8601
    end: str,
    resolution: str = "1m",  # "raw", "1m", "15m"
    include_lot: bool = False
):
    """
    시계열 데이터 반환. 해상도에 따라 테이블 선택:
    - "raw"  → svid_trace (매우 조밀, 단기 조회만)
    - "1m"   → svid_1min
    - "15m"  → svid_15min (장기 추이)
    """
    if resolution == "raw":
        table = "svid_trace"
        value_col = "value"
    elif resolution == "1m":
        table = "svid_1min"
        value_col = "avg_val"
    else:  # 15m
        table = "svid_15min"
        value_col = "avg_val"
    
    query = f"""
        SELECT bucket AS ts, {value_col} AS value
        FROM {table}
        WHERE eqp_id = $1 AND svid_name = $2
          AND bucket BETWEEN $3 AND $4
        ORDER BY bucket
    """
    # ...
```

### 5.5 config.py 구조

```python
import os
from dataclasses import dataclass

@dataclass
class Config:
    # TimescaleDB
    ts_host: str = os.getenv('TIMESCALE_HOST', 'localhost')
    ts_port: int = int(os.getenv('TIMESCALE_PORT', '5432'))
    ts_dbname: str = os.getenv('TIMESCALE_DBNAME', 'fdc')
    ts_user: str = os.getenv('TIMESCALE_USER', 'fdc_user')
    ts_password: str = os.getenv('TIMESCALE_PASSWORD', '')
    
    # Oracle
    oracle_user: str = os.getenv('ORACLE_USER', '')
    oracle_password: str = os.getenv('ORACLE_PASSWORD', '')
    oracle_dsn: str = os.getenv('ORACLE_DSN', '')  # host:port/service
    
    # DCP 매핑 (장비 ID → Oracle DCP ID)
    # 실제 운영에서는 DB 테이블에서 로드
    dcp_mapping: dict = field(default_factory=dict)

CONFIG = Config()
```

---

## 6. SPC 알고리즘 구현

### 6.1 SPC란

**Statistical Process Control (통계적 공정 관리)**: 공정 파라미터가 정상 범위를 벗어나는지 실시간으로 감시.

- **OOS (Out-of-Spec)**: 스펙 한계 이탈 → 제품 불량 위험
- **OOC (Out-of-Control)**: 제어 한계 이탈 → 공정 이상 신호 (아직 스펙 내이지만 트렌드 위험)

### 6.2 알람 알고리즘 4종

#### Algorithm 1: Spec Limit (OOS)

```python
def check_spec_limit(value: float, ucl: float, lcl: float) -> bool:
    """Oracle MES에서 로드한 스펙 한계 비교"""
    return value > ucl or value < lcl
```

#### Algorithm 2: EWMA (Exponentially Weighted Moving Average)

```python
class EwmaState:
    """EWMA 상태 유지 (레시피/스텝 변경 시 리셋)"""
    lambda_: float = 0.2  # 평활화 계수 (0 < λ < 1)
    ewma: float = None    # 현재 EWMA 값
    
def update_ewma(state: EwmaState, value: float, mu: float, sigma: float) -> dict:
    """
    EWMA 업데이트 및 알람 판정
    
    z_ewma = λ * x + (1-λ) * z_prev
    UCL = μ + 3σ * sqrt(λ / (2-λ))
    """
    if state.ewma is None:
        state.ewma = mu
    
    state.ewma = state.lambda_ * value + (1 - state.lambda_) * state.ewma
    
    # 관리 한계
    k = 3  # 3-sigma
    ucl = mu + k * sigma * math.sqrt(state.lambda_ / (2 - state.lambda_))
    lcl = mu - k * sigma * math.sqrt(state.lambda_ / (2 - state.lambda_))
    
    alarm = state.ewma > ucl or state.ewma < lcl
    return {
        'statistic': state.ewma,
        'ucl': ucl, 'lcl': lcl,
        'alarm': alarm,
        'rule': 'ewma_ooc' if alarm else None
    }
```

#### Algorithm 3: CUSUM (Cumulative Sum)

```python
class CusumState:
    sh: float = 0.0  # 상향 누적합
    sl: float = 0.0  # 하향 누적합

def update_cusum(state: CusumState, value: float, mu: float, sigma: float) -> dict:
    """
    CUSUM: 장기 드리프트 감지
    
    Sh = max(0, Sh_prev + (x - μ)/σ - k)
    Sl = max(0, Sl_prev - (x - μ)/σ - k)
    Alarm if Sh > h or Sl > h
    """
    k = 0.5  # 허용 이탈 (sigma 단위)
    h = 4.0  # 결정 구간
    
    z = (value - mu) / sigma if sigma > 0 else 0
    
    state.sh = max(0, state.sh + z - k)
    state.sl = max(0, state.sl - z - k)
    
    alarm = state.sh > h or state.sl > h
    return {
        'statistic': max(state.sh, state.sl),
        'ucl': h, 'lcl': -h,
        'alarm': alarm,
        'rule': 'cusum_upper' if state.sh > h else ('cusum_lower' if state.sl > h else None)
    }
```

#### Algorithm 4: WECO (Western Electric) Rules

```python
def check_weco(history: deque, mu: float, sigma: float) -> dict:
    """
    Western Electric 규칙 (4가지):
    1. 1점이 3σ 초과
    2. 연속 2점 중 2점이 2σ 초과 (같은 방향)
    3. 연속 4점 중 3점이 1σ 초과 (같은 방향)
    4. 연속 8점이 모두 같은 방향
    """
    if len(history) < 2:
        return {'alarm': False}
    
    recent = list(history)[-8:]  # 최근 8점
    zscores = [(x - mu) / sigma for x in recent if sigma > 0]
    
    # 규칙 1: 최근 1점이 3σ 초과
    if abs(zscores[-1]) > 3:
        return {'alarm': True, 'rule': 'weco_rule1'}
    
    # 규칙 2: 최근 3점 중 2점이 2σ 초과 (같은 방향)
    if len(zscores) >= 3:
        last3 = zscores[-3:]
        above2 = sum(1 for z in last3 if z > 2)
        below2 = sum(1 for z in last3 if z < -2)
        if above2 >= 2 or below2 >= 2:
            return {'alarm': True, 'rule': 'weco_rule2'}
    
    # 규칙 4: 최근 8점 모두 같은 방향
    if len(zscores) >= 8:
        all_above = all(z > 0 for z in zscores[-8:])
        all_below = all(z < 0 for z in zscores[-8:])
        if all_above or all_below:
            return {'alarm': True, 'rule': 'weco_rule4'}
    
    return {'alarm': False}
```

### 6.3 SPC Runner 루프 (spc_runner.py)

```python
def spc_runner_loop():
    """1분마다 svid_1min을 읽어 SPC 알람 계산"""
    while True:
        # 1. 모든 장비의 활성 SVID 목록
        active_svids = get_active_svids()
        
        for eqp_id, svid_name in active_svids:
            # 2. 베이스라인 로드 (μ, σ)
            baseline = load_baseline(eqp_id, svid_name, recipe_id, step_id)
            if baseline is None:
                continue
            
            # 3. 최근 1분 데이터 읽기
            point = get_latest_1min(eqp_id, svid_name)
            if point is None:
                continue
            
            # 4. 레시피/스텝 변경 감지 → 상태 리셋
            if recipe_changed(eqp_id, svid_name, point.recipe_id):
                reset_spc_state(eqp_id, svid_name)
            
            # 5. 알고리즘별 계산
            results = []
            
            # OOS (스펙 한계)
            spec = get_spec_limits(eqp_id, svid_name, point.recipe_id)
            if spec:
                oos = check_spec_limit(point.avg_val, spec.ucl, spec.lcl)
                results.append(('spec', oos))
            
            # EWMA
            ewma_result = update_ewma(state, point.avg_val, baseline.mu, baseline.sigma)
            results.append(('ewma', ewma_result))
            
            # CUSUM
            cusum_result = update_cusum(state, point.avg_val, baseline.mu, baseline.sigma)
            results.append(('cusum', cusum_result))
            
            # WECO
            history.append(point.avg_val)
            weco_result = check_weco(history, baseline.mu, baseline.sigma)
            results.append(('weco', weco_result))
            
            # 6. 결과 저장
            save_spc_results(eqp_id, svid_name, point.bucket, results)
        
        time.sleep(60)
```

### 6.4 클러스터 베이스라인

일부 SVID는 **다중 모드 분포** (예: 대기 중 25°C ↔ 동작 중 350°C).  
단일 베이스라인으로는 false alarm 폭발. 해결책: **클러스터별 독립 베이스라인**.

```python
from sklearn.cluster import DBSCAN
import numpy as np

def compute_cluster_baselines(values: list[float]) -> list[dict]:
    """
    DBSCAN으로 다중 모드 자동 감지 후 클러스터별 μ, σ 계산
    
    반환: [{'cluster_id': 'c0', 'mu': ..., 'sigma': ..., 'centroid': ...}, ...]
    """
    X = np.array(values).reshape(-1, 1)
    
    # DBSCAN 파라미터 (값 범위에 따라 adaptive eps)
    std = np.std(values)
    eps = std * 0.1  # 표준편차의 10%
    
    db = DBSCAN(eps=eps, min_samples=30).fit(X)
    labels = db.labels_
    
    clusters = []
    for label in set(labels):
        if label == -1:  # 노이즈
            continue
        mask = labels == label
        cluster_vals = X[mask].flatten()
        clusters.append({
            'cluster_id': f'c{label}',
            'mu': float(np.mean(cluster_vals)),
            'sigma': float(np.std(cluster_vals)),
            'centroid': float(np.median(cluster_vals)),
            'n_samples': int(mask.sum()),
        })
    
    return clusters

def find_nearest_cluster(value: float, clusters: list[dict]) -> dict:
    """현재 값에 가장 가까운 클러스터 찾기"""
    return min(clusters, key=lambda c: abs(value - c['centroid']))
```

### 6.5 베이스라인 검색 우선순위

```python
def load_baseline(eqp_id, svid_name, recipe_id, step_id):
    """
    베이스라인 검색 우선순위 (가장 구체적인 것 우선):
    1. (eqp, svid, recipe, step) — 레시피+스텝 전용
    2. (eqp, svid, recipe, "")  — 레시피 전용
    3. (eqp, svid, "", "")     — 장비 글로벌
    """
    for search_recipe, search_step in [
        (recipe_id, step_id),
        (recipe_id, ""),
        ("", ""),
    ]:
        baseline = db.query("""
            SELECT mu, sigma, n_samples
            FROM svid_spc_baselines
            WHERE eqp_id = %s AND svid_name = %s
              AND recipe_id = %s AND step_id = %s
              AND valid_until IS NULL
        """, (eqp_id, svid_name, search_recipe, search_step))
        
        if baseline:
            return baseline
    
    return None  # 베이스라인 없음 → SPC 스킵
```

---

## 7. PCA 건강도 분석

### 7.1 PCA란

**Principal Component Analysis**: 챔버 내 다수의 SVID를 종합하여 건강 점수를 계산.

- **T² (Hotelling's T-squared)**: 주성분 공간에서의 거리 → "평소와 얼마나 다른가"
- **SPE (Squared Prediction Error)**: 재구성 오차 → "PCA 모델이 설명 못하는 이상"

### 7.2 PCA 모델 학습 (pca_engine.py)

```python
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import numpy as np

def train_pca_model(data: np.ndarray, svid_names: list[str]) -> dict:
    """
    챔버 건강도 PCA 모델 학습
    
    data: (n_samples, n_features) — 15분 롤업 avg_val
    """
    # 정규화
    scaler = StandardScaler()
    data_scaled = scaler.fit_transform(data)
    
    # PCA (분산 95% 이상 설명하는 성분 수)
    pca = PCA(n_components=0.95)
    scores = pca.fit_transform(data_scaled)
    
    n_components = pca.n_components_
    
    # T² 한계 (F-분포 기반, α=0.01)
    n_samples = data.shape[0]
    from scipy.stats import f as f_dist
    t2_limit = (n_components * (n_samples**2 - 1)) / \
               (n_samples * (n_samples - n_components)) * \
               f_dist.ppf(0.99, n_components, n_samples - n_components)
    
    # SPE 한계 (Jackson-Mudholkar 근사)
    residuals = data_scaled - pca.inverse_transform(scores)
    spe_values = np.sum(residuals**2, axis=1)
    spe_mean = np.mean(spe_values)
    spe_var = np.var(spe_values)
    spe_limit = spe_mean + 3 * np.sqrt(spe_var)
    
    return {
        'loadings': pca.components_,
        'eigenvalues': pca.explained_variance_,
        'mu_vector': scaler.mean_,
        'sigma_vector': scaler.scale_,
        'residual_eigenvalues': np.var(residuals, axis=0),
        'explained_var': float(np.sum(pca.explained_variance_ratio_)),
        't2_limit': float(t2_limit),
        'spe_limit': float(spe_limit),
        'n_training': n_samples,
        'svid_names': svid_names,
        'n_components': n_components,
    }
```

### 7.3 PCA Runner 루프 (pca_runner.py)

```python
def pca_runner_loop():
    """15분마다 챔버 건강도 계산"""
    while True:
        for eqp_id in get_all_equipment():
            for chamber in get_chambers(eqp_id):
                # 1. 모델 로드 (없으면 학습)
                model = load_pca_model(eqp_id, chamber)
                if model is None or model_is_stale(model, days=14):
                    model = train_new_model(eqp_id, chamber)
                    save_pca_model(eqp_id, chamber, model)
                
                # 2. 최근 15분 데이터 로드
                data = get_15min_data(eqp_id, chamber, model['svid_names'])
                
                # 3. T² 및 SPE 계산
                scores = compute_scores(data, model)
                
                # 4. 알람 판정
                t2_alarm = scores['t2'] > model['t2_limit']
                spe_alarm = scores['spe'] > model['spe_limit']
                
                # 5. 결과 저장
                save_chamber_health(eqp_id, chamber, scores, t2_alarm or spe_alarm)
        
        time.sleep(900)  # 15분 대기
```

---

## 8. Next.js 프론트엔드

### 8.1 프로젝트 초기화

```bash
# Next.js 15 + TypeScript + App Router
npx create-next-app@latest fdc-portal \
    --typescript \
    --app \
    --tailwind \
    --src-dir \
    --import-alias "@/*"

cd fdc-portal
npm install next-auth@beta @auth/core
npm install react-markdown remark-gfm
npm install @anthropic-ai/sdk
npm install @google/genai
```

### 8.2 디렉토리 구조 설계

```
app/
├── layout.tsx              # Root 레이아웃 (폰트, Provider)
├── page.tsx                # 홈 (/ → /fdc 리다이렉트)
├── login/
│   └── page.tsx            # Azure AD 로그인 페이지
├── fdc/
│   ├── layout.tsx          # FDC 레이아웃 (탭, FAB, 채팅)
│   ├── page.tsx            # Fleet Monitor
│   ├── history/
│   │   └── page.tsx        # History Explorer
│   ├── compare/
│   │   └── page.tsx        # Compare Tool
│   ├── trace/
│   │   ├── page.tsx        # Trace Viewer
│   │   ├── SpcTab.tsx      # SPC 탭 컴포넌트
│   │   ├── AlarmSidebar.tsx
│   │   └── components/     # 재사용 컴포넌트
│   └── analytics/
│       └── page.tsx        # Analytics Framework
├── api/
│   ├── auth/[...nextauth]/
│   │   └── route.ts        # NextAuth 라우트 핸들러
│   └── chat/
│       └── route.ts        # AI 챗봇 SSE 스트리밍
└── components/
    ├── ChatPanel.tsx        # AI 채팅 패널
    ├── Navbar.tsx           # 네비게이션 바
    └── Modal.tsx

lib/
├── timeseries-client.ts    # FastAPI HTTP 클라이언트
├── types.ts                # 공유 타입 정의
├── chat-context.ts         # AI 컨텍스트 타입
├── chart-utils.ts          # 차트 유틸리티
├── chamber-utils.ts        # 챔버 정보 캐싱
├── fdc-llm-format.ts       # AI 프롬프트 포맷팅
├── normalize-fab.ts        # FAB 정규화
└── use-fab.ts              # FAB 커스텀 훅

auth.ts                     # NextAuth 설정
middleware.ts               # 인증 미들웨어
next.config.ts              # Next.js 설정 (API 프록시)
```

### 8.3 next.config.ts — API 프록시 설정

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // 정적 내보내기 비활성화 (SSR 필요)
    images: { unoptimized: true },
    
    async rewrites() {
        // 브라우저 요청: /api/v1/* → FastAPI :8100
        // CORS 제거 + 내부 URL 추상화
        const apiUrl = process.env.FDC_API_INTERNAL_URL ?? 'http://localhost:8100';
        return [
            {
                source: '/api/v1/:path*',
                destination: `${apiUrl}/api/v1/:path*`,
            },
        ];
    },
};

export default nextConfig;
```

### 8.4 lib/timeseries-client.ts — FastAPI 클라이언트

```typescript
// 모든 API 호출은 상대 경로 사용 (next.config.ts가 프록시)
const API_BASE = '/api/v1';

export async function getEquipmentList(): Promise<Equipment[]> {
    const res = await fetch(`${API_BASE}/equipment`);
    if (!res.ok) throw new Error('장비 목록 로드 실패');
    return res.json();
}

export async function queryTimeSeries(params: {
    eqp_id: string;
    svid_name: string;
    start: string;
    end: string;
    resolution?: '1m' | '15m' | 'raw';
}): Promise<TimeSeriesPoint[]> {
    const url = new URL(`${API_BASE}/query`, window.location.origin);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const res = await fetch(url.toString());
    return res.json();
}

export async function getSpcChart(eqp_id: string, svid_name: string, params: {
    hours?: number;
    recipe_id?: string;
}): Promise<SpcChartData> {
    const url = new URL(`${API_BASE}/spc/${eqp_id}/chart`, window.location.origin);
    url.searchParams.set('svid_name', svid_name);
    if (params.hours) url.searchParams.set('hours', String(params.hours));
    const res = await fetch(url.toString());
    return res.json();
}

export async function getFleetAlarmSummary(): Promise<FleetAlarmSummary> {
    const res = await fetch(`${API_BASE}/fleet-alarm-summary`);
    return res.json();
}
```

### 8.5 주요 페이지 구현

#### Fleet Monitor (app/fdc/page.tsx)

```tsx
'use client';
import { useEffect, useState } from 'react';
import { getEquipmentList, getFleetAlarmSummary } from '@/lib/timeseries-client';
import { useFab } from '@/lib/use-fab';

export default function FleetMonitorPage() {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [alarms, setAlarms] = useState<FleetAlarmSummary>({});
    const { fab } = useFab();  // 'ALL' | 'NS1' | 'NS2'
    
    useEffect(() => {
        // 장비 목록 + 알람 동시 로드
        Promise.all([
            getEquipmentList(),
            getFleetAlarmSummary(),
        ]).then(([eqpList, alarmData]) => {
            setEquipment(eqpList);
            setAlarms(alarmData);
        });
        
        // 30초 자동 갱신
        const interval = setInterval(() => {
            getFleetAlarmSummary().then(setAlarms);
        }, 30_000);
        return () => clearInterval(interval);
    }, []);
    
    // FAB 필터 적용
    const filtered = equipment.filter(e =>
        fab === 'ALL' || normalizeFab(e.campus) === fab
    );
    
    return (
        <div className="grid grid-cols-4 gap-4 p-4">
            {filtered.map(eqp => (
                <EquipmentCard
                    key={eqp.eqp_id}
                    equipment={eqp}
                    alarmCount={alarms[eqp.eqp_id]?.ooc_count ?? 0}
                    oosCount={alarms[eqp.eqp_id]?.oos_count ?? 0}
                />
            ))}
        </div>
    );
}
```

#### History Explorer (app/fdc/history/page.tsx)

```tsx
/**
 * 핵심 기능:
 * 1. 장비 선택 → SVID 목록 로드
 * 2. SVID 선택 → 시계열 차트 표시
 * 3. 기간 선택 (1h / 8h / 24h / 7d / 30d)
 * 4. PCA 건강도 탭 (T²/SPE)
 * 5. SPC 알람 오버레이
 */
```

### 8.6 FDC 레이아웃 (app/fdc/layout.tsx)

```tsx
// 탭 네비게이션 + FAB 선택기 + AI 채팅 버튼
export default function FdcLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            {/* 탭 네비게이션 */}
            <nav className="tab-nav">
                <TabLink href="/fdc">장비 현황</TabLink>
                <TabLink href="/fdc/history">이력 조회</TabLink>
                <TabLink href="/fdc/compare">비교 분석</TabLink>
                <TabLink href="/fdc/trace">트레이스 조회</TabLink>
            </nav>
            
            {/* FAB 선택기 (All / NS1 / NS2) */}
            <FabSelector />
            
            {/* 페이지 콘텐츠 */}
            <main>{children}</main>
            
            {/* AI 채팅 플로팅 버튼 + 패널 */}
            <ChatToggle />
        </div>
    );
}
```

### 8.7 lib/types.ts — 핵심 타입

```typescript
export interface Equipment {
    eqp_id: string;
    dcp_id: string;
    model: string;
    campus: string;
    status: 'RUN' | 'IDLE' | 'DOWN' | 'UNKNOWN';
    status_since: string;
    current_lot_id: string | null;
    current_recipe_id: string | null;
}

export interface SvidParameter {
    svid_name: string;
    chamber: string;
    sensor: string;
    units: string;
    alarm_lo: number | null;
    alarm_hi: number | null;
    category: 'recipe' | 'health' | 'grey';  // svid_classification에서
}

export interface TimeSeriesPoint {
    ts: string;      // ISO 8601
    value: number;
    lot_id?: string;
    recipe_id?: string;
}

export interface SpcChartData {
    points: Array<{
        ts: string;
        value: number;
        ewma?: number;
        ucl: number;
        lcl: number;
        alarm: boolean;
        rule?: string;
        classification?: 'ooc' | 'oos';
    }>;
    baseline: {
        mu: number;
        sigma: number;
        recipe_id: string;
        step_id: string;
    };
    spec_limits?: {
        ucl: number;
        lcl: number;
    };
}

export interface TraceResponse {
    lot_id: string;
    substrates: string[];
    journey: Array<{
        eqp_id: string;
        chamber: string;
        recipe_id: string;
        start_time: string;
        end_time: string;
        alarm_count: number;
    }>;
}

export interface ChamberHealthPoint {
    ts: string;
    t_squared: number;
    spe: number;
    t2_limit: number;
    spe_limit: number;
    alarm: boolean;
    alarm_type?: 't2' | 'spe' | 'both';
}
```

---

## 9. 인증 (Azure AD SSO)

### 9.1 Azure 설정 (사전 준비)

1. Azure Portal → Azure Active Directory → 앱 등록
2. 앱 이름: `FDC Portal`
3. **리다이렉트 URI** 추가:
   - `https://fdc.company.co.kr/api/auth/callback/microsoft-entra-id`
   - `http://localhost:3000/api/auth/callback/microsoft-entra-id` (개발용)
4. 클라이언트 비밀 생성 → 값 보관
5. 테넌트 ID, 클라이언트 ID 확인

### 9.2 auth.ts 구현

```typescript
import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        MicrosoftEntraID({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
        }),
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, profile }) {
            // Azure OIDC 클레임 보존
            if (profile) {
                token.oid = (profile as any).oid;
                token.upn = (profile as any).upn;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).oid = token.oid;
                (session.user as any).upn = token.upn;
            }
            return session;
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isProtected = nextUrl.pathname.startsWith('/fdc');
            if (isProtected) return isLoggedIn;
            return true;
        },
    },
});
```

### 9.3 middleware.ts

```typescript
import { auth } from './auth';

export default auth((req) => {
    const { pathname } = req.nextUrl;
    const host = req.headers.get('host') ?? '';
    
    // 로컬호스트 우회 (개발 환경)
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
        return;
    }
    
    // /api/chat 보호
    if (pathname.startsWith('/api/chat') && !req.auth) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    // /fdc/* 보호 → 로그인 페이지로
    if (pathname.startsWith('/fdc') && !req.auth) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', req.url);
        return Response.redirect(loginUrl);
    }
});

export const config = {
    matcher: ['/((?!api/auth|_next|favicon.ico).*)'],
};
```

### 9.4 환경변수 (Azure AD)

```env
# .env.local (개발)
AZURE_AD_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_AD_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
AZURE_AD_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXTAUTH_SECRET=random-32-char-secret-here
AUTH_URL=https://fdc.company.co.kr  # 프로덕션 canonical URL

# 중요: AUTH_URL은 Azure 콜백 URL과 일치해야 함
# nginx가 HTTPS 종단이므로 반드시 https://로 설정
```

---

## 10. AI 챗봇 통합

### 10.1 아키텍처 개요

```
브라우저 (ChatPanel.tsx)
    ↓ POST /api/chat (SSE)
Next.js API Route (app/api/chat/route.ts)
    ├── Gemini API (기본)
    │     └── Function Calling → tool-executor.ts
    └── Anthropic API (선택)
          └── Tool Use → tool-executor.ts
                          ↓
                      FastAPI :8100 (24개 도구)
```

### 10.2 채팅 API (app/api/chat/route.ts)

```typescript
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    const { messages, context } = await req.json();
    
    // SSE 스트림 설정
    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, data: object) => {
                controller.enqueue(
                    new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
                );
            };
            
            try {
                // 컨텍스트 기반 시스템 프롬프트 생성
                const systemPrompt = buildSystemPrompt(context);
                
                const provider = process.env.CHAT_PROVIDER ?? 'gemini';
                
                if (provider === 'gemini') {
                    await runGemini(messages, systemPrompt, send);
                } else {
                    await runAnthropic(messages, systemPrompt, send);
                }
            } finally {
                send('done', {});
                controller.close();
            }
        }
    });
    
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
```

### 10.3 도구 목록 (24개)

```typescript
// tool-definitions.ts
export const FDC_TOOLS = [
    // 시계열 조회
    { name: 'query', description: 'SVID 시계열 데이터 조회' },
    { name: 'stats', description: '통계 요약 (평균, 표준편차)' },
    { name: 'compare', description: '여러 장비/SVID 비교' },
    { name: 'changepoints', description: '변화점 자동 감지' },
    { name: 'spec_limits', description: 'Oracle MES 스펙 한계 조회' },
    
    // SPC
    { name: 'spc', description: 'SPC 알람 현황 조회' },
    { name: 'spc_baselines', description: 'SPC 베이스라인 목록' },
    { name: 'spc_summary', description: 'SPC 요약 리포트' },
    
    // 메타데이터
    { name: 'equipment_svids', description: '장비 SVID 목록' },
    { name: 'lot_history', description: 'LOT 방문 이력' },
    
    // Fleet
    { name: 'fleet_alarm_summary', description: 'Fleet 전체 알람 요약' },
    { name: 'alarm_review', description: 'AI 알람 리뷰 보고서' },
    { name: 'alarm_review_refresh', description: '알람 리뷰 새로고침' },
    
    // PCA
    { name: 'chamber_health', description: 'PCA 챔버 건강도' },
    
    // 비교 분석
    { name: 't2t_analysis', description: 'Tool-to-Tool 비교' },
    { name: 'c2c_analysis', description: 'Chamber-to-Chamber 비교' },
    { name: 'cross_c2c', description: 'Cross 챔버 상관 분석' },
    { name: 'health_scorecard', description: '건강도 스코어카드' },
    
    // 분석
    { name: 'alarm_rate_comparison', description: '알람율 비교' },
    { name: 'case_study_search', description: 'Case Study 검색' },
];
```

### 10.4 컨텍스트별 시스템 프롬프트 (lib/chat-context.ts)

```typescript
export type ChatContext =
    | { scope: 'fleet'; fab: string }
    | { scope: 'equipment'; eqp_id: string; model: string; oos_count: number; ooc_count: number }
    | { scope: 'svid'; eqp_id: string; svid_name: string; cv_band: string; mu: number; sigma: number }
    | { scope: 'lot'; lot_id: string; substrate_id: string; journey_steps: number };

export function buildSystemPrompt(context: ChatContext): string {
    const base = `당신은 반도체 제조 장비 전문 AI 어시스턴트입니다.
FDC(Fault Detection & Classification) 데이터를 분석하고 엔지니어를 지원합니다.`;
    
    switch (context.scope) {
        case 'fleet':
            return `${base}
현재 컨텍스트: Fleet 전체 모니터링 (FAB: ${context.fab})
장비 현황과 알람 트렌드를 분석하여 이상 장비를 파악하세요.`;
        
        case 'equipment':
            return `${base}
현재 컨텍스트: ${context.eqp_id} (${context.model})
OOS 알람: ${context.oos_count}건, OOC 알람: ${context.ooc_count}건
장비 상태를 진단하고 원인을 분석하세요.`;
        
        case 'svid':
            return `${base}
현재 컨텍스트: ${context.eqp_id} - ${context.svid_name}
CV Band: ${context.cv_band}, μ=${context.mu.toFixed(3)}, σ=${context.sigma.toFixed(3)}
이 파라미터의 트렌드와 알람 원인을 분석하세요.`;
    }
}
```

---

## 11. 차트 시각화

### 11.1 차트 라이브러리 선택

> **Canvas 직접 렌더링** (외부 차트 라이브러리 미사용).  
> 이유: 반도체 센서 데이터는 초당 수백 포인트 → 일반 SVG 기반 차트는 성능 부족.

### 11.2 색상 팔레트 (lib/chart-utils.ts)

```typescript
export const CHART_COLORS = [
    '#FEA413',  // Orange (기본, 주요 SVID)
    '#23438E',  // Dark Blue
    '#43AD49',  // Green
    '#D4252C',  // Red (알람)
    '#A5A8AF',  // Gray (UCL/LCL)
    '#E87D1E',  // Deep Orange
    '#5B8ED6',  // Light Blue
    '#8B5CF6',  // Purple
    '#EC4899',  // Pink
    '#14B8A6',  // Teal
];

// 알람 색상
export const ALARM_COLORS = {
    oos: '#D4252C',   // 빨강 (Out-of-Spec)
    ooc: '#FEA413',   // 주황 (Out-of-Control, EWMA/CUSUM)
    weco: '#EAB308',  // 노랑 (WECO 규칙)
};
```

### 11.3 시계열 차트 렌더링

```typescript
// Canvas 기반 렌더러 (useCanvasRenderer.ts)
export function renderTimeSeries(
    canvas: HTMLCanvasElement,
    data: TimeSeriesPoint[],
    options: {
        ucl?: number;
        lcl?: number;
        alarmPoints?: Set<string>;  // ts → alarm type
        showLotMarkers?: boolean;
    }
) {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    
    // 좌표 변환 함수
    const xScale = (ts: string) => /* ts → px */;
    const yScale = (val: number) => /* val → px */;
    
    // 배경
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    // UCL/LCL 띠
    if (options.ucl && options.lcl) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.fillRect(0, yScale(options.ucl), width, yScale(options.lcl) - yScale(options.ucl));
    }
    
    // 데이터 라인
    ctx.strokeStyle = CHART_COLORS[0];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    data.forEach((pt, i) => {
        const x = xScale(pt.ts);
        const y = yScale(pt.value);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // 알람 포인트 (빨간 점)
    data.forEach(pt => {
        if (options.alarmPoints?.has(pt.ts)) {
            ctx.fillStyle = ALARM_COLORS.ooc;
            ctx.beginPath();
            ctx.arc(xScale(pt.ts), yScale(pt.value), 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}
```

### 11.4 SPC 제어도

```tsx
// SpcChart 컴포넌트 핵심 구조
function SpcChart({ data }: { data: SpcChartData }) {
    return (
        <div className="spc-chart">
            {/* 헤더: μ, σ, 레시피 */}
            <div className="baseline-info">
                μ = {data.baseline.mu.toFixed(4)},
                σ = {data.baseline.sigma.toFixed(4)}
            </div>
            
            {/* 메인 차트 (Canvas) */}
            <canvas ref={canvasRef} />
            
            {/* 알람 배지 범례 */}
            <div className="alarm-legend">
                <Badge color="red">OOS {oosCount}</Badge>
                <Badge color="orange">EWMA {ewmaCount}</Badge>
                <Badge color="yellow">WECO {wecoCount}</Badge>
            </div>
        </div>
    );
}
```

---

## 12. systemd 서비스 설정

### 12.1 환경 변수 파일

```bash
# /home/ai-equipment/.config/fdc/env.conf
# (systemd EnvironmentFile로 로드)

# Next.js
NEXTAUTH_SECRET=your-32-char-secret
AUTH_URL=https://fdc.company.co.kr
AZURE_AD_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_AD_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
AZURE_AD_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CHAT_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...
ANTHROPIC_API_KEY=sk-ant-...
FDC_API_INTERNAL_URL=http://localhost:8100

# Python 백엔드
TIMESCALE_HOST=localhost
TIMESCALE_PORT=5432
TIMESCALE_DBNAME=fdc
TIMESCALE_USER=fdc_user
TIMESCALE_PASSWORD=your_db_password
ORACLE_USER=fdc_read
ORACLE_PASSWORD=oracle_password
ORACLE_DSN=oracle-host:1521/CCUBE
```

### 12.2 Next.js 프론트엔드 서비스

```ini
# /etc/systemd/system/fdc-portal.service
[Unit]
Description=FDC Research Portal (Next.js)
After=network.target fdc-api.service

[Service]
Type=simple
User=ai-equipment
WorkingDirectory=/home/ai-equipment/fdc-portal
EnvironmentFile=/home/ai-equipment/.config/fdc/env.conf
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npx next start
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 12.3 FastAPI 서비스

```ini
# /etc/systemd/system/fdc-api.service
[Unit]
Description=FDC FastAPI Backend
After=postgresql.service

[Service]
Type=simple
User=ai-equipment
WorkingDirectory=/home/ai-equipment/fdc-portal/tooling
EnvironmentFile=/home/ai-equipment/.config/fdc/env.conf
ExecStart=/home/ai-equipment/fdc-portal/tooling/.venv/bin/uvicorn \
    extractor.api:app --host 0.0.0.0 --port 8100 --workers 2
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 12.4 데이터 추출 서비스

```ini
# /etc/systemd/system/fdc-extractor.service
[Unit]
Description=FDC BLOB Extractor (Oracle → TimescaleDB)
After=postgresql.service fdc-api.service

[Service]
Type=simple
User=ai-equipment
WorkingDirectory=/home/ai-equipment/fdc-portal/tooling
EnvironmentFile=/home/ai-equipment/.config/fdc/env.conf
ExecStart=/home/ai-equipment/fdc-portal/tooling/.venv/bin/python \
    -m extractor.main
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

### 12.5 SPC Runner 서비스

```ini
# /etc/systemd/system/fdc-spc-runner.service
[Unit]
Description=FDC SPC Alarm Runner
After=postgresql.service

[Service]
Type=simple
User=ai-equipment
WorkingDirectory=/home/ai-equipment/fdc-portal/tooling
EnvironmentFile=/home/ai-equipment/.config/fdc/env.conf
ExecStart=/home/ai-equipment/fdc-portal/tooling/.venv/bin/python \
    -m extractor.spc_runner
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

### 12.6 PCA Runner 서비스

```ini
# /etc/systemd/system/fdc-pca.service
[Unit]
Description=FDC PCA Chamber Health Runner
After=postgresql.service

[Service]
Type=simple
User=ai-equipment
WorkingDirectory=/home/ai-equipment/fdc-portal/tooling
EnvironmentFile=/home/ai-equipment/.config/fdc/env.conf
ExecStart=/home/ai-equipment/fdc-portal/tooling/.venv/bin/python \
    -m extractor.pca_runner
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

### 12.7 서비스 활성화

```bash
sudo systemctl daemon-reload
sudo systemctl enable fdc-portal fdc-api fdc-extractor fdc-spc-runner fdc-pca
sudo systemctl start fdc-portal fdc-api fdc-extractor fdc-spc-runner fdc-pca

# 상태 확인
sudo systemctl status fdc-portal
sudo journalctl -u fdc-extractor -f  # 실시간 로그
```

---

## 13. 배포 워크플로우

### 13.1 최초 배포 (Full Setup)

```bash
# 1. 코드 클론
ssh ai-equipment@linux-server
cd ~
git clone git@github.com:company/fdc-portal.git
cd fdc-portal

# 2. Python 가상환경 생성
cd tooling
uv venv --python 3.11
uv sync --project extractor

# 3. DB 스키마 적용
psql -U fdc_user -d fdc -f extractor/schema.sql

# 4. 베이스라인 초기화 (최초 1회)
uv run --project extractor python -m extractor.seed_baselines

# 5. Next.js 빌드
cd ~/fdc-portal
npm ci
npx next build

# 6. 서비스 시작
sudo systemctl start fdc-api fdc-extractor fdc-spc-runner fdc-pca fdc-portal
```

### 13.2 코드 업데이트 배포

```bash
# 프론트엔드 배포
ssh linux-server 'cd ~/fdc-portal && git pull && npx next build && sudo -n systemctl restart fdc-portal'

# 백엔드 배포 (서비스별 재시작)
ssh linux-server 'cd ~/fdc-portal && git pull && sudo -n systemctl restart fdc-api'
ssh linux-server 'sudo -n systemctl restart fdc-spc-runner'
ssh linux-server 'sudo -n systemctl restart fdc-extractor'
ssh linux-server 'sudo -n systemctl restart fdc-pca'
```

> **주의**: `sudo -n` 한 번에 하나의 서비스만 재시작. 여러 서비스를 한 줄 명령으로 나열하지 않음.

### 13.3 개발 환경 설정 (집에서 원격 개발)

```bash
# SSH 터널 (Mac → linux-server API)
ssh -f -N -L 8100:localhost:8100 ai-equipment@linux-server

# .env.local 설정
cat > .env.local <<EOF
FDC_API_INTERNAL_URL=http://localhost:8100
NEXTAUTH_SECRET=dev-secret-not-for-prod
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...
CHAT_PROVIDER=gemini
GEMINI_API_KEY=...
EOF

# 로컬 빌드 + 실행
npx next build && npx next start
# → http://localhost:3000 (tunnel → linux-server:8100 → PostgreSQL)
```

---

## 14. 테스트 전략

### 14.1 Python 백엔드 (pytest)

```bash
cd tooling
uv run --project extractor pytest -x -q \
    --ignore=extractor/tests/test_config.py
```

**테스트 커버리지**:

| 테스트 파일 | 대상 |
|------------|------|
| `test_blob_parser.py` | Oracle BLOB 파싱 정확성 |
| `test_spc_engine.py` | EWMA/CUSUM/WECO 알람 감지 |
| `test_changepoint.py` | 변화점 감지 (ruptures) |
| `test_bootstrap_baselines.py` | 베이스라인 계산 |
| `test_api_contracts.py` | API 응답 스키마 |
| `test_api_lot_genealogy.py` | LOT 계보 조회 |

### 14.2 프론트엔드 단위 테스트 (Vitest)

```bash
npx vitest run
```

### 14.3 E2E 테스트 (Playwright)

```bash
# 원격 서버 실행
ssh linux-server 'cd ~/fdc-portal && npx playwright test --workers=1'

# 로컬 LAN 환경
BASE_URL=http://192.168.100.230:3000 npx playwright test
```

**E2E 테스트 커버리지**:
- Fleet Monitor 로드 및 카드 표시
- History Explorer 장비 선택 → SVID → 차트
- Trace Viewer LOT 검색 → Journey 표시
- SPC 차트 렌더링

---

## 15. 환경변수 전체 목록

### Next.js (.env.local 또는 systemd EnvironmentFile)

| 변수 | 필수 | 설명 | 예시 |
|------|-----|------|------|
| `NEXTAUTH_SECRET` | ✅ | JWT 서명 비밀키 (32자 이상) | `openssl rand -hex 32` |
| `AUTH_URL` | ✅ | 정규 URL (Azure 콜백 일치) | `https://fdc.company.co.kr` |
| `AZURE_AD_CLIENT_ID` | ✅ | Azure 앱 클라이언트 ID | `xxxxxxxx-xxxx-...` |
| `AZURE_AD_CLIENT_SECRET` | ✅ | Azure 앱 클라이언트 비밀키 | |
| `AZURE_AD_TENANT_ID` | ✅ | Azure 테넌트 ID | |
| `FDC_API_INTERNAL_URL` | ✅ | FastAPI 내부 URL | `http://localhost:8100` |
| `CHAT_PROVIDER` | | AI 공급자 (`gemini`/`anthropic`) | `gemini` |
| `GEMINI_API_KEY` | | Google Gemini API 키 | `AIzaSy...` |
| `ANTHROPIC_API_KEY` | | Anthropic Claude API 키 | `sk-ant-...` |
| `NEXT_PUBLIC_FDC_API_URL` | | 브라우저 공개 API URL (선택) | |

### Python 백엔드

| 변수 | 필수 | 설명 | 예시 |
|------|-----|------|------|
| `TIMESCALE_HOST` | ✅ | TimescaleDB 호스트 | `localhost` |
| `TIMESCALE_PORT` | | TimescaleDB 포트 | `5432` |
| `TIMESCALE_DBNAME` | ✅ | DB 이름 | `fdc` |
| `TIMESCALE_USER` | ✅ | DB 사용자 | `fdc_user` |
| `TIMESCALE_PASSWORD` | ✅ | DB 비밀번호 | |
| `ORACLE_USER` | ✅ | Oracle 사용자 | `fdc_read` |
| `ORACLE_PASSWORD` | ✅ | Oracle 비밀번호 | |
| `ORACLE_DSN` | ✅ | Oracle DSN | `host:1521/CCUBE` |

---

## 16. 구현 순서 권장

빈 서버에서 구현 시 권장 순서:

```
1주차: 인프라
  □ Linux 서버 OS 설정
  □ PostgreSQL 17 + TimescaleDB 설치
  □ schema.sql 적용
  □ Oracle 연결 테스트

2주차: 데이터 파이프라인
  □ oracle_reader.py — BLOB 페치
  □ blob_parser.py — BLOB 파싱
  □ timescale_writer.py — DB 삽입
  □ main.py — 추출 루프
  □ extraction_watermark 동작 확인
  □ svid_1min 롤업 확인

3주차: FastAPI 백엔드
  □ config.py, DB 연결 풀
  □ /api/v1/equipment 엔드포인트
  □ /api/v1/query 엔드포인트
  □ /api/v1/trace 엔드포인트
  □ pytest로 API 계약 검증

4주차: SPC 엔진
  □ spc_engine.py (EWMA, CUSUM, WECO)
  □ spc_baselines.py (베이스라인 CRUD)
  □ spc_runner.py (실시간 루프)
  □ seed_baselines.py (초기 데이터)
  □ /api/v1/spc/* 엔드포인트

5주차: Next.js 프론트엔드
  □ next.config.ts (프록시 설정)
  □ auth.ts + middleware.ts (Azure SSO)
  □ lib/timeseries-client.ts
  □ app/fdc/layout.tsx (탭, FAB)
  □ app/fdc/page.tsx (Fleet Monitor)
  □ app/fdc/history/page.tsx

6주차: 차트 + 고급 기능
  □ Canvas 시계열 렌더러
  □ SPC 제어도
  □ app/fdc/trace/page.tsx
  □ PCA Runner
  □ AI 챗봇 통합

7주차: 운영 환경
  □ systemd 서비스 설정
  □ nginx + SSL 설정
  □ Azure AD SSO 프로덕션 등록
  □ E2E 테스트
  □ 모니터링 (journalctl, 알람 로그)
```

---

*작성일: 2026-04-15*  
*버전: 1.0.0*  
*기반 프로젝트: FDC Portal (commit 472bec4)*
