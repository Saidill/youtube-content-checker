from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, re, httpx, asyncio, subprocess
import numpy as np
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="YouTube Content Checker API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_models       = {}
_tokenizer    = None
_gemini_cache = {}

def get_tokenizer():
    global _tokenizer
    if _tokenizer is None:
        import pickle
        p = "models/tokenizer.pkl"
        if os.path.exists(p):
            with open(p, "rb") as f:
                _tokenizer = pickle.load(f)
    return _tokenizer

def get_model(name):
    if name not in _models:
        import tensorflow as tf
        path = f"models/{name}.h5"
        if not os.path.exists(path):
            raise HTTPException(404, f"Model '{path}' tidak ditemukan.")
        from tensorflow.keras.layers import Layer
        import tensorflow.keras.backend as K
        class AttentionLayer(Layer):
            def __init__(self, **kw): super().__init__(**kw)
            def build(self, s):
                self.W = self.add_weight(name='att_w', shape=(s[-1],1), initializer='glorot_uniform', trainable=True)
                self.b = self.add_weight(name='att_b', shape=(s[1],1),  initializer='zeros', trainable=True)
                super().build(s)
            def call(self, x):
                import tensorflow.keras.backend as K
                e = K.tanh(K.dot(x, self.W) + self.b)
                return K.sum(x * K.softmax(e, axis=1), axis=1)
            def compute_output_shape(self, s): return (s[0], s[-1])
        _models[name] = tf.keras.models.load_model(
            path, custom_objects={"AttentionLayer": AttentionLayer}
        )
    return _models[name]

# ══════════════════════════════════════════════════════════════════════
#  PROFANITY & ANALYSIS
# ══════════════════════════════════════════════════════════════════════

# Kata yang SELALU kasar/tidak pantas — tidak ambigu, langsung dihitung
PROFANITY_WORDS_STRICT = [
    "anjir","anjrit","bangsat","brengsek","bajingan","keparat",
    "babi","goblok","tolol","idiot","bodoh","dungu","asu",
    "jancok","jancuk","dancok","kampret","sialan","setan",
    "kontol","memek","ngentot","taik","bokep","porno",
    "narkoba","sabu","ganja","miras",
    "fuck","shit","bitch","asshole","bastard","wtf",
    "porn","nude","sexy",
]

# Kata sangat pendek (<=3 huruf) yang SANGAT rawan collide dengan onomatope/typo
# auto-caption ("cuk" dari suara ayam, dll). Hanya dihitung kalau muncul BERSAMA
# minimal satu kata makian/indikator lain di kalimat yang sama — bukan berdiri sendiri.
PROFANITY_WORDS_SHORT_GATED = {
    "cuk": ["jancuk","jancok","anjing","bangsat","goblok","tolol","asu","babi"],
    "cok": ["jancuk","jancok","anjing","bangsat","goblok","tolol","asu","babi"],
}

def _has_companion(text_lower, word, companions, window=6):
    """True kalau `word` muncul berdekatan dengan salah satu kata companion (indikator makian lain)."""
    tokens = text_lower.split()
    for i, tok in enumerate(tokens):
        if tok == word:
            lo, hi = max(0, i - window), min(len(tokens), i + window + 1)
            ctx = " ".join(tokens[lo:hi])
            if any(c in ctx for c in companions):
                return True
    return False

# Kata yang punya makna ganda (bisa netral, bisa kasar) — perlu cek konteks
# key   = kata yang dicek
# safe  = daftar kata di sekitarnya yang menandakan makna NETRAL (kalau ketemu, skip)
PROFANITY_WORDS_AMBIGUOUS = {
    "anjing":  ["peliharaan","herder","ras","kucing","binatang","hewan","jaga","liar","kampung","pudel","poodle"],
    "tai":     ["chi","taichi"],
    "mati":    ["lampu","listrik","mesin","baterai","battery","mati lampu","koneksi","sinyal","hp","laptop","aki"],
    "bunuh":   ["diri","waktu","bunuh waktu"],   # "bunuh diri" tetap sensitif → ditangani khusus di bawah
    "damn":    ["good","awesome","nice","cool"],
    "crap":    ["good","awesome","nice"],
    "kill":    ["time","switch","killswitch","kill time","kill the lights"],
    "drug":    ["store","drugstore","prescription"],
    "naked":   ["eye","truth","naked eye"],
    "sex":     ["education","edukasi","pendidikan","biologi","biology"],
}

