"""Deteksi kata tidak pantas berbasis kamus (rule-based), dengan cek konteks untuk kata ambigu."""
import re

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
