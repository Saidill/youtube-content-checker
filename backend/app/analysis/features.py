"""Fitur teks heuristik (kategori risiko, clickbait, URL, sentimen komentar)."""
import re

from app.analysis.profanity import _has_safe_context

# Kata kunci per kategori — dicocokkan sebagai substring.
CATEGORY_KEYWORDS = {
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
CATEGORY_KEYWORDS_WHOLEWORD = {
    "kekerasan": ["mati","kill"],
    "dewasa":    ["sex"],
    "penipuan":  ["hack"],
    "horor":     ["jin"],   # "jin" rawan collide dgn substring "anjing", wajib whole-word
}

POSITIVE_WORDS = ["bagus","keren","mantap","suka","love","good","great","nice"]
NEGATIVE_WORDS = ["jelek","buruk","parah","benci","hate","bad","worst","boring"]

# Bobot risiko per kategori
RISK_WEIGHTS = {"dewasa": 3, "narkoba": 3, "judi": 2, "kekerasan": 2, "penipuan": 2, "horor": 2}


def analyze_features(title, description, comments, transcript):
    full  = f"{title} {description} {' '.join(comments)} {transcript}".lower()
    words = re.findall(r'\b\w+\b', full)
    word_set = set(words)

    detected = {c: [k for k in kw if k in full][:5]
                for c, kw in CATEGORY_KEYWORDS.items() if any(k in full for k in kw)}
    for c, kw in CATEGORY_KEYWORDS_WHOLEWORD.items():
        hits = [k for k in kw if k in word_set and not _has_safe_context(full, k)]
        if hits:
            detected[c] = (detected.get(c, []) + hits)[:5]

    urls      = re.findall(r'http\S+|www\S+|bit\.ly', f"{description} {' '.join(comments)}")
    caps_r    = sum(1 for c in title if c.isupper()) / max(len(title), 1) if title else 0
    clickbait = caps_r > 0.4 and len(title) > 10

    pos = sum(1 for w in words if w in POSITIVE_WORDS)
    neg = sum(1 for w in words if w in NEGATIVE_WORDS)
    sentiment = ("neutral"  if pos + neg == 0 else
                 "positive" if pos > neg * 2  else
                 "negative" if neg > pos * 2  else "mixed")

    risk = (sum(w for c, w in RISK_WEIGHTS.items() if detected.get(c))
            + (1 if len(urls) > 2 else 0)
            + (1 if clickbait else 0))
    return {
        "word_count":          len(words),
        "detected_categories": detected,
        "has_suspicious_url":  len(urls) > 2,
        "url_count":           len(urls),
        "is_clickbait_title":  clickbait,
        "caps_ratio":          round(caps_r, 2),
        "emoji_count":         len(re.findall(r'[^\w\s,.\-!?]', title)),
        "comment_sentiment":   sentiment,
        "pos_neg_ratio":       f"{pos}/{neg}",
        "risk_score":          risk,
        "risk_level":          "rendah" if risk == 0 else "sedang" if risk <= 3 else "tinggi",
    }
