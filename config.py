"""Central config: models, apps to scrape, paths. Change models here only."""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Groq model IDs (verified against /v1/models on 2026-09-26; Groq retires models often)
MODEL_TAGGER = "openai/gpt-oss-20b"      # bulk relevance/aspect/sentiment tagging
MODEL_RESPONDER = "openai/gpt-oss-120b"  # drafts citizen responses
MODEL_JUDGE = "qwen/qwen3.8-27b"         # different family from generator -> less self-preference bias

DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"

# ---------- RAG ----------
KB_MANUAL_DIR = ROOT / "data" / "kb"        # hand-saved official FAQs: <app_id>__<anything>.md/.txt
KB_INDEX_DIR = ROOT / "data" / "kb_index"   # built by `python -m rag.build_kb`
EMBED_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"  # multilingual, CPU-friendly
RAG_TOP_K = 4
RAG_MIN_SCORE = 0.35  # below this a hit is treated as irrelevant
# Official FAQ pages that serve plain HTML, as {app_id: url}. Checked 2026-09-26: the UMANG, DigiLocker,
# UIDAI, BHIM, ABHA, Aarogya Setu, IRCTC and Parivahan FAQ pages are JS-rendered or 404, so save those by
# hand into data/kb/ instead.
KB_URLS: dict[str, str] = {}

# Google Play apps of India's digital public services -> service category (RQ3 grouping)
APPS = {
    "in.gov.umang.negd.g2c": ("UMANG", "citizen_services"),
    "com.digilocker.android": ("DigiLocker", "identity_documents"),
    "in.gov.uidai.mAadhaarPlus": ("mAadhaar", "identity_documents"),
    "in.org.npci.upiapp": ("BHIM", "payments"),
    "nic.goi.aarogyasetu": ("Aarogya Setu", "health"),
    "in.ndhm.phr": ("ABHA", "health"),
    "com.nic.mparivahan": ("mParivahan", "transport"),
    "cris.org.in.prs.ima": ("IRCTC Rail Connect", "transport"),
}

ASPECTS = [
    "login_otp_authentication",
    "server_downtime_performance",
    "ui_usability",
    "aadhaar_kyc_linking",
    "payments_transactions",
    "documents_certificates",
    "customer_support_grievance",
    "privacy_security",
    "app_update_bugs",
    "other",
]
