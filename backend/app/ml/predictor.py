"""Inference: teks mentah → probabilitas, label, dan confidence."""
from dataclasses import asdict, dataclass

from app.config import CONFIDENCE_THRESHOLD, THRESHOLD
from app.ml.model_store import get_model, get_tokenizer
from app.ml.preprocessing import clean_text, head_tail_truncate


@dataclass
class Prediction:
    label: int
    label_text: str
    probability: float      # P(inappropriate)
    confidence: float       # |p - 0.5| * 2, rentang 0–1
    confidence_label: str
    model_used: str

    def to_dict(self):
        return asdict(self)


def predict(text, model_name):
    tok = get_tokenizer()
    model = get_model(model_name)
    seq = tok.texts_to_sequences([clean_text(text)])
    prob = float(model.predict(head_tail_truncate(seq), verbose=0)[0][0])

    label = int(prob > THRESHOLD)
    conf = abs(prob - 0.5) * 2
    return Prediction(
        label=label,
        label_text="Inappropriate" if label == 1 else "Appropriate",
        probability=round(prob, 4),
        confidence=round(conf, 4),
        confidence_label="Sangat Yakin" if conf > CONFIDENCE_THRESHOLD else "Tidak Yakin",
        model_used=model_name,
    )
