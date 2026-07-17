/**
 * Google Apps Script untuk membuat Google Form UAT YouTube Content Checker.
 *
 * Cara pakai:
 * 1. Buka https://script.google.com/
 * 2. Buat project baru, lalu paste seluruh isi file ini.
 * 3. Ganti DEMO_VIDEO_URL dengan link video demo 5 menit.
 * 4. Klik Run pada fungsi createUatGoogleForm.
 * 5. Izinkan akses Google, lalu cek log untuk link edit dan link responden.
 */

const DEMO_VIDEO_URL = 'https://youtu.be/GANTI_DENGAN_LINK_VIDEO_DEMO';

function createUatGoogleForm() {
  const form = FormApp.create('UAT YouTube Content Checker untuk Orang Tua/Pengasuh');

  form.setDescription(
    'Terima kasih sudah bersedia membantu evaluasi awal YouTube Content Checker. ' +
    'Form ini bertujuan memahami kebutuhan orang tua/pengasuh dan menilai kesan Anda setelah menonton video demo aplikasi. ' +
    'Pengisian diperkirakan memakan waktu 7-10 menit, termasuk menonton video demo sekitar 5 menit.'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Terima kasih atas waktunya. Masukan Anda sangat membantu pengembangan YouTube Content Checker agar lebih relevan bagi orang tua dan pengasuh.'
  );

  addSectionOneProfile(form);
  addSectionTwoHabits(form);
  addSectionThreeDemo(form);
  addSectionFourUat(form);
  addSectionFiveFeedback(form);

  Logger.log('Link edit form: ' + form.getEditUrl());
  Logger.log('Link untuk responden: ' + form.getPublishedUrl());
}