def _has_safe_context(text_lower, word, window=4):
    """Cek apakah kata ambigu dikelilingi kata-kata yang menandakan makna netral."""
    safe_words = PROFANITY_WORDS_AMBIGUOUS.get(word, [])
    if not safe_words:
        return False
    tokens = text_lower.split()
    for i, tok in enumerate(tokens):
        if tok == word or word in tok:
            lo, hi = max(0, i - window), min(len(tokens), i + window + 1)
            ctx = " ".join(tokens[lo:hi])
            if any(sw in ctx for sw in safe_words):
                return True
    return False

def detect_profanity(text):
    if not text:
        return {
            "found": [], "frequency": {}, "count": 0,
            "severity": "clean", "sentences": [],
            "highlighted_text": "",
            "flagged_ambiguous": [],
        }
    tl    = text.lower()
    words = re.findall(r'\b\w+\b', tl)
    freq  = {}
    ambiguous_skipped = []

    # 1. Kata yang pasti kasar — langsung hitung
    for b in PROFANITY_WORDS_STRICT:
        c = tl.count(b) if ' ' in b else words.count(b)
        if c > 0:
            freq[b] = c

    # 2. "bunuh diri" — frasa sensitif khusus (self-harm), selalu dihitung terpisah
    #    dari "bunuh" biasa (misal "bunuh waktu" = idiom netral)
    self_harm_count = len(re.findall(r'\bbunuh\s+diri\b', tl))
    if self_harm_count > 0:
        freq["bunuh diri"] = self_harm_count

    # 3. Kata ambigu — cek konteks dulu sebelum dihitung
    for b in PROFANITY_WORDS_AMBIGUOUS:
        if b not in tl:
            continue
        raw_count = tl.count(b) if ' ' in b else words.count(b)
        if raw_count == 0:
            continue
        if b == "bunuh":
            # exclude kemunculan yang sudah terhitung sebagai "bunuh diri"
            raw_count -= self_harm_count
            if raw_count <= 0:
                continue
        if _has_safe_context(tl, b):
            ambiguous_skipped.append(b)
            continue
        freq[b] = raw_count

    # 4. Kata sangat pendek (cuk, cok) — hanya dihitung kalau ada companion makian lain
    #    di sekitarnya. Berdiri sendiri (misal dari onomatope/typo caption) -> di-skip.
    for b, companions in PROFANITY_WORDS_SHORT_GATED.items():
        if b not in words:
            continue
        if _has_companion(tl, b, companions):
            freq[b] = words.count(b)
        else:
            ambiguous_skipped.append(b)

    total = sum(freq.values())
    sev   = ("clean"    if total == 0  else
             "mild"     if total <= 3  else
             "moderate" if total <= 10 else "severe")

    # Ambil kalimat contoh — tandai dengan marker [[PROFANE:kata]] untuk highlight di frontend
    sents = []
    if freq:
        for sent in re.split(r'[.!?\n]', text):
            sl = sent.lower().strip()
            if len(sl) < 5: continue
            for b in freq:
                if b in sl:
                    marked = sent.strip()
                    # Ganti kata kasar dengan marker (bukan sensor bintang)
                    for bw in sorted(freq.keys(), key=len, reverse=True):
                        marked = re.sub(
                            rf'\b{re.escape(bw)}\b',
                            f'[[PROFANE:{bw}]]',
                            marked,
                            flags=re.IGNORECASE
                        )
                    if marked not in sents:
                        sents.append(marked[:300])
                    break
            if len(sents) >= 5:
                break

    # Buat highlighted text — tandai kata tidak pantas dengan marker
    # Frontend akan render ini dengan highlight merah
    highlighted = text[:2000]  # ambil 2000 karakter pertama untuk preview
    for bw in sorted(freq.keys(), key=len, reverse=True):  # sort by length (longer first)
        highlighted = re.sub(
            rf'\b{re.escape(bw)}\b',
            f'[[PROFANE:{bw}]]',
            highlighted,
            flags=re.IGNORECASE
        )

    return {
        "found":              sorted(freq, key=freq.get, reverse=True)[:15],
        "frequency":          freq,
        "count":              total,
        "severity":           sev,
        "sentences":          sents,
        "highlighted_text":   highlighted,  # untuk ditampilkan di frontend
        "flagged_ambiguous":  ambiguous_skipped,  # kata ambigu yang TIDAK dihitung karena konteks netral
    }

