# YouTube Content Checker

Aplikasi deteksi konten YouTube berbasis AI 

## Fitur
- Deteksi konten inappropriate menggunakan model deep learning (biLSTM, CNN-biLSTM, biLSTM-Attention, CNN-biLSTM-Attention)
- Analisis child safety
- Ganti model secara real-time
- Tampilan mirip YouTube (dark mode)

---

## Struktur Project

```
youtube-content-checker/
├── backend/
│   ├── main.py              ← FastAPI server
│   ├── requirements.txt
│   ├── .env                 ← API keys (buat sendiri dari .env.example)
│   └── models/              ← Letakkan file .h5 dan tokenizer.pkl di sini
│       ├── tokenizer.pkl
│       ├── bilstm_headtail_content_moderation.h5
│       ├── cnn_bilstm_content_moderation.h5
│       ├── bilstm_attention_content_moderation.h5
│       └── cnn_bilstm_attention.h5
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx     ← Halaman utama
    │   │   ├── layout.tsx
    │   │   └── globals.css
    │   └── lib/
    │       └── api.ts       ← Helper API calls
    ├── package.json
    └── ...
```

---

## STEP 1 — Persiapan API Keys

### YouTube Data API v3 (Gratis)
1. Buka https://console.cloud.google.com
2. Buat project baru
3. Enable "YouTube Data API v3"
4. Buat API Key di Credentials
5. Copy API key

### Gemini API (Gratis)
1. Buka https://aistudio.google.com/app/apikey
2. Klik "Create API Key"
3. Copy API key

---

## STEP 2 — Setup Backend (FastAPI)

```bash
# Masuk ke folder backend
cd youtube-content-checker/backend

# Buat virtual environment
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Buat file .env dari template
cp .env.example .env
```

Edit file `.env`:
```
YOUTUBE_API_KEY=AIza...   ← paste YouTube API key 
```

### Letakkan file model

Copy file `.h5` dari Kaggle dan `tokenizer.pkl` ke folder `backend/models/`:

```
backend/models/
├── tokenizer.pkl                              ← WAJIB
├── bilstm_headtail_content_moderation.h5
├── cnn_bilstm_content_moderation.h5
├── bilstm_attention_content_moderation.h5
└── cnn_bilstm_attention.h5
```

### Cara export tokenizer.pkl dari Kaggle

Tambahkan cell ini di notebook Kaggle setelah training selesai:

```python
import pickle
with open('tokenizer.pkl', 'wb') as f:
    pickle.dump(tokenizer, f)
```

Lalu download `tokenizer.pkl` dari output Kaggle.

### Jalankan backend

```bash
# Pastikan sudah di folder backend dan venv aktif
uvicorn main:app --reload --port 8000
```

Backend berjalan di: http://localhost:8000
Docs API: http://localhost:8000/docs

---

## STEP 3 — Setup Frontend (Next.js)

```bash
# Buka terminal BARU (jangan tutup terminal backend)
cd youtube-content-checker/frontend

# Install dependencies
npm install

# Jalankan frontend
npm run dev
```

Frontend berjalan di: http://localhost:3000

---

## STEP 4 — Cara Pakai

1. Buka http://localhost:3000
2. Paste URL YouTube atau Video ID (contoh: `dQw4w9WgXcQ`)
3. Pilih model AI di panel kiri
4. Tekan Enter atau klik tombol search
5. Tunggu analisis selesai (~5-10 detik)
6. Lihat hasil di panel kanan:
   - **Hasil Deteksi** — Appropriate/Inappropriate + probabilitas
   - **Kategori Konten** — dari Gemini
   - **Ringkasan AI** — summary transcript/deskripsi
   - **Analisis Child Safety** — apakah aman untuk anak

---

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.10+ |
| AI Model | TensorFlow/Keras (.h5) |
| YouTube Data | YouTube Data API v3 |
| AI Summary | Google Gemini 1.5 Flash |
| HTTP Client | Axios (frontend), httpx (backend) |
