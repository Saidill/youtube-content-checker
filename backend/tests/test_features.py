from app.analysis.features import analyze_features


def test_jin_tidak_match_di_dalam_anjing():
    r = analyze_features("video anjing lucu", "", [], "")
    assert "horor" not in r["detected_categories"]


def test_risk_score_judi_dan_url():
    r = analyze_features("Slot gacor", "http://a http://b http://c", [], "")
    assert r["detected_categories"]["judi"] == ["slot", "gacor"]
    assert r["risk_score"] == 3 and r["risk_level"] == "sedang"