def analyze_features(title, description, comments, transcript):
    full  = f"{title} {description} {' '.join(comments)} {transcript}".lower()
    words = re.findall(r'\b\w+\b', full)
    cats  = {
        "kekerasan": ["pukul","tendang","bunuh","darah","fight","violence","bacok","tikam"],
        "dewasa":    ["dewasa","18+","adult","bokep","porno","nude","naked","bugil"],
        "judi":      ["judi","slot","gacor","maxwin","casino","togel","gambling","poker"],
        "penipuan":  ["scam","tipu","penipuan","palsu","fake","hoax","bodong"],
        "narkoba":   ["narkoba","sabu","ganja","drugs","kokain","heroin","miras","alkohol"],
        "horor":     ["hantu","zombie","zombi","kuntilanak","pocong","genderuwo","arwah","iblis",
                       "horor","mistis","gentayangan","mayat","tengkorak","vampir","drakula","ghost",
                       "haunted","paranormal","jumpscare","suster ngesot","tuyul","sundel bolong"],
        "clickbait": ["rahasia","terungkap","syok","viral","trending","exposed","shocked","100%","terbukti"],
    }
    # Kata pendek/umum yang rawan jadi substring kata lain (hacker->hack, dst)
    # dicek terpisah dengan whole-word matching, bukan substring biasa.
    # Catatan: "bet" SENGAJA tidak dimasukkan — di slang Indonesia "bet" berarti
    # "sangat" (mis. "bagus bet", "gemes bet") dan terlalu sering false-positive
    # untuk dijadikan indikator judi, walau sebagai whole-word sekalipun.
    word_set = set(words)
    cats_wholeword = {
        "kekerasan": ["mati","kill"],
        "dewasa":    ["sex"],
        "penipuan":  ["hack"],
        "horor":     ["jin"],   # "jin" rawan collide dgn substring "anjing", wajib whole-word
    }
    detected = {c: [k for k in kw if k in full][:5] for c,kw in cats.items() if any(k in full for k in kw)}
    for c, kw in cats_wholeword.items():
        hits = [k for k in kw if k in word_set and not _has_safe_context(full, k)]
        if hits:
            detected[c] = (detected.get(c, []) + hits)[:5]
    urls     = re.findall(r'http\S+|www\S+|bit\.ly', f"{description} {' '.join(comments)}")
    caps_r   = sum(1 for c in title if c.isupper()) / max(len(title), 1) if title else 0
    pos = sum(1 for w in words if w in ["bagus","keren","mantap","suka","love","good","great","nice"])
    neg = sum(1 for w in words if w in ["jelek","buruk","parah","benci","hate","bad","worst","boring"])
    sentiment = ("neutral"  if pos + neg == 0 else
                 "positive" if pos > neg * 2  else
                 "negative" if neg > pos * 2  else "mixed")
    risk = (
        (3 if detected.get("dewasa")    else 0) +
        (3 if detected.get("narkoba")   else 0) +
        (2 if detected.get("judi")      else 0) +
        (2 if detected.get("kekerasan") else 0) +
        (2 if detected.get("penipuan")  else 0) +
        (2 if detected.get("horor")     else 0) +
        (1 if len(urls) > 2             else 0) +
        (1 if caps_r > 0.4 and len(title) > 10 else 0)
    )
    return {
        "word_count":          len(words),
        "detected_categories": detected,
        "has_suspicious_url":  len(urls) > 2,
        "url_count":           len(urls),
        "is_clickbait_title":  caps_r > 0.4 and len(title) > 10,
        "caps_ratio":          round(caps_r, 2),
        "emoji_count":         len(re.findall(r'[^\w\s,.\-!?]', title)),
        "comment_sentiment":   sentiment,
        "pos_neg_ratio":       f"{pos}/{neg}",
        "risk_score":          risk,
        "risk_level":          "rendah" if risk == 0 else "sedang" if risk <= 3 else "tinggi",
    }

