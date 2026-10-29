# HAIPAPA — AI Style Consultant

Aplikasi web konsultasi rambut dengan analisis foto pelanggan, rekomendasi empat haircut, virtual try-on, dan lembar hasil untuk capster.

## Fitur
- Upload foto JPG/PNG/WEBP (maksimal 3 MB).
- Analisis visual bentuk wajah (3 kategori dengan total persentase 100), proporsi wajah, hairline, dan tipe rambut.
- Empat rekomendasi haircut dengan skor kecocokan, alasan, dan catatan capster.
- Simulasi foto per gaya menggunakan OpenAI Image API. Satu simulasi = satu permintaan gambar API.
- Simpan hasil analisis di browser (localStorage) dan cetak/simpan PDF.
- API Key hanya berada di server, tidak dikirim ke browser.

## Jalankan lokal
1. Instal Node.js 20 atau lebih baru.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env`, lalu isi `OPENAI_API_KEY`.
4. Jalankan `npm run dev`.
5. Buka alamat lokal yang ditampilkan Vercel CLI.

## Deploy ke Vercel
1. Upload folder proyek ini ke repository GitHub baru, atau impor folder ke Vercel.
2. Di Vercel: **Project → Settings → Environment Variables**.
3. Tambahkan:
   - `OPENAI_API_KEY` = API key dari OpenAI Platform.
   - `OPENAI_ANALYSIS_MODEL` = `gpt-4o-mini` (opsional).
   - `OPENAI_IMAGE_MODEL` = `gpt-image-2` (opsional; harus tersedia pada akun API).
4. Pilih Production, Preview, dan Development sesuai kebutuhan.
5. Klik **Redeploy** setelah menambah atau mengubah Environment Variables.

## Catatan penting
- Langganan ChatGPT Go/Plus tidak termasuk kredit API. API ditagih terpisah di OpenAI Platform.
- Analisis wajah dan skor adalah perkiraan visual AI, bukan pengukuran medis/ilmiah. Persentase tiga bentuk wajah dinormalisasi agar berjumlah 100.
- Hasil edit gambar dapat sedikit mengubah detail wajah meskipun prompt meminta wajah dipertahankan. Periksa hasil sebelum digunakan sebagai referensi potong rambut.
- Foto pelanggan dikirim ke OpenAI untuk diproses. Dapatkan persetujuan pelanggan terlebih dahulu. Jangan mengunggah foto sensitif atau foto orang tanpa izin.
- Hasil konsultasi tersimpan di localStorage browser pada perangkat yang sama, bukan database cloud. Simulasi gambar yang dibuat dapat diunduh satu per satu atau hasil dapat dicetak sebagai PDF.
- Untuk penggunaan salon multi-perangkat, login, database cloud, riwayat lintas perangkat, dan kebijakan retensi foto perlu ditambahkan sebelum peluncuran publik.
- Lindungi API key, batasi akses aplikasi, atur budget/usage limits di OpenAI Platform, dan pantau penggunaan.
