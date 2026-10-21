"""Konfigurasi terpusat: path, API key, hyperparameter inference, dan registry model."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# ── API keys ───────────────────────────────────────────────────────────
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY", "")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# ── Artefak model ──────────────────────────────────────────────────────
MODELS_DIR     = Path(os.getenv("MODELS_DIR", BASE_DIR / "models"))
TOKENIZER_PATH = MODELS_DIR / "tokenizer.pkl"

# Harus SAMA dengan notebook training (lihat cell HYPERPARAMETER).
MAX_LEN   = 512    # HEAD(256) + TAIL(256)
THRESHOLD = 0.5    # P(inappropriate) > THRESHOLD → label 1

# Ambang confidence: |p - 0.5| * 2 > nilai ini → "Sangat Yakin"
CONFIDENCE_THRESHOLD = 0.5

# ── Registry model ─────────────────────────────────────────────────────
# Satu-satunya sumber metadata model. Metrik diambil dari hasil evaluasi
# test set di masing-masing notebook. Key = nama file .h5 (tanpa ekstensi).
MODEL_REGISTRY = {
    "bilstm_headtail_content_moderation": {
        "label": "biLSTM",
        "description": "Bidirectional LSTM — baseline",
        "accuracy": "88.18%", "f1": "0.8787",
        "notebook": "notebook/bilstm-only (4).ipynb",
    },
    "cnn_bilstm_content_moderation": {
        "label": "CNN-biLSTM",
        "description": "CNN + biLSTM — akurasi tertinggi",
        "accuracy": "88.64%", "f1": "0.8828",
        "notebook": "notebook/cnn-bilstm (1).ipynb",
    },
    "bilstm_attention_content_moderation": {
        "label": "biLSTM-Attention",
        "description": "biLSTM + Attention — AUC tertinggi",
        "accuracy": "88.11%", "f1": "0.8781",
        "notebook": "notebook/bilstm-attention (1).ipynb",
    },
    "cnn_bilstm_attention": {
        "label": "CNN-biLSTM-Attention",
        "description": "CNN + biLSTM + Attention",
        "accuracy": "88.18%", "f1": "0.8788",
        "notebook": "notebook/cnn-bilstm-attention (1).ipynb",
    },
}
DEFAULT_MODEL = "cnn_bilstm_attention"
