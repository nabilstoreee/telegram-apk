# Telegram Native Android App (Kotlin & Jetpack Compose)

Proyek ini adalah implementasi native Android untuk aplikasi **Telegram**, dibangun menggunakan **Kotlin**, **Jetpack Compose**, dan **Material 3**.

---

## 📱 Fitur-Fitur Aplikasi Android
1. **Antarmuka Khas Telegram (Dark & Light Mode)**:
   - Warna presisi Telegram: `#5288C1` (Telegram Blue), `#17212B` (Dark Canvas), `#242F3D` (Dark Surface), `#2B5278` (Outgoing Bubble).
   - Toggle instan mode malam pada side drawer.
2. **Tab Kategori Obrolan**:
   - Tab scrollable: *Semua*, *Pribadi*, *Grup*, *Saluran*.
3. **Pesan Tersimpan (Saved Messages)**:
   - Obrolan khusus dengan tanda bintang (★) untuk menyimpan catatan dan media pribadi.
4. **Detail Obrolan & Pengiriman Pesan**:
   - Gelembung pesan masuk dan keluar dengan penanda waktu dan centang ganda terbaca (*read receipt*).
   - Kolom composer dengan tombol lampiran, emoji, dan mikrofon/kirim dinamis.
5. **Autentikasi & Akses Cepat**:
   - Form Masuk & Daftar akun baru.
   - Tombol 1-Klik Masuk Cepat sebagai Admin (`@nabilassihidiqi`) atau Tamu.
6. **Side Drawer Telegram**:
   - Header profil pengguna lengkap dengan inisial avatar, nama, nomor telepon, serta menu navigasi.

---

## 🛠️ Persyaratan Sistem
- **Android Studio**: Android Studio Hedgehog (2023.1.1) atau versi lebih baru (Ladybug / Koala direkomendasikan).
- **JDK**: Java 17 atau Java 21 (sudah disertakan di dalam Android Studio).
- **Target SDK**: Android 15 (API 35) / Min SDK: Android 8.0 (API 26).

---

## 🚀 Cara Membuka & Menjalankan di Android Studio

1. **Ekspor Proyek**:
   - Di Google AI Studio, klik menu **Settings** (ikon gear di kanan atas) lalu pilih **Export to ZIP** atau **Export to GitHub**.
   - Ekstrak file ZIP di laptop / PC Anda.

2. **Buka di Android Studio**:
   - Buka Android Studio.
   - Pilih menu **Open** (atau *File > Open*).
   - Arahkan ke folder **`android/`** di dalam proyek yang diekstrak.
   - Klik **OK**. Android Studio akan otomatis menyinkronkan Gradle (*Gradle Sync*).

3. **Jalankan Aplikasi**:
   - Pilih perangkat Emulator atau HP Android fisik (aktifkan *USB Debugging*).
   - Klik tombol hijau **Run 'app'** (Shift + F10).

4. **Membuat File APK (`.apk`)**:
   - Buka tab Terminal di Android Studio, lalu jalankan:
     ```bash
     ./gradlew assembleDebug
     ```
     (Pada Windows gunakan: `gradlew.bat assembleDebug`)
   - File APK hasil build akan berada di:
     `app/build/outputs/apk/debug/app-debug.apk`
   - Salin file APK tersebut ke HP Android Anda dan instal secara langsung!
