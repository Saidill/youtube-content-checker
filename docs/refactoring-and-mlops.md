# Refactoring Notes & MLOps Assessment

**Project:** YouTube Content Checker
**Date:** 2026-10-21

This document records the code restructuring of the project and reviews how far
the system follows MLOps concepts.

---

## 1. Why the refactor was needed

Before the refactor, the project worked, but most of the code was in two large files:

| File | Before | Problem |
|---|---|---|
| `backend/main.py` | ~630 lines | Config, model loading, preprocessing, profanity rules, YouTube API, transcript, Gemini and routes all mixed in one file |
| `frontend/src/app/page.tsx` | ~980 lines | State logic, API calls and every UI component in one file; the same UI blocks copy-pasted several times |

Such large files are hard to read, test and explain. Some real bugs were also
hidden in them (see §3).

**Rule for the refactor:** keep the model's behaviour the same. Every
prediction and analysis result must be identical before and after (verified in §5).

---

## 2. New structure

### Backend

```
backend/
├── main.py                  entry point — still started with `uvicorn main:app`
├── app/
│   ├── config.py            API keys, paths, MAX_LEN, threshold, MODEL_REGISTRY
│   ├── schemas.py           Pydantic request models
│   ├── api.py               FastAPI routes (orchestration only)
│   ├── ml/
│   │   ├── preprocessing.py clean_text, head_tail_truncate (same as notebooks)
│   │   ├── model_store.py   loads and caches .h5 models + tokenizer
│   │   └── predictor.py     text → probability, label, confidence
│   ├── analysis/
│   │   ├── profanity.py     dictionary-based profanity detection with context checks
│   │   └── features.py      risk categories, clickbait, URLs, comment sentiment
│   └── services/
│       ├── youtube.py       YouTube Data API v3 (metadata, comments)
│       ├── transcript.py    transcript fallback chain (youtube-transcript-api → yt-dlp)
│       └── gemini.py        Gemini category / summary / child analysis + cache
├── tests/                   pytest unit tests
├── requirements.txt
└── requirements-dev.txt
```

Each module has one job, and the request flow is easy to follow:

```
POST /analyze
  └─ api.py
       ├─ youtube.fetch_video          ┐
       ├─ youtube.fetch_comments       ├─ fetched in parallel (asyncio.gather)
       ├─ transcript.fetch_transcript  ┘
       ├─ ml/predictor.py         → ml/preprocessing.py + ml/model_store.py
       ├─ analysis/profanity.py
       ├─ analysis/features.py
       └─ services/gemini.py
```

### Frontend

```
frontend/src/
├── app/page.tsx             page layout only (~90 lines)
├── hooks/useAnalysis.ts     all state + analysis flow
├── lib/
│   ├── api.ts               API client + TypeScript types
│   └── format.ts            formatNumber, timeAgo, verdict
└── components/
    ├── Navbar.tsx
    ├── ModelSelector.tsx    desktop sidebar + mobile dropdown
    ├── VerdictBadge.tsx     shared "Appropriate · 97.3%" badge
    ├── CollapsibleCard.tsx  shared open/close card
    ├── PredictionCard.tsx
    ├── ProfanityCard.tsx
    ├── TextFeaturesCard.tsx
    ├── AiSection.tsx
    ├── VideoDetails.tsx
    └── StatusViews.tsx      loading / empty / error views
```

---

## 3. What changed

### 3.1 Backend

| # | Change | Why |
|---|---|---|
| 1 | Split `main.py` into modules (§2) | Readability, testability, and each part maps to a part of the thesis architecture |
| 2 | **One `MODEL_REGISTRY` in `config.py`** | Model accuracy/F1 were written in two places (backend and frontend) **with different numbers**. Now there is one place |
| 3 | **Removed the random "mock" prediction** | If `tokenizer.pkl` was missing, the API returned `random.uniform(0.1, 0.9)` as if it were a real result. It now returns HTTP 503 with a clear message |
| 4 | **Blocking work moved off the event loop** | TensorFlow prediction and the transcript download (yt-dlp, up to 30 s) blocked the whole server, so other requests had to wait. They now run in threads (`run_in_threadpool`, `asyncio.to_thread`) |
| 5 | **Model name validated** | `model_name` went straight into `f"models/{name}.h5"`, so a value like `../../x` could load files outside the models folder (path traversal). Only registered models are accepted now |
| 6 | **Per-request temp folder for yt-dlp** | It used fixed paths like `/tmp/yt_<id>`, so two requests for the same video could clash. It now uses `tempfile.TemporaryDirectory()`, which is deleted afterwards |
| 7 | Gemini API key moved from URL to header | Keys in URLs can end up in logs |
| 8 | Confidence/label logic in one function | It was copy-pasted in `/analyze`, `/predict-only` and `/predict-text` |
| 9 | `print` → `logging` | Timestamps and log levels |
| 10 | Model paths relative to the backend folder | Before, the server only worked if started from inside `backend/` |
| 11 | `AttentionLayer` defined once | It was redefined every time a model loaded |
| 12 | Added missing dependencies | `youtube-transcript-api` and `yt-dlp` were used but not listed in `requirements.txt` |
| 13 | Comments returned as plain text | The API now returns `textOriginal` for display. Model input still uses `textDisplay`, so predictions are unchanged |
| 14 | Unit tests | 10 pytest tests for preprocessing, profanity and features |

