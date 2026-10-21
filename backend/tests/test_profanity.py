from app.analysis.profanity import detect_profanity


def test_teks_bersih():
    assert detect_profanity("belajar berhitung bersama")["severity"] == "clean"


def test_kata_kasar_terdeteksi_dan_dihighlight():
    r = detect_profanity("dasar bangsat kamu")
    assert r["frequency"] == {"bangsat": 1}
    assert "[[PROFANE:bangsat]]" in r["highlighted_text"]


def test_kata_ambigu_konteks_netral_tidak_dihitung():
    r = detect_profanity("anjing peliharaan saya lucu")
    assert "anjing" not in r["frequency"]
    assert "anjing" in r["flagged_ambiguous"]


def test_bunuh_diri_dihitung_terpisah():
    r = detect_profanity("jangan bunuh diri")
    assert r["frequency"].get("bunuh diri") == 1
    assert "bunuh" not in r["frequency"]


def test_kata_pendek_butuh_companion():
    assert "cuk" not in detect_profanity("suara ayam cuk cuk")["frequency"]
    assert "cuk" in detect_profanity("cuk goblok banget")["frequency"]
