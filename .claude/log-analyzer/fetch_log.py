"""FTP 방식으로 로그를 수집하여 로컬에 저장한다."""

import argparse
import gzip
import json
import os
import shutil
import sys
import time
from datetime import datetime
from ftplib import FTP

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, "config.json")

TIMEOUT = 10


def load_config():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        raw = f.read()
    user_profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
    raw = raw.replace("__USERPROFILE__", user_profile.replace("\\", "/"))
    return json.loads(raw)


def load_eqp_info(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def normalize_eqp_id(eqp_id):
    """대소문자/하이픈 무시 비교를 위한 정규화."""
    return eqp_id.upper().replace("-", "")


def find_eqp_key(equipments, eqp_id):
    """정규화된 EQP ID로 equipments 딕셔너리에서 원본 키를 찾는다."""
    normalized = normalize_eqp_id(eqp_id)
    for key in equipments:
        if normalize_eqp_id(key) == normalized:
            return key
    return None


def cleanup_old_logs(download_dir, retention_days):
    """retention_days 이상 경과한 로그 폴더를 삭제한다."""
    if not os.path.exists(download_dir):
        return
    now = time.time()
    cutoff = now - (retention_days * 86400)
    removed = 0
    freed = 0
    for target_name in os.listdir(download_dir):
        target_dir = os.path.join(download_dir, target_name)
        if not os.path.isdir(target_dir):
            continue
        for date_name in os.listdir(target_dir):
            date_dir = os.path.join(target_dir, date_name)
            if not os.path.isdir(date_dir):
                continue
            mtime = os.path.getmtime(date_dir)
            if mtime < cutoff:
                dir_size = sum(
                    os.path.getsize(os.path.join(dp, f))
                    for dp, _, fnames in os.walk(date_dir)
                    for f in fnames
                )
                shutil.rmtree(date_dir)
                removed += 1
                freed += dir_size
        # 빈 target 폴더 제거
        if os.path.isdir(target_dir) and not os.listdir(target_dir):
            os.rmdir(target_dir)
    if removed:
        mb = freed / (1024 * 1024)
        print(f"[cleanup] {removed}개 폴더 삭제 ({mb:.1f}MB 확보)")


# -- FTP (설비 PC) ---------------------------------------------------------------

def ftp_fetch(config, eqp_id, date_str, limit=5):
    """FTP로 설비 PC 로그를 다운로드한다."""
    eqp_info_path = config["eqp_info"]
    if not os.path.exists(eqp_info_path):
        print(f"ERROR: eqp-info.json 이 없습니다.")
        sys.exit(1)

    eqp_data = load_eqp_info(eqp_info_path)
    equipments = eqp_data.get("equipments", {})

    matched_key = find_eqp_key(equipments, eqp_id)
    if not matched_key:
        print(f"ERROR: '{eqp_id}' 설비를 찾을 수 없습니다.")
        sys.exit(1)

    eqp_id = matched_key
    eqp = equipments[eqp_id]
    host = eqp["ip"]
    ftp_user = config["ftp"]["user"]
    ftp_pass = config["ftp"]["password"]
    log_path = config["ftp"]["log_path"]
    download_dir = os.path.join(config["download_dir"], eqp_id, date_str)

    os.makedirs(download_dir, exist_ok=True)

    print(f"[FTP] {eqp_id} ({host}) 접속 중...")
    try:
        ftp = FTP()
        ftp.connect(host, 21, timeout=TIMEOUT)
        ftp.login(ftp_user, ftp_pass)
    except Exception as e:
        print(f"ERROR: FTP 접속 실패 -{e}")
        sys.exit(1)

    # 1단계: 날짜 매칭 파일 목록 수집
    matched_files = []  # (remote_path, filename)

    def collect_files_in_dir(remote_dir, prefix=""):
        """디렉토리를 탐색하여 날짜 매칭 파일 목록을 수집한다."""
        try:
            entries = []
            ftp.retrlines(f"LIST {remote_dir}", entries.append)
        except Exception as e:
            print(f"  WARNING: {remote_dir} 목록 조회 실패 -{e}")
            return

        for entry in entries:
            parts = entry.split()
            if len(parts) < 2:
                continue
            name = parts[-1]
            is_dir = entry.startswith("d")

            if is_dir:
                sub_dir = f"{remote_dir}{name}/"
                collect_files_in_dir(sub_dir, prefix=f"{name}_")
            else:
                lower_name = name.lower()
                if lower_name.endswith(".log") or lower_name.endswith(".txt"):
                    if date_str not in name:
                        continue
                    filename = f"{prefix}{name}" if prefix else name
                    matched_files.append((f"{remote_dir}{name}", filename))

    collect_files_in_dir(log_path)

    if not matched_files:
        ftp.quit()
        print(f"해당 날짜({date_str})의 로그 파일이 없습니다. ({log_path})")
        return

    # 파일명 기준 정렬 후 최신(뒤쪽) N개 선택
    matched_files.sort(key=lambda x: x[1])
    total_matched = len(matched_files)

    if limit and total_matched > limit:
        selected = matched_files[-limit:]
        print(f"해당 날짜 파일 {total_matched}개 중 최근 {limit}개만 다운로드합니다.")
    else:
        selected = matched_files
        print(f"해당 날짜 파일 {total_matched}개 다운로드합니다.")

    # 전체 파일 목록 출력 (선택된 파일 표시)
    selected_names = {s[1] for s in selected}
    for _, filename in matched_files:
        marker = " *" if filename in selected_names else ""
        print(f"  [{filename}]{marker}")

    # 2단계: 선택된 파일 다운로드
    downloaded = []
    for remote_path, filename in selected:
        local_path = os.path.join(download_dir, filename)
        try:
            with open(local_path, "wb") as f:
                ftp.retrbinary(f"RETR {remote_path}", f.write)
            downloaded.append(local_path)
        except Exception as e:
            print(f"  WARNING: {filename} 다운로드 실패 -{e}")

    ftp.quit()

    print(f"\n다운로드 완료: {len(downloaded)}개 파일")
    print(f"저장 경로: {download_dir}")
    for p in downloaded:
        print(f"  {p}")


# -- FTP (서버) ------------------------------------------------------------------

def server_ftp_fetch(config, target, date_str, limit=5):
    """FTP로 서버(NEPES-APP1) 로그를 다운로드한다."""
    server_config = config["server"]
    paths = server_config["paths"]

    if target not in paths:
        print(f"ERROR: 알 수 없는 target '{target}'")
        print(f"사용 가능: {', '.join(paths.keys())}")
        sys.exit(1)

    host = server_config["host"]
    user = server_config["user"]
    password = server_config["password"]
    log_path = paths[target]
    download_dir = os.path.join(config["download_dir"], target, date_str)

    os.makedirs(download_dir, exist_ok=True)

    print(f"[FTP] {host} 접속 중... (target={target})")
    try:
        ftp = FTP()
        ftp.connect(host, 21, timeout=TIMEOUT)
        ftp.login(user, password)
    except Exception as e:
        print(f"ERROR: FTP 접속 실패 -{e}")
        sys.exit(1)

    # 파일 목록 조회
    try:
        entries = []
        ftp.retrlines(f"LIST {log_path}", entries.append)
    except Exception as e:
        print(f"ERROR: {log_path} 디렉토리 조회 실패 -{e}")
        ftp.quit()
        sys.exit(1)

    # 날짜 매칭 로그 파일 필터링 (.log 또는 .log.gz)
    matched_files = []
    all_log_files = []
    for entry in entries:
        parts = entry.split()
        if len(parts) < 2:
            continue
        name = parts[-1]
        if entry.startswith("d"):
            continue
        if not (name.endswith(".log") or name.endswith(".log.gz")):
            continue
        all_log_files.append(name)
        if date_str in name:
            matched_files.append(name)

    if not matched_files:
        print(f"해당 날짜({date_str})의 로그 파일이 없습니다.")
        print(f"\n[최근 파일 5개]")
        all_log_files.sort()
        for f in all_log_files[-5:]:
            print(f"  {f}")
        ftp.quit()
        return

    matched_files.sort()
    total_found = len(matched_files)

    if limit and total_found > limit:
        selected = matched_files[-limit:]
        print(f"해당 날짜 파일 {total_found}개 중 최근 {limit}개만 다운로드합니다.")
    else:
        selected = matched_files
        print(f"해당 날짜 파일 {total_found}개 다운로드합니다.")

    # 전체 파일 목록 출력 (선택된 파일 표시)
    selected_set = set(selected)
    for f in matched_files:
        marker = " *" if f in selected_set else ""
        print(f"  [{f}]{marker}")

    # 다운로드 (.gz인 경우 해제)
    downloaded = []
    for filename in selected:
        remote_path = f"{log_path}{filename}"
        if filename.endswith(".gz"):
            gz_path = os.path.join(download_dir, filename)
            local_path = os.path.join(download_dir, filename.replace(".gz", ""))
            try:
                with open(gz_path, "wb") as fout:
                    ftp.retrbinary(f"RETR {remote_path}", fout.write)
                with gzip.open(gz_path, "rb") as gz_f:
                    with open(local_path, "wb") as out_f:
                        out_f.write(gz_f.read())
                os.remove(gz_path)
                downloaded.append(local_path)
            except Exception as e:
                print(f"  WARNING: {filename} 다운로드 실패 -{e}")
                if os.path.exists(gz_path):
                    os.remove(gz_path)
        else:
            local_path = os.path.join(download_dir, filename)
            try:
                with open(local_path, "wb") as fout:
                    ftp.retrbinary(f"RETR {remote_path}", fout.write)
                downloaded.append(local_path)
            except Exception as e:
                print(f"  WARNING: {filename} 다운로드 실패 -{e}")

    ftp.quit()

    print(f"\n다운로드 완료: {len(downloaded)}개 파일")
    print(f"저장 경로: {download_dir}")
    for p in downloaded:
        print(f"  {p}")


# -- MAIN -----------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="로그 수집 도구")
    parser.add_argument("--type", required=True, choices=["ftp", "server"],
                        help="ftp(설비 PC) 또는 server(NEPES-APP1)")
    parser.add_argument("--eqp", help="FTP 전용. EQP ID (예: PRS-04)")
    parser.add_argument("--target",
                        help="server 전용. rms/framework/amq/das/fdc12/fdc8")
    parser.add_argument("--date", help="날짜 YYYYMMDD (생략 시 오늘)")
    parser.add_argument("--limit", type=int, default=5,
                        help="다운로드할 최대 파일 수 (기본: 5, 0=전체)")
    args = parser.parse_args()

    config = load_config()
    date_str = args.date or datetime.now().strftime("%Y%m%d")
    limit = args.limit if args.limit > 0 else None

    # 오래된 로그 자동 정리
    retention = config.get("retention_days", 3)
    cleanup_old_logs(config["download_dir"], retention)

    if args.type == "ftp":
        if not args.eqp:
            print("ERROR: --type ftp 사용 시 --eqp 인자가 필요합니다.")
            sys.exit(1)
        ftp_fetch(config, args.eqp, date_str, limit=limit)
    elif args.type == "server":
        if not args.target:
            print("ERROR: --type server 사용 시 --target 인자가 필요합니다.")
            sys.exit(1)
        server_ftp_fetch(config, args.target, date_str, limit=limit)


if __name__ == "__main__":
    main()
