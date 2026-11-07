"""Tạo thư mục công khai chỉ chứa tài nguyên của bộ đọc."""
from pathlib import Path
import shutil
import tempfile

PUBLIC_DIRECTORIES = ("assets", "books", "js", "styles", "vendor")


def web_bundle_version(source):
    source = Path(source)
    files = [source / "index.html"]
    files.extend(path for name in PUBLIC_DIRECTORIES for path in (source / name).rglob("*") if path.is_file())
    return tuple((path.relative_to(source).as_posix(), path.stat().st_mtime_ns, path.stat().st_size) for path in sorted(files))


def build_web_bundle(source, destination=None):
    source = Path(source)
    target = Path(destination) if destination is not None else Path(tempfile.mkdtemp(prefix="sotay-web-"))
    target.mkdir(parents=True, exist_ok=True)
    for name in PUBLIC_DIRECTORIES:
        shutil.copytree(source / name, target / name, dirs_exist_ok=True)
    index = (source / "index.html").read_text(encoding="utf-8")
    if "</body>" not in index:
        raise ValueError("Không tìm thấy thẻ đóng body trong trang chính")
    index = index.replace("</body>", '<script src="assets/streamlit-bridge.js"></script>\n</body>')
    (target / "index.html").write_text(index, encoding="utf-8")
    return str(target.resolve())