# ══════════════════════════════════════════════════════════════════════
#  TEXT PREPROCESSING & PREDICTION
# ══════════════════════════════════════════════════════════════════════

def clean_text(t):
    if not isinstance(t, str): return ""
    t = t.lower()
    t = re.sub(r'http\S+|www\S+', ' url ', t)
    t = re.sub(r'[^a-zA-Z0-9\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()

def head_tail_truncate(sequences, max_len=512):
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    result = []
    half = max_len // 2
    for seq in sequences:
        if len(seq) <= max_len:
            result.append(seq)
        else:
            result.append(seq[:half] + seq[-half:])
    return pad_sequences(result, maxlen=max_len, 
                        padding='post', truncating='post')
def predict_text(text, model_name):
    tok = get_tokenizer()
    if tok is None:
        import random; p = random.uniform(0.1, 0.9)
        return p, int(p > 0.5), "mock"
    m   = get_model(model_name)
    seq = tok.texts_to_sequences([clean_text(text)])
    pad = head_tail_truncate(seq)
    p   = float(m.predict(pad, verbose=0)[0][0])
    return p, int(p > 0.5), "model"

# ══════════════════════════════════════════════════════════════════════
#  YOUTUBE API HELPERS
# ══════════════════════════════════════════════════════════════════════

YT_KEY = os.getenv("YOUTUBE_API_KEY", "")
GM_KEY = os.getenv("GEMINI_API_KEY",  "")

async def fetch_yt(vid):
    if not YT_KEY:
        raise HTTPException(500, "YOUTUBE_API_KEY belum diset di .env")
    async with httpx.AsyncClient() as c:
        r = await c.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={"id": vid, "key": YT_KEY, "part": "snippet,statistics,contentDetails"},
            timeout=10,
        )
        r.raise_for_status()
    d = r.json()
    if not d.get("items"):
        raise HTTPException(404, "Video tidak ditemukan")
    return d["items"][0]

async def fetch_comments(vid, n=20):
    if not YT_KEY: return []
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(
                "https://www.googleapis.com/youtube/v3/commentThreads",
                params={"videoId": vid, "key": YT_KEY, "part": "snippet",
                        "maxResults": n, "order": "relevance"},
                timeout=10,
            )
            r.raise_for_status()
        return [x["snippet"]["topLevelComment"]["snippet"]["textDisplay"]
                for x in r.json().get("items", [])]
    except Exception as e:
        print(f"[COMMENTS ERR] {vid} | {e}")
        return []

