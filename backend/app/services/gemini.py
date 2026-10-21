"""Gemini: kategori konten, ringkasan, dan analisis child safety (dengan cache per video)."""
import asyncio
import logging

import httpx

from app.config import GEMINI_API_KEY

log = logging.getLogger(__name__)

MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"]   # fallback berurutan

PROMPTS = {
    "summary":        ("Ringkas dalam Bahasa Indonesia (3-5 kalimat):\n\n{}", 4000),
    "child_analysis": ("2-3 kalimat: aman untuk anak <13 tahun? Verdict + alasan + rekomendasi usia:\n\n{}", 1500),
    "content_type":   ("Kategori konten 1-2 kata (Edukasi/Hiburan/Musik/Gaming/Vlog/dll). Jawab kategori saja:\n\n{}", 1000),
}

_cache = {}


class GeminiError(Exception):
    pass


async def ask(text, task):
    if not GEMINI_API_KEY:
        raise GeminiError("Gemini API key belum diset.")
    template, limit = PROMPTS[task]
    payload = {"contents": [{"parts": [{"text": template.format(text[:limit])}]}]}

    async with httpx.AsyncClient(timeout=20) as c:
        for model in MODELS:
            r = await c.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                json=payload,
                headers={"x-goog-api-key": GEMINI_API_KEY},   # key di header, bukan URL → tidak ikut ter-log
            )
            if r.status_code == 429:    # rate limit → coba model berikutnya
                await asyncio.sleep(3)
                continue
            if r.is_error:
                raise GeminiError(f"Error ({model}): HTTP {r.status_code}")
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
    raise GeminiError("Gemini sibuk / kuota habis. Coba lagi nanti.")


async def analyze_video_text(video_id, title, description, comments_text):
    """Return (dict hasil, from_cache). Hanya hasil sukses yang di-cache."""
    if video_id in _cache:
        return _cache[video_id], True

    full = f"Judul: {title}\nDeskripsi: {description}\nKomentar: {comments_text}"
    jobs = [("category", f"{title} {description[:500]}", "content_type"),
            ("summary", full, "summary"),
            ("child_analysis", full, "child_analysis")]

    result, ok = {}, True
    for i, (key, text, task) in enumerate(jobs):
        if i:
            await asyncio.sleep(1)   # jeda kecil supaya tidak kena rate limit free tier
        try:
            result[key] = (await ask(text, task)).strip()
        except (GeminiError, httpx.HTTPError, KeyError) as e:
            log.warning("Gemini %s gagal untuk %s: %s", task, video_id, e)
            result[key] = str(e) or "Gemini error"
            ok = False

    if ok:
        _cache[video_id] = result
    return result, False


def clear_cache(video_id):
    return _cache.pop(video_id, None) is not None


def cache_size():
    return len(_cache)
