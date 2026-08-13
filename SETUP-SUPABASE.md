# Setup Supabase buat ZYREX backend

## 1. Bikin project Supabase
1. Buka https://supabase.com -> Sign up/login -> New Project.
2. Pilih nama project & password database (simpan passwordnya).
3. Tunggu project selesai provisioning (±2 menit).

## 2. Jalankan schema SQL
1. Di dashboard project, buka menu **SQL Editor** -> **New query**.
2. Copy-paste isi file `database/supabase-schema.sql` (di project ini), lalu klik **Run**.
   Ini bikin tabel `app_state` tempat semua data toko (users, orders, produk, dll) disimpan.

## 3. Ambil API key
1. Buka **Project Settings** -> **API**.
2. Catat dua nilai ini:
   - **Project URL** -> jadi `SUPABASE_URL`
   - **service_role key** (bukan yang `anon`/`public`!) -> jadi `SUPABASE_SERVICE_ROLE_KEY`
   
   ⚠️ **service_role key ini rahasia** — jangan pernah taruh di frontend/browser, cuma dipakai di environment variable backend.

## 4. Set environment variables di hosting kamu (Railway/Render/dll)
Tambahin variable ini di dashboard hosting:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... (yang panjang)
ADMIN_EMAIL=admin@zyrex.local  (ganti sesuai email admin kamu)
ADMIN_PASSWORD=...             (ganti password aman)
FRONTEND_URL=https://url-frontend-kamu.vercel.app
```

## 5. Deploy backend seperti biasa
Root Directory tetap `backend`, build/start command tetap default (`npm start`).
Server bakal otomatis bikin storage bucket `payment-proofs` dan `product-files`
di Supabase Storage pas pertama kali nyala.

## Yang berubah dari versi sebelumnya
- Data toko (produk, order, user, dll) sekarang disimpan di tabel Postgres
  `app_state`, bukan file `backend/data/db.json` lagi.
- Bukti pembayaran (payment proof) & file produk sekarang disimpan di
  Supabase Storage, bukan folder lokal `private-uploads/` lagi.
- Karena datanya udah nggak nempel ke disk server, kamu sekarang bebas
  pindah-pindah hosting (Railway, Render, Vercel, dll) kapan aja tanpa
  takut data ilang.