async def fetch_transcript_text(vid: str) -> tuple[str, str]:
    """
    Fallback chain untuk ambil transcript:
    1. youtube-transcript-api — coba SEMUA bahasa yang tersedia
    2. yt-dlp — bypass lebih kuat, bisa ambil auto-caption
    3. Return kosong (biarkan model pakai teks lain)

    Return: (transcript_text, method_used)
    """

    # ── METHOD 1: youtube-transcript-api ──────────────────────────────
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound
        ytt = YouTubeTranscriptApi()

        # Coba fetch langsung dengan berbagai bahasa
        lang_priority = ['id', 'en', 'en-US', 'en-GB']
        fetched = None

        # Coba tiap bahasa dulu
        for lang in lang_priority:
            try:
                fetched = ytt.fetch(vid, languages=[lang])
                break
            except Exception:
                continue

        # Kalau semua gagal, coba ambil apapun yang tersedia
        if fetched is None:
            try:
                fetched = ytt.fetch(vid)
            except Exception:
                pass

        if fetched is not None:
            text = " ".join([s.text for s in fetched.snippets])
            if text.strip():
                print(f"[TRANSCRIPT M1] {vid} — {len(text)} chars via youtube-transcript-api")
                return text, "youtube-transcript-api"

    except Exception as e:
        print(f"[TRANSCRIPT M1 FAIL] {vid} | {type(e).__name__}: {e}")

    # ── METHOD 2: yt-dlp (lebih kuat, bypass disabled) ─────────────────
    try:
        import shutil
        if shutil.which("yt-dlp"):
            print(f"[TRANSCRIPT M2] {vid} — mencoba yt-dlp...")
            result = subprocess.run(
                [
                    "yt-dlp",
                    "--write-auto-sub",      # ambil auto-generated subtitle
                    "--write-sub",           # ambil manual subtitle juga
                    "--sub-langs", "id,en",  # prioritas bahasa
                    "--sub-format", "vtt",   # format VTT (lebih mudah di-parse)
                    "--skip-download",       # jangan download videonya
                    "--output", f"/tmp/yt_{vid}",
                    f"https://www.youtube.com/watch?v={vid}",
                ],
                capture_output=True, text=True, timeout=30
            )

            # Cari file subtitle yang dihasilkan
            import glob
            sub_files = glob.glob(f"/tmp/yt_{vid}*.vtt")
            if not sub_files:
                sub_files = glob.glob(f"/tmp/yt_{vid}*.srt")

            if sub_files:
                with open(sub_files[0], 'r', encoding='utf-8', errors='ignore') as f:
                    raw = f.read()
                # Parse VTT/SRT — ambil teks saja (hapus timestamps)
                text = re.sub(r'\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}', '', raw)
                text = re.sub(r'<[^>]+>', '', text)        # hapus HTML tags
                text = re.sub(r'WEBVTT.*?\n', '', text)     # hapus header VTT
                text = re.sub(r'\n\d+\n', '\n', text)       # hapus nomor SRT
                text = re.sub(r'\s+', ' ', text).strip()
                # Cleanup file temp
                for f in sub_files: os.remove(f)
                if text:
                    print(f"[TRANSCRIPT M2] {vid} — {len(text)} chars via yt-dlp")
                    return text, "yt-dlp"
        else:
            print(f"[TRANSCRIPT M2] yt-dlp tidak terinstall. Install: pip install yt-dlp")

    except subprocess.TimeoutExpired:
        print(f"[TRANSCRIPT M2] {vid} — yt-dlp timeout")
    except Exception as e:
        print(f"[TRANSCRIPT M2 FAIL] {vid} | {type(e).__name__}: {e}")

    print(f"[TRANSCRIPT] {vid} — semua method gagal, prediksi tanpa transcript")
    return "", "none"

