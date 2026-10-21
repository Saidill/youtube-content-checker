"""Load model .h5 dan tokenizer sekali saja, lalu simpan di memori (lazy cache)."""
import logging
import pickle

from app.config import MODEL_REGISTRY, MODELS_DIR, TOKENIZER_PATH

log = logging.getLogger(__name__)

_models = {}
_tokenizer = None


class ModelNotAvailable(Exception):
    pass


def available_models():
    """Model yang terdaftar di registry DAN file .h5-nya ada di disk."""
    return [name for name in MODEL_REGISTRY if (MODELS_DIR / f"{name}.h5").exists()]


def loaded_models():
    return list(_models)


def get_tokenizer():
    global _tokenizer
    if _tokenizer is None:
        if not TOKENIZER_PATH.exists():
            raise ModelNotAvailable(f"Tokenizer '{TOKENIZER_PATH}' tidak ditemukan.")
        with open(TOKENIZER_PATH, "rb") as f:
            _tokenizer = pickle.load(f)
    return _tokenizer


def get_model(name):
    if name not in _models:
        # Validasi terhadap registry → mencegah path traversal lewat model_name
        if name not in MODEL_REGISTRY:
            raise ModelNotAvailable(f"Model '{name}' tidak terdaftar.")
        path = MODELS_DIR / f"{name}.h5"
        if not path.exists():
            raise ModelNotAvailable(f"File model '{path}' tidak ditemukan.")

        import tensorflow as tf
        log.info("Loading model %s", path)
        _models[name] = tf.keras.models.load_model(
            path, custom_objects={"AttentionLayer": _attention_layer_cls()}
        )
    return _models[name]


def _attention_layer_cls():
    """AttentionLayer custom — harus sama dengan definisi di notebook attention."""
    import tensorflow.keras.backend as K
    from tensorflow.keras.layers import Layer

    class AttentionLayer(Layer):
        def __init__(self, **kw):
            super().__init__(**kw)

        def build(self, s):
            self.W = self.add_weight(name='att_w', shape=(s[-1], 1), initializer='glorot_uniform', trainable=True)
            self.b = self.add_weight(name='att_b', shape=(s[1], 1),  initializer='zeros', trainable=True)
            super().build(s)

        def call(self, x):
            e = K.tanh(K.dot(x, self.W) + self.b)
            return K.sum(x * K.softmax(e, axis=1), axis=1)

        def compute_output_shape(self, s):
            return (s[0], s[-1])

    return AttentionLayer
