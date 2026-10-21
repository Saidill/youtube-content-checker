"""Skema request API (Pydantic)."""
from typing import Optional

from pydantic import BaseModel

from app.config import DEFAULT_MODEL


class _Base(BaseModel):
    model_config = {"protected_namespaces": ()}   # izinkan field berawalan "model_"


class AnalyzeReq(_Base):
    video_id:   str
    model_name: str = DEFAULT_MODEL


class PredictOnlyReq(_Base):
    video_id:      Optional[str] = None   # tidak dipakai, dipertahankan untuk kompatibilitas
    model_name:    str
    combined_text: str


class TextReq(_Base):
    text:       str
    model_name: str = DEFAULT_MODEL
