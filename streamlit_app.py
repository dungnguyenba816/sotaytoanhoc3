"""Điểm vào cho Streamlit Community Cloud."""
import mimetypes
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

from web_bundle import build_web_bundle, web_bundle_version

ROOT = Path(__file__).resolve().parent
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("application/wasm", ".wasm")

st.set_page_config(
    page_title="Sổ tay Toán học 3",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="collapsed",
)


@st.cache_resource(max_entries=1)
def component_directory(version):
    return build_web_bundle(ROOT)


st.markdown(
    """<style>
    [data-testid="stHeader"], [data-testid="stToolbar"] { display: none; }
    [data-testid="stMainBlockContainer"] { padding: 0; max-width: none; }
    [data-testid="stVerticalBlock"] { gap: 0; }
    iframe[title*="ebook_library"] { display: block; border: 0; width: 100%; }
    </style>""",
    unsafe_allow_html=True,
)

ebook_library = components.declare_component("ebook_library", path=component_directory(web_bundle_version(ROOT)))
ebook_library(key="ebook_library", default=None)