# ── Gemini ─────────────────────────────────────────────────────────────
async def gemini(text, task):
    if not GM_KEY:
        return "Gemini API key belum diset."
    prompts = {
        "summary":        f"Ringkas dalam Bahasa Indonesia (3-5 kalimat):\n\n{text[:4000]}",
        "child_analysis": f"2-3 kalimat: aman untuk anak <13 tahun? Verdict + alasan + rekomendasi usia:\n\n{text[:1500]}",
        "content_type":   f"Kategori konten 1-2 kata (Edukasi/Hiburan/Musik/Gaming/Vlog/dll). Jawab kategori saja:\n\n{text[:1000]}",
    }
    payload = {"contents": [{"parts": [{"text": prompts.get(task, prompts["summary"])}]}]}
    for mn in ["gemini-2.5-flash-lite", "gemini-2.5-flash"]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{mn}:generateContent?key={GM_KEY}"
        try:
            async with httpx.AsyncClient() as c:
                r = await c.post(url, json=payload, timeout=20)
            if r.status_code == 429:
                await asyncio.sleep(3); continue
            r.raise_for_status()
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                await asyncio.sleep(3); continue
            return f"Error ({mn}): {e}"
        except Exception as e:
            return f"Error: {e}"
    return "Gemini sibuk / kuota habis. Coba lagi nanti."

# ══════════════════════════════════════════════════════════════════════
#  PYDANTIC MODELS
# ══════════════════════════════════════════════════════════════════════

class AnalyzeReq(BaseModel):
    model_config = {"protected_namespaces": ()}
    video_id:   str
    model_name: str = "cnn_bilstm_attention"

class PredictOnlyReq(BaseModel):
    model_config = {"protected_namespaces": ()}
    video_id:      str
    model_name:    str
    combined_text: str

class TextReq(BaseModel):
    model_config = {"protected_namespaces": ()}
    text:       str
    model_name: str = "cnn_bilstm_attention"

# ══════════════════════════════════════════════════════════════════════
#  ROUTES
# ══════════════════════════════════════════════════════════════════════

@app.get("/")
def root(): return {"status": "ok"}

@app.get("/models")
def list_models():
    d = "models"
    if not os.path.exists(d): return {"models": []}
    files = [f.replace(".h5","") for f in os.listdir(d) if f.endswith(".h5")]
    info  = {
        "bilstm_headtail_content_moderation": {
            "label":"biLSTM","description":"Bidirectional LSTM — baseline",
            "accuracy":"88.18%","f1":"0.8787"},
        "cnn_bilstm_content_moderation": {
            "label":"CNN-biLSTM","description":"CNN + biLSTM — akurasi tertinggi",
            "accuracy":"88.64%","f1":"0.8828"},
        "bilstm_attention_content_moderation": {
            "label":"biLSTM-Attention","description":"biLSTM + Attention — AUC tertinggi",
            "accuracy":"88.11%","f1":"0.8781"},
        "cnn_bilstm_attention": {
            "label":"CNN-biLSTM-Attention","description":"CNN + biLSTM + Attention",
            "accuracy":"88.18%","f1":"0.8788"},
    }
    return {"models":[{"id":f,**info.get(f,{"label":f,"description":"-","accuracy":"-","f1":"-"})} for f in files]}

