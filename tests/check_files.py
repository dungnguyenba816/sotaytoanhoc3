"""Kiểm tra cấu trúc và tính nguyên vẹn PDF, không thay thế kiểm tra trình duyệt."""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class FileChecks(unittest.TestCase):
    def test_original_pdfs(self):
        expected = {"so_tay_toan_3_tap_1.pdf": "f6983c0e3fcbb08618f1824ccdce5f2092dd870c7069fd51415479fe4c5842dc", "so_tay_toan_3_tap_2.pdf": "bc2802a20932626371786fb00e6205d1e9c2c686b6f65a680538270ff8f85040"}
        for name, digest in expected.items():
            self.assertEqual(hashlib.sha256((ROOT / "books" / name).read_bytes()).hexdigest(), digest)

    def test_local_entry_assets(self):
        class Parser(HTMLParser):
            def handle_starttag(inner, tag, attrs):
                for key, value in attrs:
                    if key in ("src", "href") and value and not value.startswith("#"):
                        self.assertNotIn("://", value)
                        self.assertTrue((ROOT / value).is_file(), value)
        Parser().feed((ROOT / "index.html").read_text())

    def test_module_imports(self):
        for module in (ROOT / "js").glob("*.js"):
            for rel in re.findall(r"(?:from\s+|import\s*\()['\"]([^'\"]+)", module.read_text()):
                if "vendor/" not in rel:
                    self.assertTrue((module.parent / rel).is_file(), f"{module}: {rel}")

    def test_svg_assets(self):
        for path in (ROOT / "assets").rglob("*.svg"):
            self.assertEqual(ET.parse(path).getroot().tag, "{http://www.w3.org/2000/svg}svg")

    def test_no_runtime_network(self):
        for folder in ["js", "styles"]:
            for path in (ROOT / folder).glob("*"):
                self.assertFalse(re.search(r"(?:https?:)?//(?:cdn|fonts|unpkg|registry)\.", path.read_text()), str(path))

    def test_no_touch_handlers(self):
        for path in (ROOT / "js").glob("*.js"):
            self.assertFalse(re.search(r"addEventListener\(['\"]touch", path.read_text()), str(path))
        self.assertIn("useMouseEvents: false", (ROOT / "js/reader.js").read_text())

    def test_no_page_count_in_course_data(self):
        data = (ROOT / "js/courses.js").read_text()
        self.assertNotIn("totalPages", data)
        self.assertEqual(data.count("id: 'course_"), 2)

    def test_package_is_framework_free(self):
        package = json.loads((ROOT / "package.json").read_text())
        self.assertFalse(package.get("dependencies"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
