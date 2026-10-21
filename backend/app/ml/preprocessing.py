"""Preprocessing teks — WAJIB identik dengan notebook training.

Kalau mengubah fungsi di sini, ubah juga di notebook (dan sebaliknya),
supaya tidak terjadi training-serving skew.
"""
import re

from app.config import MAX_LEN


def clean_text(t):
    if not isinstance(t, str):
        return ""
    t = t.lower()
    t = re.sub(r'http\S+|www\S+', ' url ', t)
    t = re.sub(r'[^a-zA-Z0-9\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def head_tail_truncate(sequences, max_len=MAX_LEN):
    """Ambil HEAD (max_len//2 token pertama) + TAIL (max_len//2 token terakhir), lalu padding."""
    from tensorflow.keras.preprocessing.sequence import pad_sequences

    half = max_len // 2
    result = [seq if len(seq) <= max_len else seq[:half] + seq[-half:] for seq in sequences]
    return pad_sequences(result, maxlen=max_len, padding='post', truncating='post')