@app.post("/analyze")
async def analyze(req: AnalyzeReq):
    # 1. YouTube data
    vd    = await fetch_yt(req.video_id)
    sn    = vd["snippet"]; st = vd.get("statistics", {})
    title = sn.get("title",""); desc = sn.get("description","")
    tags  = " ".join(sn.get("tags",[])); chan = sn.get("channelTitle","")
    thumb = sn.get("thumbnails",{}).get("maxres",sn.get("thumbnails",{}).get("high",{})).get("url","")

    # 2. Comments + transcript parallel
    comments_task   = fetch_comments(req.video_id)
    transcript_task = fetch_transcript_text(req.video_id)
    comments, (transcript, transcript_method) = await asyncio.gather(
        comments_task, transcript_task
    )
    ctxt     = " ".join(comments)
    combined = " ".join(filter(None, [title, tags, ctxt, desc, transcript]))

    # 3. Prediksi
    prob, label, src = predict_text(combined, req.model_name)

    # 4. Profanity + features (dari combined text lengkap)
    profanity = detect_profanity(combined)
    features  = analyze_features(title, desc, comments, transcript)

    # 5. Gemini — pakai cache
    use_cache = req.video_id in _gemini_cache
    if use_cache:
        g = _gemini_cache[req.video_id]
        category, summary, child = g["category"], g["summary"], g["child_analysis"]
    else:
        ft       = f"Judul: {title}\nDeskripsi: {desc}\nKomentar: {ctxt}"
        category = await gemini(f"{title} {desc[:500]}", "content_type")
        await asyncio.sleep(1)
        summary  = await gemini(ft, "summary")
        await asyncio.sleep(1)
        child    = await gemini(ft, "child_analysis")
        if not any(s.startswith("Error") or "sibuk" in s or "belum" in s
                   for s in [category, summary, child]):
            _gemini_cache[req.video_id] = {
                "category":category, "summary":summary, "child_analysis":child
            }

    # 6. Confidence — 2 tingkat saja: Sangat Yakin / Tidak Yakin
    conf = abs(prob - 0.5) * 2
    cl   = "Sangat Yakin" if conf > 0.5 else "Tidak Yakin"
    tp   = transcript[:500] + "..." if len(transcript) > 500 else transcript

    return {
        "video": {
            "id":             req.video_id,"title":title,"channel":chan,"thumbnail":thumb,
            "published":      sn.get("publishedAt",""),
            "view_count":     st.get("viewCount","0"),"like_count":st.get("likeCount","0"),
            "comment_count":  st.get("commentCount","0"),
            "description":    desc[:800],"tags":sn.get("tags",[])[:10],
            "embed_url":      f"https://www.youtube.com/embed/{req.video_id}?rel=0&modestbranding=1",
            "watch_url":      f"https://www.youtube.com/watch?v={req.video_id}",
            "transcript_info":    tp or "Transcript tidak tersedia.",
            "transcript_method":  transcript_method,  # "youtube-transcript-api" | "yt-dlp" | "none"
            "has_transcript":     bool(transcript),
        },
        "prediction": {
            "label":label,"label_text":"Inappropriate" if label==1 else "Appropriate",
            "probability":round(prob,4),"confidence":round(conf,4),
            "confidence_label":cl,"model_used":req.model_name,"source":src,
        },
        "profanity":     profanity,
        "text_features": features,
        "ai": {
            "summary":summary,"child_analysis":child,
            "category":category.strip(),"from_cache":use_cache,
        },
        "comments_preview": comments[:5],
        "transcript_info":  tp,
        "combined_text":    combined,
    }

@app.post("/predict-only")
def predict_only(req: PredictOnlyReq):
    prob, label, src = predict_text(req.combined_text, req.model_name)
    conf = abs(prob-0.5)*2
    cl   = "Sangat Yakin" if conf > 0.5 else "Tidak Yakin"
    return {
        "label":label,"label_text":"Inappropriate" if label==1 else "Appropriate",
        "probability":round(prob,4),"confidence":round(conf,4),
        "confidence_label":cl,"model_used":req.model_name,"source":src,
        "profanity":detect_profanity(req.combined_text),
    }

@app.delete("/cache/{video_id}")
def clear_cache(video_id:str):
    if video_id in _gemini_cache:
        del _gemini_cache[video_id]
        return {"message":f"Cache {video_id} dihapus"}
    return {"message":"Tidak ada cache"}

@app.post("/predict-text")
def predict_text_ep(req: TextReq):
    prob,label,src = predict_text(req.text,req.model_name)
    return {"label":label,"label_text":"Inappropriate" if label==1 else "Appropriate",
            "probability":round(prob,4),"model_used":req.model_name}

@app.get("/health")
def health():
    return {"status":"healthy","models_loaded":list(_models.keys()),
            "gemini_cache_size":len(_gemini_cache)}