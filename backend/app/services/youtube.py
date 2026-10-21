"""YouTube Data API v3: metadata video dan komentar."""
import logging
from dataclasses import dataclass, field

import httpx

from app.config import YOUTUBE_API_KEY

log = logging.getLogger(__name__)

API_URL = "https://www.googleapis.com/youtube/v3"


class YouTubeError(Exception):
    def __init__(self, status_code, message):
        super().__init__(message)
        self.status_code = status_code


@dataclass
class Comment:
    display: str    # textDisplay (HTML) — dipakai sebagai input model, sama seperti sebelumnya
    original: str   # textOriginal (plain text) — aman untuk ditampilkan di frontend


@dataclass
class VideoMeta:
    id: str
    title: str
    description: str
    tags: list = field(default_factory=list)
    channel: str = ""
    thumbnail: str = ""
    published: str = ""
    view_count: str = "0"
    like_count: str = "0"
    comment_count: str = "0"


async def fetch_video(video_id):
    if not YOUTUBE_API_KEY:
        raise YouTubeError(500, "YOUTUBE_API_KEY belum diset di .env")
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"{API_URL}/videos", params={
            "id": video_id, "key": YOUTUBE_API_KEY, "part": "snippet,statistics,contentDetails",
        })
        r.raise_for_status()
    items = r.json().get("items")
    if not items:
        raise YouTubeError(404, "Video tidak ditemukan")

    sn = items[0]["snippet"]
    st = items[0].get("statistics", {})
    thumbs = sn.get("thumbnails", {})
    return VideoMeta(
        id=video_id,
        title=sn.get("title", ""),
        description=sn.get("description", ""),
        tags=sn.get("tags", []),
        channel=sn.get("channelTitle", ""),
        thumbnail=thumbs.get("maxres", thumbs.get("high", {})).get("url", ""),
        published=sn.get("publishedAt", ""),
        view_count=st.get("viewCount", "0"),
        like_count=st.get("likeCount", "0"),
        comment_count=st.get("commentCount", "0"),
    )


async def fetch_comments(video_id, n=20):
    """Top-n komentar (urut relevansi). Gagal → list kosong, analisis tetap jalan."""
    if not YOUTUBE_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{API_URL}/commentThreads", params={
                "videoId": video_id, "key": YOUTUBE_API_KEY, "part": "snippet",
                "maxResults": n, "order": "relevance",
            })
            r.raise_for_status()
        snippets = [x["snippet"]["topLevelComment"]["snippet"] for x in r.json().get("items", [])]
        return [Comment(display=s["textDisplay"], original=s.get("textOriginal", s["textDisplay"]))
                for s in snippets]
    except Exception as e:
        log.warning("Gagal ambil komentar %s: %s", video_id, e)
        return []