### 3.2 Frontend

| # | Change | Why |
|---|---|---|
| 1 | Split `page.tsx` into components + `useAnalysis` hook | The page now only describes layout; logic is in one place |
| 2 | **Smoother model switching** | Switching models on the same video used to hide the whole page behind a spinner. Now only the prediction card shows a loading overlay, and the video and analysis stay visible |
| 3 | **Removed `dangerouslySetInnerHTML`** | YouTube comment HTML was inserted directly into the page (XSS risk). Comments are now plain text |
| 4 | Removed the hard-coded fallback model list | It had different accuracy numbers from the backend and hid "backend is down" errors. A clear error is now shown instead |
| 5 | Shared `CollapsibleCard` and `VerdictBadge` | They replace 3 and 2 copies of the same code |
| 6 | All model buttons disabled while busy | Prevents overlapping requests |
| 7 | Same threshold as the backend (`p > 0.5`) | The frontend used `>=` and the backend `>` |
| 8 | Types updated | Matches the real API response (`highlighted_text`, `flagged_ambiguous`, `transcript_method`) |
| 9 | Colour added for the "horor" category; transcript source shown | Small UI fixes |
| 10 | API URL configurable with `NEXT_PUBLIC_API_URL` | Needed for any deployment beyond localhost |
| 11 | YouTube Shorts URLs accepted | `youtube.com/shorts/<id>` |

### 3.3 Left unchanged on purpose

- The ML models, tokenizer and preprocessing logic.
- All profanity and feature rules (the word lists are identical).
- API endpoints and response shapes (only the unused `source` and duplicate top-level `transcript_info` fields were removed).
- The hidden "Ringkasan AI" section stays hidden, as it was before.

---

## 4. Open questions

1. **Final accuracy numbers.** The backend says biLSTM = 88.18%; the old frontend copy said 87.19%. The backend values were kept in `config.py`. Check them against the final notebook results used in the thesis.
2. **Unused Gemini calls.** `summary` and `child_analysis` are generated on every new video but not shown in the UI. They add about 2–4 seconds and use free-tier quota. Either show them again or remove them.
3. **Possible training–serving skew in comments.** At inference time the model receives comments in YouTube's HTML form (`textDisplay`), so `<br>` and `&quot;` become the tokens `br` and `quot` after `clean_text`. If the dataset's *Top 20 Comments* column was plain text, serving input differs slightly from training input.

---

## 5. Verification

| Check | Result |
|---|---|
| All 4 models, 3 sample texts, old vs new code | Same probability and label (only rounding to 4 decimals, as the API already did) |
| Profanity + feature output, old vs new | Byte-for-byte identical |
| `pytest` | 10 passed |
| Real `/analyze` request (YouTube + transcript + model + Gemini) | Works end to end, about 8.6 s |
| Invalid `model_name` (`../../etc`) | Rejected with HTTP 400 |
| `tsc --noEmit` and `next build` | Pass |

Run the tests:

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

---

## 6. MLOps concept

### 6.1 What MLOps is

**MLOps (Machine Learning Operations)** applies DevOps practices to machine
learning. Its goal is to build, deploy, monitor and improve ML models in a
reliable, repeatable and automated way.

A normal program changes only when its **code** changes. An ML system can also
change when its **data** or **model** changes, so MLOps has to manage all three:

```
         ┌──────────┐     ┌──────────┐     ┌──────────┐
 Data ──▶│  Train   │──▶  │ Evaluate │──▶  │ Register │
         └──────────┘     └──────────┘     └────┬─────┘
              ▲                                 │
              │                                 ▼
         ┌──────────┐     ┌──────────┐     ┌──────────┐
         │ Retrain  │◀──  │ Monitor  │◀──  │  Deploy  │
         └──────────┘     └──────────┘     └──────────┘
```