function addSectionOneProfile(form) {
  form.addPageBreakItem()
    .setTitle('Bagian 1 - Profil Singkat Responden')
    .setHelpText(
      'Sebelum masuk ke pertanyaan utama, kami ingin mengenal sedikit konteks Anda dalam mendampingi anak menggunakan YouTube.'
    );

  form.addTextItem()
    .setTitle('Nama / inisial')
    .setHelpText('Boleh menggunakan inisial jika ingin lebih nyaman.')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Rentang usia Anda')
    .setChoiceValues(['< 20 tahun', '20-29 tahun', '30-39 tahun', '40-49 tahun', '50 tahun atau lebih'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Hubungan Anda dengan anak yang biasa Anda dampingi')
    .setChoiceValues(['Orang tua', 'Pengasuh', 'Kakak/keluarga', 'Guru/pendamping belajar', 'Lainnya'])
    .showOtherOption(true)
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Usia anak yang paling sering Anda dampingi saat menonton YouTube')
    .setChoiceValues(['0-3 tahun', '4-6 tahun', '7-9 tahun', '10-12 tahun', '13 tahun atau lebih'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Perangkat apa yang biasanya digunakan anak untuk menonton YouTube?')
    .setChoiceValues(['HP orang tua', 'HP anak sendiri', 'Tablet', 'Laptop/komputer', 'Smart TV'])
    .showOtherOption(true)
    .setRequired(true);
}

function addSectionTwoHabits(form) {
  form.addPageBreakItem()
    .setTitle('Bagian 2 - Kebiasaan Menonton YouTube dan Kekhawatiran')
    .setHelpText(
      'Bagian ini membantu kami memahami bagaimana anak biasanya menggunakan YouTube dan tantangan yang Anda rasakan saat mendampingi mereka.'
    );

  form.addMultipleChoiceItem()
    .setTitle('Seberapa sering anak menonton YouTube dalam seminggu?')
    .setChoiceValues(['Jarang, kurang dari 1 kali seminggu', '1-2 kali seminggu', '3-4 kali seminggu', 'Hampir setiap hari', 'Setiap hari'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Rata-rata berapa lama anak menonton YouTube dalam satu hari?')
    .setChoiceValues(['Kurang dari 30 menit', '30-60 menit', '1-2 jam', 'Lebih dari 2 jam', 'Tidak tentu'])
    .setRequired(true);

  form.addScaleItem()
    .setTitle('Seberapa khawatir Anda terhadap kemungkinan anak menemukan konten yang tidak sesuai usia di YouTube?')
    .setBounds(1, 5)
    .setLabels('Tidak khawatir', 'Sangat khawatir')
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('Hal apa yang biasanya membuat Anda khawatir dari konten YouTube untuk anak?')
    .setChoiceValues([
      'Bahasa kasar atau tidak pantas',
      'Konten kekerasan',
      'Konten dewasa atau tidak sesuai usia',
      'Clickbait atau judul/thumbnail menyesatkan',
      'Komentar yang tidak pantas',
      'Iklan atau tautan mencurigakan'
    ])
    .showOtherOption(true)
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Biasanya, bagaimana cara Anda memeriksa apakah video YouTube aman untuk anak?')
    .setHelpText('Contoh: menonton dulu, melihat judul/thumbnail, membaca komentar, memakai YouTube Kids, atau cara lainnya.')
    .setRequired(false);
}

function addSectionThreeDemo(form) {
  form.addPageBreakItem()
    .setTitle('Bagian 3 - Menonton Video Demo Aplikasi')
    .setHelpText(
      'Sebelum menjawab bagian UAT, silakan tonton video demo singkat berikut sampai selesai. ' +
      'Demo memperlihatkan cara aplikasi menerima URL YouTube, memilih model AI, lalu menampilkan hasil deteksi, ringkasan, kata tidak pantas, dan analisis risiko.\n\n' +
      'Link video demo: ' + DEMO_VIDEO_URL
    );

  form.addMultipleChoiceItem()
    .setTitle('Apakah Anda sudah menonton video demo aplikasi sampai selesai?')
    .setChoiceValues([
      'Ya, saya sudah menonton sampai selesai',
      'Saya menonton sebagian besar video',
      'Saya hanya menonton sebagian kecil',
      'Belum menonton'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Setelah menonton demo, apakah alur utama aplikasi terlihat mudah dipahami?')
    .setChoiceValues(['Sangat mudah dipahami', 'Cukup mudah dipahami', 'Netral', 'Agak sulit dipahami', 'Sulit dipahami'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Bagian mana dari demo yang paling menarik atau paling Anda ingat?')
    .setRequired(false);
}

function addSectionFourUat(form) {
  form.addPageBreakItem()
    .setTitle('Bagian 4 - Penilaian UAT Berdasarkan Video Demo')
    .setHelpText(
      'Pada bagian ini, beri penilaian berdasarkan kesan Anda setelah melihat video demo. ' +
      'Skala 1 berarti sangat tidak setuju, dan skala 5 berarti sangat setuju.'
    );

  const grid = form.addGridItem()
    .setTitle('Beri penilaian untuk pernyataan berikut')
    .setRows([
      'Saya memahami tujuan utama aplikasi setelah melihat demo.',
      'Alur penggunaan aplikasi terlihat sederhana untuk orang tua/pengasuh.',
      'Informasi hasil deteksi konten terlihat membantu untuk mengambil keputusan.',
      'Ringkasan AI membantu saya memahami isi video tanpa harus menonton semuanya.',
      'Daftar kata tidak pantas dan konteksnya terlihat berguna untuk menilai risiko video.',
      'Tampilan hasil analisis terlihat cukup jelas dan tidak membingungkan.',
      'Secara umum, aplikasi ini terlihat bermanfaat untuk mendampingi anak menonton YouTube.'
    ])
    .setColumns([
      '1 - Sangat tidak setuju',
      '2 - Tidak setuju',
      '3 - Netral',
      '4 - Setuju',
      '5 - Sangat setuju'
    ])
    .setRequired(true);

  grid.setHelpText('Pilih satu nilai untuk setiap pernyataan.');

  form.addParagraphTextItem()
    .setTitle('Jika ada bagian yang menurut Anda kurang jelas dari demo atau tampilan aplikasi, bagian mana?')
    .setRequired(false);
}

function addSectionFiveFeedback(form) {
  form.addPageBreakItem()
    .setTitle('Bagian 5 - Saran dan Minat Penggunaan')
    .setHelpText(
      'Terakhir, kami ingin mengetahui masukan Anda agar aplikasi ini bisa lebih sesuai dengan kebutuhan orang tua dan pengasuh.'
    );

  form.addMultipleChoiceItem()
    .setTitle('Jika aplikasi ini sudah tersedia, seberapa besar kemungkinan Anda ingin mencobanya?')
    .setChoiceValues(['Sangat ingin mencoba', 'Mungkin ingin mencoba', 'Masih ragu-ragu', 'Kemungkinan tidak mencoba', 'Tidak ingin mencoba'])
    .setRequired(true);

  form.addScaleItem()
    .setTitle('Seberapa besar kemungkinan Anda merekomendasikan aplikasi ini kepada orang tua/pengasuh lain?')
    .setBounds(1, 5)
    .setLabels('Tidak mungkin', 'Sangat mungkin')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Menurut Anda, fitur apa yang paling perlu ditambahkan atau diperbaiki?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Apakah ada saran lain untuk pengembangan YouTube Content Checker?')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Apakah Anda bersedia dihubungi kembali jika dibutuhkan klarifikasi jawaban?')
    .setChoiceValues(['Ya', 'Tidak'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Jika bersedia, tuliskan kontak yang bisa dihubungi')
    .setHelpText('Opsional. Bisa nomor WhatsApp atau email.')
    .setRequired(false);
}
