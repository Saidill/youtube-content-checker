"""Ambil transcript video dengan fallback chain.

1. youtube-transcript-api — coba bahasa prioritas, lalu bahasa apa pun
2. yt-dlp — bisa ambil auto-caption
3. Kosong (model tetap jalan dengan teks lain)

Kedua library bersifat blocking, jadi dijalankan di thread terpisah
supaya tidak memblokir event loop FastAPI.
"""
import asyncio
import glob
import logging
import os
import re
import shutil
import subprocess
import tempfile

log = logging.getLogger(__name__)

LANG_PRIORITY = ['id', 'en', 'en-US', 'en-GB']


async def fetch_transcript(video_id):
    """Return: (transcript_text, method_used) — method: youtube-transcript-api | yt-dlp | none"""
    for method in (_via_transcript_api, _via_ytdlp):
        try:
            text = await asyncio.to_thread(method, video_id)
        except Exception as e:
            log.warning("Transcript %s gagal via %s: %s: %s", video_id, method.__name__, type(e).__name__, e)
            continue
        if text:
            name = "youtube-transcript-api" if method is _via_transcript_api else "yt-dlp"
            log.info("Transcript %s — %d chars via %s", video_id, len(text), name)
            return text, name

    log.info("Transcript %s — semua method gagal, prediksi tanpa transcript", video_id)
    return "", "none"


def _via_transcript_api(video_id):
    from youtube_transcript_api import YouTubeTranscriptApi

    ytt = YouTubeTranscriptApi()
    fetched = None
    for lang in LANG_PRIORITY:
        try:
            fetched = ytt.fetch(video_id, languages=[lang])
            break
        except Exception:
            continue
    if fetched is None:
        fetched = ytt.fetch(video_id)   # bahasa apa pun yang tersedia
    return " ".join(s.text for s in fetched.snippets).strip()


def _via_ytdlp(video_id):
    if not shutil.which("yt-dlp"):
        log.info("yt-dlp tidak terinstall, skip")
        return ""

    # Temp dir per request → aman untuk request paralel & otomatis terhapus
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [
                "yt-dlp",
                "--write-auto-sub",      # ambil auto-generated subtitle
                "--write-sub",           # ambil manual subtitle juga
                "--sub-langs", "id,en",  # prioritas bahasa
                "--sub-format", "vtt",
                "--skip-download",
                "--output", os.path.join(tmp, "sub"),
                f"https://www.youtube.com/watch?v={video_id}",
            ],
            capture_output=True, text=True, timeout=30,
        )
        sub_files = sorted(glob.glob(os.path.join(tmp, "*.vtt")) or glob.glob(os.path.join(tmp, "*.srt")))
        if not sub_files:
            return ""
        with open(sub_files[0], encoding='utf-8', errors='ignore') as f:
            return _strip_subtitle(f.read())


def _strip_subtitle(raw):
    """Parse VTT/SRT — ambil teksnya saja."""
    text = re.sub(r'\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}', '', raw)
    text = re.sub(r'<[^>]+>', '', text)        # hapus tag inline
    text = re.sub(r'WEBVTT.*?\n', '', text)     # hapus header VTT
    text = re.sub(r'\n\d+\n', '\n', text)       # hapus nomor urut SRT
    return re.sub(r'\s+', ' ', text).strip()