Main practices:

| Practice | Meaning | Common tools |
|---|---|---|
| Versioning | Track versions of the code, **data** and **models** | Git, DVC, model registry |
| Experiment tracking | Log hyperparameters, metrics and artefacts for each training run | MLflow, Weights & Biases |
| Reproducible pipeline | Training runs as a script or pipeline, not by hand in a notebook | Python scripts, Kubeflow, Airflow |
| Model registry | A central list of model versions with their metrics and stage (staging/production) | MLflow Model Registry |
| CI/CD | Automatic tests and deployment when code or a model changes | GitHub Actions, GitLab CI |
| Containerisation | Same environment everywhere | Docker |
| Model serving | Model available through an API | FastAPI, TF Serving |
| Monitoring | Track predictions, latency and data/concept drift in use | Prometheus, Evidently |
| Continuous training | Retrain automatically when performance drops or new data arrives | Pipelines + triggers |

### 6.2 MLOps maturity levels (Google Cloud)

| Level | Name | Description |
|---|---|---|
| **0** | Manual process | Training in notebooks, models copied by hand, no automation, no monitoring |
| **1** | ML pipeline automation | Training is an automated pipeline; continuous training; experiment tracking; model registry |
| **2** | CI/CD pipeline automation | The pipeline itself is tested and deployed automatically; full monitoring and retraining |

### 6.3 Where this project stands

| Practice | Status | Evidence |
|---|---|---|
| Model serving via API | ✅ Done | FastAPI `/analyze`, `/predict-only`, `/predict-text` |
| Several models compared | ✅ Done | 4 architectures, can be switched at runtime |
| Fixed random seed / stratified split | ✅ Done | `random_state=42`, `stratify=y` in every notebook |
| Model metadata in one place | ✅ Done (this refactor) | `MODEL_REGISTRY` in `config.py` |
| Same preprocessing in training and serving | ⚠️ Partial | The code is identical, but copied by hand into each notebook and the backend |
| Automated tests | ⚠️ Partial | Unit tests added, but no CI runs them automatically |
| Dependency pinning | ⚠️ Partial | Backend pinned; frontend uses `^` ranges plus a lockfile |
| Experiment tracking | ❌ Not yet | Metrics only exist as notebook output |
| Data versioning | ❌ Not yet | Dataset not versioned |
| Model versioning / registry | ❌ Not yet | `.h5` files in a folder (`models/`, `models_v1/`) |
| Reproducible training pipeline | ❌ Not yet | Training only in Kaggle notebooks |
| Containerisation | ❌ Not yet | No Dockerfile |
| CI/CD | ❌ Not yet | No pipeline |
| Monitoring / prediction logging | ❌ Not yet | Predictions are not stored |
| Continuous training | ❌ Not yet | — |

**Conclusion:** the project is at **MLOps Level 0 (manual process)**. It is a
complete ML application (training → saved model → API → UI), which is normal
and acceptable for a thesis, but it should not be described as an MLOps system
yet. A correct way to describe it in the thesis:

> "The system implements the model-serving stage of the ML lifecycle and is at
> MLOps maturity Level 0 (manual process). Training, evaluation and deployment
> of the models are performed manually."

### 6.4 Roadmap to Level 1

In order of value for effort:

1. **Shared preprocessing module.** Training and the API import the same `clean_text` / `head_tail_truncate`, which removes training–serving skew by design.
2. **Experiment tracking with MLflow.** Log the hyperparameters, metrics (accuracy, F1, AUC) and model file of all 4 architectures. This gives a reproducible comparison table for the thesis.
3. **Model registry.** Register the models in MLflow, and have the backend load the version marked "Production" instead of a fixed file name.
4. **Training script.** Turn the notebook into `train.py --arch cnn_bilstm_attention`, so training can be repeated with one command.
5. **Docker + docker-compose.** Run backend and frontend with one command, in the same environment everywhere.
6. **CI with GitHub Actions.** Run `pytest`, `tsc` and `next build` on every push.
7. **Prediction logging + monitoring.** Store each prediction (video ID, model, probability, timestamp) and watch the label distribution over time for drift.
8. **Data versioning with DVC** (optional). Version the 40,044-video dataset together with the code.

Steps 1–6 would be enough to describe the system as moving towards **MLOps Level 1**.
