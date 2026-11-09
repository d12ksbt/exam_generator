# Panduan Hosting Aplikasi ke GitHub Pages

Aplikasi **SMK Exam Generator AI** adalah aplikasi React berbasis Vite yang menghasilkan file statis (HTML, JS, CSS) siap saji. Aplikasi ini **100% bisa dihosting gratis di GitHub Pages**.

---

## 🚀 Pilihan Cara Hosting ke GitHub Pages

### Pilihan 1: Otomatis dengan GitHub Actions (Sangat Disarankan)

Kami sudah menyiapkan file alur kerja otomatis di folder `.github/workflows/deploy.yml`. 

Langkah-langkahnya:
1. Buat repository baru di akun GitHub Anda (misal: `smk-exam-generator`).
2. Unggah/Push seluruh folder project ini ke repository GitHub Anda:
   ```bash
   git init
   git add .
   git commit -m "Inisialisasi SMK Exam Generator"
   git branch -M main
   git remote add origin https://github.com/<USERNAME-ANDA>/smk-exam-generator.git
   git push -u origin main
   ```
3. Buka repository Anda di browser GitHub.
4. Klik tab **Settings** > pilih menu **Pages** di sebelah kiri.
5. Pada bagian **Build and deployment** -> **Source**, ubah pilihan menjadi:
   👉 **GitHub Actions**
6. GitHub akan otomatis menjalankan workflow build dan aplikasi Anda akan langsung online di URL:
   `https://<USERNAME-ANDA>.github.io/smk-exam-generator/`

---

### Pilihan 2: Upload Langsung Folder `dist/` (Hasil Build)

Jika Anda ingin langsung mengunggah file yang sudah jadi tanpa proses build:
1. File hasil build sudah berada di dalam folder `/dist`:
   - `dist/index.html` (sudah dioptimasi dengan path relatif `./assets/...`)
   - `dist/assets/` (kumpulan script dan style)
   - `dist/.nojekyll` (mencegah GitHub mengabaikan aset statis)
2. Anda bisa mengunggah **isi dari folder `dist/` ini** ke branch `gh-pages` atau langsung ke root repository GitHub Pages Anda.

---

## 🔑 Pengaturan Basis Data Login (Google Spreadsheet)

Aplikasi telah terhubung ke Google Spreadsheet:
- **Spreadsheet ID**: `1AfWC71g0kj1ZVSYT1cYSqMIiSCzr0pJhCqQTB7iuxsQ`
- **Nama Sheet**: `Users`
- **Format Kolom**:
  | Username | Password | Nama Guru | NIP |
  |---|---|---|---|
  | budi | 123456 | Budi Santoso, S.Pd. | 198501012010011001 |
  | siti | rahasia | Dra. Siti Aminah | 197803122005012003 |

### ⚠️ PENTING: Pengaturan Izin Akses Spreadsheet
Agar data akun guru dapat dibaca oleh browser pengunjung web GitHub Pages:
1. Buka spreadsheet Anda di Google Drive.
2. Klik tombol **Bagikan (Share)** di pojok kanan atas.
3. Di bagian **Akses umum (General access)**, ubah dari **Dibatasi** menjadi **Siapa saja yang memiliki link** (Anyone with the link).
4. Pastikan perannya adalah **Pelihat (Viewer)**.
5. Klik **Selesai (Done)**.

---

## 🛡️ Fitur Baru yang Telah Ditambahkan

1. **Form Login Portal Guru SMK**:
   - Field Password dilengkapi tombol ikon mata (**Show / Hide Password**).
   - Indikator proses **Loading Beranimasi** (koneksi ke database spreadsheet, verifikasi kredensial).
   - Mode Uji Coba / Demo instan jika spreadsheet sedang dalam mode privat.
2. **Otomatisasi Profil Guru**:
   - Nama Guru dan NIP yang berhasil login akan otomatis masuk ke data Penyusun Soal dan Tanda Tangan.
   - Dilengkapi tombol **Keluar (Logout)** di sudut kanan atas untuk berganti akun.
3. **Autosave LocalStorage**:
   - Isian form tetap tersimpan otomatis di perangkat sehingga aman saat refresh.
