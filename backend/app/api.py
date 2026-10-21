"""Route FastAPI. Logika ada di modul ml/, analysis/, dan services/ — di sini hanya orkestrasi."""
import asyncio
import logging

from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from app.analysis.features import analyze_features
from app.analysis.profanity import detect_profanity
from app.config import CORS_ORIGINS, MODEL_REGISTRY
from app.ml.model_store import ModelNotAvailable, available_models, loaded_models
from app.ml.predictor import predict
from app.schemas import AnalyzeReq, PredictOnlyReq, TextReq
from app.services import gemini
from app.services.transcript import fetch_transcript
from app.services.youtube import YouTubeError, fetch_comments, fetch_video

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")

app = FastAPI(title="YouTube Content Checker API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ModelNotAvailable)
async def _model_not_available(_: Request, e: ModelNotAvailable):
    return JSONResponse(status_code=503, content={"detail": str(e)})


@app.exception_handler(YouTubeError)
async def _youtube_error(_: Request, e: YouTubeError):
    return JSONResponse(status_code=e.status_code, content={"detail": str(e)})


def _validate_model(name):
    if name not in MODEL_REGISTRY:
        raise HTTPException(400, f"Model '{name}' tidak dikenal. Pilihan: {', '.join(MODEL_REGISTRY)}")


# ══════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy", "models_loaded": loaded_models(),
            "gemini_cache_size": gemini.cache_size()}


@app.get("/models")
def list_models():
    return {"models": [
        {"id": name, **{k: v for k, v in MODEL_REGISTRY[name].items() if k != "notebook"}}
        for name in available_models()
    ]}


@app.post("/analyze")
async def analyze(req: AnalyzeReq):
    _validate_model(req.model_name)

    # 1. Ambil data YouTube (metadata, komentar, transcript) secara paralel
    video, comments, (transcript, transcript_method) = await asyncio.gather(
        fetch_video(req.video_id),
        fetch_comments(req.video_id),
        fetch_transcript(req.video_id),
    )
    comment_texts = [c.display for c in comments]
    comments_text = " ".join(comment_texts)

    # Urutan field sama dengan TEXT_COLS di notebook:
    # Title, Tags, Comments, Description, Transcript
    combined = " ".join(filter(None, [
        video.title, " ".join(video.tags), comments_text, video.description, transcript,
    ]))

    # 2. Prediksi model (TensorFlow blocking → jalankan di threadpool)
    prediction = await run_in_threadpool(predict, combined, req.model_name)

    # 3. Analisis rule-based
    profanity = detect_profanity(combined)
    features  = analyze_features(video.title, video.description, comment_texts, transcript)

    # 4. Gemini (cache per video)
    ai, from_cache = await gemini.analyze_video_text(
        req.video_id, video.title, video.description, comments_text
    )

    transcript_preview = transcript[:500] + "..." if len(transcript) > 500 else transcript
    return {
        "video": {
            "id":                video.id,
            "title":             video.title,
            "channel":           video.channel,
            "thumbnail":         video.thumbnail,
            "published":         video.published,
            "view_count":        video.view_count,
            "like_count":        video.like_count,
            "comment_count":     video.comment_count,
            "description":       video.description[:800],
            "tags":              video.tags[:10],
            "embed_url":         f"https://www.youtube.com/embed/{req.video_id}?rel=0&modestbranding=1",
            "watch_url":         f"https://www.youtube.com/watch?v={req.video_id}",
            "transcript_info":   transcript_preview or "Transcript tidak tersedia.",
            "transcript_method": transcript_method,
            "has_transcript":    bool(transcript),
        },
        "prediction":       prediction.to_dict(),
        "profanity":        profanity,
        "text_features":    features,
        "ai":               {**ai, "from_cache": from_cache},
        "comments_preview": [c.original for c in comments[:5]],
        "combined_text":    combined,
    }


@app.post("/predict-only")
def predict_only(req: PredictOnlyReq):
    """Ganti model untuk video yang sama — pakai combined_text yang sudah ada, tanpa fetch ulang."""
    _validate_model(req.model_name)
    return {**predict(req.combined_text, req.model_name).to_dict(),
            "profanity": detect_profanity(req.combined_text)}


@app.post("/predict-text")
def predict_text(req: TextReq):
    _validate_model(req.model_name)
    p = predict(req.text, req.model_name)
    return {"label": p.label, "label_text": p.label_text,
            "probability": p.probability, "model_used": p.model_used}


@app.delete("/cache/{video_id}")
def clear_cache(video_id: str):
    if gemini.clear_cache(video_id):
        return {"message": f"Cache {video_id} dihapus"}
    return {"message": "Tidak ada cache"}
