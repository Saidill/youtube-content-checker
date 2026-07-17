# Draft Google Form UAT - YouTube Content Checker

Tujuan form ini adalah mengumpulkan masukan awal dari orang tua/pengasuh setelah menonton video demo YouTube Content Checker. Karena responden belum mencoba aplikasi secara langsung, pertanyaan UAT difokuskan pada pemahaman alur, kejelasan informasi, manfaat fitur, dan minat penggunaan berdasarkan demo.

Estimasi durasi pengisian: 7-10 menit, termasuk menonton video demo sekitar 5 menit.

## Cara Import ke Google Forms

Google Forms tidak menyediakan impor multi-halaman dari CSV secara native. Cara paling praktis adalah memakai Google Apps Script:

1. Buka `https://script.google.com/`.
2. Buat project baru.
3. Paste isi file [create_uat_google_form.gs](/Users/saidilhalim/Documents/youtube-content-checker/docs/uat/create_uat_google_form.gs).
4. Ganti `DEMO_VIDEO_URL` dengan link video demo.
5. Jalankan fungsi `createUatGoogleForm`.
6. Berikan izin akses Google.
7. Buka `View > Logs` untuk melihat link edit form dan link responden.

## Narasi Pembuka Form

Terima kasih sudah bersedia membantu evaluasi awal YouTube Content Checker. Form ini bertujuan memahami kebutuhan orang tua/pengasuh dan menilai kesan Anda setelah menonton video demo aplikasi. Pengisian diperkirakan memakan waktu 7-10 menit, termasuk menonton video demo sekitar 5 menit.

## Bagian 1 - Profil Singkat Responden

Narasi:
Sebelum masuk ke pertanyaan utama, kami ingin mengenal sedikit konteks Anda dalam mendampingi anak menggunakan YouTube.

1. Nama / inisial
2. Rentang usia Anda
3. Hubungan Anda dengan anak yang biasa Anda dampingi
4. Usia anak yang paling sering Anda dampingi saat menonton YouTube
5. Perangkat apa yang biasanya digunakan anak untuk menonton YouTube?

## Bagian 2 - Kebiasaan Menonton YouTube dan Kekhawatiran

Narasi:
Bagian ini membantu kami memahami bagaimana anak biasanya menggunakan YouTube dan tantangan yang Anda rasakan saat mendampingi mereka.

1. Seberapa sering anak menonton YouTube dalam seminggu?
2. Rata-rata berapa lama anak menonton YouTube dalam satu hari?
3. Seberapa khawatir Anda terhadap kemungkinan anak menemukan konten yang tidak sesuai usia di YouTube?
4. Hal apa yang biasanya membuat Anda khawatir dari konten YouTube untuk anak?
5. Biasanya, bagaimana cara Anda memeriksa apakah video YouTube aman untuk anak?

## Bagian 3 - Menonton Video Demo Aplikasi

Narasi:
Sebelum menjawab bagian UAT, silakan tonton video demo singkat sampai selesai. Demo memperlihatkan cara aplikasi menerima URL YouTube, memilih model AI, lalu menampilkan hasil deteksi, ringkasan, kata tidak pantas, dan analisis risiko.

1. Apakah Anda sudah menonton video demo aplikasi sampai selesai?
2. Setelah menonton demo, apakah alur utama aplikasi terlihat mudah dipahami?
3. Bagian mana dari demo yang paling menarik atau paling Anda ingat?

## Bagian 4 - Penilaian UAT Berdasarkan Video Demo

Narasi:
Pada bagian ini, beri penilaian berdasarkan kesan Anda setelah melihat video demo. Skala 1 berarti sangat tidak setuju, dan skala 5 berarti sangat setuju.

Skala:
1 - Sangat tidak setuju
2 - Tidak setuju
3 - Netral
4 - Setuju
5 - Sangat setuju

Pernyataan:

1. Saya memahami tujuan utama aplikasi setelah melihat demo.
2. Alur penggunaan aplikasi terlihat sederhana untuk orang tua/pengasuh.
3. Informasi hasil deteksi konten terlihat membantu untuk mengambil keputusan.
4. Ringkasan AI membantu saya memahami isi video tanpa harus menonton semuanya.
5. Daftar kata tidak pantas dan konteksnya terlihat berguna untuk menilai risiko video.
6. Tampilan hasil analisis terlihat cukup jelas dan tidak membingungkan.
7. Secara umum, aplikasi ini terlihat bermanfaat untuk mendampingi anak menonton YouTube.

Pertanyaan lanjutan:
Jika ada bagian yang menurut Anda kurang jelas dari demo atau tampilan aplikasi, bagian mana?

## Bagian 5 - Saran dan Minat Penggunaan

Narasi:
Terakhir, kami ingin mengetahui masukan Anda agar aplikasi ini bisa lebih sesuai dengan kebutuhan orang tua dan pengasuh.

1. Jika aplikasi ini sudah tersedia, seberapa besar kemungkinan Anda ingin mencobanya?
2. Seberapa besar kemungkinan Anda merekomendasikan aplikasi ini kepada orang tua/pengasuh lain?
3. Menurut Anda, fitur apa yang paling perlu ditambahkan atau diperbaiki?
4. Apakah ada saran lain untuk pengembangan YouTube Content Checker?
5. Apakah Anda bersedia dihubungi kembali jika dibutuhkan klarifikasi jawaban?
6. Jika bersedia, tuliskan kontak yang bisa dihubungi.
