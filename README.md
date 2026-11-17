# Gagah — catatan gym + lari ala Hevy

Next.js 15 (App Router) + Supabase + Tailwind, bisa di-install di HP sebagai PWA

## Fitur

- Routine (Push/Pull/Legs dll): set, target reps, waktu istirahat per latihan
- Logger latihan ala Hevy: kolom "Sebelumnya" dari sesi terakhir, centang set langsung keisi otomatis, tipe set (Warm-up / Drop / Failure), rest timer dengan getar, durasi dan volume live
- Sesi yang belum selesai tetap tersimpan di HP (aman kalau app ketutup)
- Halaman progres per latihan: grafik Est. 1RM, beban terberat, volume, reps, plus Personal Record
- Badge 🏆 PR otomatis di detail latihan
- Lari: sync dari Strava (Run, Trail Run, Virtual Run), grafik km per minggu, tren pace, input manual juga bisa
- **Coach otomatis (gratis, tanpa AI)**: isi data diri dan target, lalu coach menganalisis data gym + lari: target beban/reps sesi berikutnya, latihan yang stagnan, volume per otot, saran deload, kenaikan km lari, rasio easy/keras, zona pace, prediksi waktu target lari, jadwal mingguan, dan program gym yang bisa diterapkan 1 klik
- Beranda: ringkasan minggu ini dan aktivitas terakhir gabungan gym + lari

## Setup

### 1. Supabase

1. Buat project baru di https://supabase.com
2. Buka **SQL Editor**, paste isi `supabase/schema.sql`, Run
3. **Authentication > Providers > Email**: matikan *Confirm email* biar bisa langsung login (karena dipakai sendiri)
4. **Project Settings > API**: salin `Project URL` dan `anon public key`

### 2. Strava

1. Buka https://www.strava.com/settings/api lalu buat aplikasi
2. *Authorization Callback Domain*: isi `localhost` untuk development (nanti ganti ke domain Vercel, mis. `liftrun-dzhe.vercel.app`)
3. Salin `Client ID` dan `Client Secret`

### 3. Coach

Jalankan juga `supabase/coach.sql` di SQL Editor. Coach 100% gratis, tidak pakai API AI

### 3b. Jalankan lokal

```bash
npm install
cp .env.example .env.local   # isi 4 nilai di atas
npm run dev
```

Buka http://localhost:3000, daftar akun, selesai

### 4. Deploy ke Vercel (biar bisa dipakai di HP)

1. Push folder ini ke GitHub
2. Import di Vercel, isi 4 environment variable yang sama
3. Ganti *Authorization Callback Domain* di Strava ke domain Vercel
4. Buka domain itu di HP:
   - iPhone (Safari): Share > **Add to Home Screen**
   - Android (Chrome): menu ⋮ > **Install app**

## Struktur

```
app/
  page.tsx                 beranda / ringkasan minggu ini
  workout/page.tsx         logger latihan (?routine=<id> untuk mulai dari routine)
  routines/                daftar, buat, edit routine
  history/                 riwayat + detail latihan (dengan badge PR)
  exercises/               progres per latihan + grafik
  runs/page.tsx            lari, Strava, grafik
  api/strava/connect       redirect ke OAuth Strava
  api/strava/callback      simpan token
  api/strava/sync          tarik aktivitas lari (incremental, ?full=1 untuk semua)
components/                WorkoutLogger, ExercisePicker, RoutineEditor, chart, dll
supabase/schema.sql        tabel + RLS + 30 latihan bawaan
```

## Catatan

- Est. 1RM pakai rumus Epley: `beban × (1 + reps/30)`
- Set warm-up tidak dihitung ke PR dan grafik
- Hapus 1 set: double-tap nomor set, atau tombol "− Set"
- Sync Strava cuma narik aktivitas setelah lari Strava terakhir yang sudah tersimpan, jadi cepat
