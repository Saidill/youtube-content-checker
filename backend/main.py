"""Entry point: `uvicorn main:app --reload --port 8000`

Struktur:
  app/config.py          konfigurasi, API key, registry model
  app/schemas.py         skema request
  app/api.py             route FastAPI (orkestrasi)
  app/ml/                preprocessing, load model, inference
  app/analysis/          deteksi kata kasar & fitur teks (rule-based)
  app/services/          YouTube API, transcript, Gemini
"""
from app.api import app  # noqa: F401
