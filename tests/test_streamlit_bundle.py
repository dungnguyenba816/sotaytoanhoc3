"""Kiểm tra nội dung công khai và sự nguyên vẹn khi đóng gói Streamlit."""
import hashlib
from pathlib import Path
import tempfile
import unittest

from web_bundle import build_web_bundle

ROOT = Path(__file__).resolve().parents[1]


class BundleChecks(unittest.TestCase):
    def test_public_bundle_and_original_pdfs(self):
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(build_web_bundle(ROOT, temporary))
            self.assertEqual({p.name for p in target.iterdir()}, {"assets", "books", "js", "styles", "vendor", "index.html"})
            for path in (ROOT / "books").glob("*.pdf"):
                self.assertEqual(hashlib.sha256(path.read_bytes()).digest(), hashlib.sha256((target / "books" / path.name).read_bytes()).digest())
            self.assertIn('src="assets/streamlit-bridge.js"', (target / "index.html").read_text())
            self.assertNotIn("streamlit-bridge.js", (ROOT / "index.html").read_text())
            self.assertTrue((target / "vendor/pdfjs/pdf.worker.mjs").is_file())
            self.assertFalse((target / ".streamlit/secrets.toml").exists())
            self.assertFalse((target / "streamlit_app.py").exists())


if __name__ == "__main__":
    unittest.main(verbosity=2)
