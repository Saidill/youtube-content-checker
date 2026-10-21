from app.ml.preprocessing import clean_text, head_tail_truncate


def test_clean_text_sama_dengan_notebook():
    assert clean_text("Halo DUNIA!! cek https://x.com/abc ya") == "halo dunia cek url ya"
    assert clean_text(None) == ""


def test_head_tail_truncate_ambil_awal_dan_akhir():
    seq = list(range(1, 21))
    out = head_tail_truncate([seq], max_len=10)
    assert out.tolist() == [[1, 2, 3, 4, 5, 16, 17, 18, 19, 20]]


def test_head_tail_truncate_padding_di_belakang():
    out = head_tail_truncate([[7, 8]], max_len=5)
    assert out.tolist() == [[7, 8, 0, 0, 0]]
