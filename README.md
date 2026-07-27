# 📸 FaceAttend Enterprise

![Status](https://img.shields.io/badge/Status-Completed-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**FaceAttend Enterprise** adalah sistem absensi biometrik canggih berbasis pengenalan wajah (*Facial Recognition*) yang dirancang untuk skala industri. Menggunakan arsitektur monorepo dengan pemisahan Frontend Kiosk/Dashboard dan Backend API.

Diciptakan oleh **Leon** sebagai Proyek Portfolio / Ujian Praktik.

---

## ✨ Fitur Utama

- 🔐 **Verifikasi Biometrik Instan:** Ekstraksi matriks wajah 128-D menggunakan `face-api.js`.
- 🧠 **Smart Attendance Logic:** Deteksi otomatis status absensi (Masuk/Pulang) berdasarkan riwayat harian.
- ⏱️ **Biometric Cooldown & Anti-Spam:** Mencegah pengiriman data absensi ganda saat pengguna berdiri di depan kamera.
- 📊 **Real-time Admin Dashboard:** Manajemen data karyawan dan riwayat absensi secara *real-time*.
- 🖥️ **Kiosk Mode:** Mendukung mode layar penuh (*Fullscreen*) khusus untuk mesin absensi fisik di lokasi.

---

## 🛠️ Tech Stack

**Frontend:**
- React.js (TypeScript)
- Vite
- Tailwind CSS
- Face-API.js (AI Model)
- SweetAlert2

**Backend:**
- Node.js & Express.js
- Prisma ORM
- PostgreSQL (Supabase)

---

## 🚀 Cara Menjalankan di Lokal (Development)

Pastikan Anda sudah menginstal **Node.js** dan memiliki database **PostgreSQL**.

### 1. Kloning Repositori
```bash
git clone [https://github.com/USERNAME_GITHUB/NAMA_REPO.git](https://github.com/USERNAME_GITHUB/NAMA_REPO.git)
cd NAMA_REPO