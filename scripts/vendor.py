#!/usr/bin/env python3
"""Tải thư viện cố định từ npm, kiểm tra SRI rồi lưu hoàn toàn cục bộ."""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / "vendor"
PACKAGES = {"pdfjs-dist": "4.10.38", "page-flip": "2.0.7"}
INTEGRITIES = {
    "pdfjs-dist": "sha512-/Y3fcFrXEAsMjJXeL9J8+ZG9U01LbuWaYypvDW2ycW1jL269L3js3DVBjDJ0Up9Np1uqDXsDrRihHANhZOlwdQ==",
    "page-flip": "sha512-96lQFUUz7r/LZzEUZJ3yBIMEKU9+m8HMFDzTvTdD6P7Ag/wXINjp9n0W7b4wanwnDbQETo4uNUoL3zMqpFxwGA==",
}


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "SoTayToanHoc3-local-setup/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def archive(name, version):
    metadata = json.loads(fetch(f"https://registry.npmjs.org/{name}/{version}"))
    if metadata.get("name") != name or metadata.get("version") != version:
        raise ValueError("Thông tin gói không khớp phiên bản cố định")
    dist = metadata["dist"]
    if not dist["tarball"].startswith(f"https://registry.npmjs.org/{name}/-/"):
        raise ValueError("Nguồn tải không thuộc npm chính thức")
    data = fetch(dist["tarball"])
    integrity = "sha512-" + base64.b64encode(hashlib.sha512(data).digest()).decode()
    if integrity != dist["integrity"] or integrity != INTEGRITIES[name]:
        raise ValueError(f"Sai mã toàn vẹn SHA-512: {name}")
    return tarfile.open(fileobj=io.BytesIO(data), mode="r:gz"), integrity


def write_member(tar, source, destination):
    member = tar.getmember("package/" + source)
    if not member.isfile():
        raise ValueError(f"Không phải tệp: {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(tar.extractfile(member).read())


def check():
    manifest_path = VENDOR / "manifest.json"
    if not manifest_path.exists():
        print("Thiếu thư viện cục bộ. Chạy: python3 scripts/vendor.py", file=sys.stderr)
        return False
    manifest = json.loads(manifest_path.read_text())
    if manifest["versions"] != PACKAGES:
        raise ValueError("Phiên bản thư viện không khớp")
    if manifest.get("integrity") != INTEGRITIES:
        raise ValueError("Mã gói không khớp bản phân phối cố định")
    required = {"pdfjs/pdf.mjs", "pdfjs/pdf.worker.mjs", "pdfjs/LICENSE", "page-flip/page-flip.module.mjs", "page-flip/LICENSE"}
    normalized_names = {name.replace('\\', '/') for name in manifest["files"]}
    if not required.issubset(normalized_names) or not any(name.startswith("pdfjs/cmaps/") for name in normalized_names) or not any(name.startswith("pdfjs/standard_fonts/") for name in normalized_names):
        raise ValueError("Thiếu tài nguyên bắt buộc trong manifest")
    for name, checksum in manifest["files"].items():
        path = VENDOR / name.replace('\\', '/')
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != checksum:
            raise ValueError(f"Thiếu hoặc sai mã SHA-256: {name}")
    print(f"Đã kiểm tra {len(manifest['files'])} tệp thư viện cục bộ.")
    return True


def install():
    VENDOR.mkdir(exist_ok=True)
    # Download everything before changing the current installation.
    with tempfile.TemporaryDirectory(prefix="sotay-vendor-") as temporary:
        stage = Path(temporary)
        integrities = {}
        for name, version in PACKAGES.items():
            print(f"Đang tải {name}@{version}…", flush=True)
            tar, integrity = archive(name, version)
            integrities[name] = integrity
            with tar:
                if name == "pdfjs-dist":
                    for filename in ["pdf.mjs", "pdf.worker.mjs"]:
                        write_member(tar, "build/" + filename, stage / "pdfjs" / filename)
                    write_member(tar, "LICENSE", stage / "pdfjs/LICENSE")
                    for member in tar.getmembers():
                        rel = member.name.removeprefix("package/")
                        if member.isfile() and (rel.startswith(("cmaps/", "standard_fonts/", "wasm/")) or rel in ["build/pdf.mjs.map", "build/pdf.worker.mjs.map"]):
                            target = rel.removeprefix("build/") if rel.startswith("build/") else rel
                            write_member(tar, rel, stage / "pdfjs" / target)
                else:
                    write_member(tar, "dist/js/page-flip.module.js", stage / "page-flip/page-flip.module.mjs")
                    write_member(tar, "LICENSE", stage / "page-flip/LICENSE")
                    for member in tar.getmembers():
                        if member.isfile() and member.name == "package/dist/js/page-flip.module.js.map":
                            write_member(tar, "dist/js/page-flip.module.js.map", stage / "page-flip/page-flip.module.js.map")
        files = {path.relative_to(stage).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(stage.rglob("*")) if path.is_file()}
        for directory in ["pdfjs", "page-flip"]:
            destination = VENDOR / directory
            if destination.exists():
                shutil.rmtree(destination)
            shutil.copytree(stage / directory, destination)
        (VENDOR / "manifest.json").write_text(json.dumps({"versions": PACKAGES, "integrity": integrities, "files": files}, indent=2) + "\n")
    check()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Kiểm tra thư viện đã có, không truy cập mạng")
    args = parser.parse_args()
    try:
        if args.check:
            sys.exit(0 if check() else 1)
        install()
    except Exception as error:
        print(f"Không chuẩn bị được thư viện: {error}", file=sys.stderr)
        sys.exit(1)
