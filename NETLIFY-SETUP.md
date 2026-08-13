# 🚀 ZYREX V16 — Deployment ke Netlify

## Step 1: Push ke GitHub

### 1.1 Buat Repository GitHub Baru
- Pergi ke https://github.com/new
- Nama repo: `zyrex-v16` (atau nama lain)
- Description: `ZYREX Digital Ecosystem v16`
- **Private** atau **Public** (pilih sesuai)
- Klik **Create Repository**

### 1.2 Push Code Dari Lokal
```bash
cd zyrex_v8
git init
git add .
git commit -m "Initial commit: ZYREX v16 ready for Netlify"
git branch -M main
git remote add origin https://github.com/USERNAME/zyrex-v16.git
git push -u origin main
```

**Ganti `USERNAME` dengan username GitHub Anda!**

---

## Step 2: Setup Supabase (Database)

### 2.1 Buat Project Supabase
- Pergi ke https://supabase.com
- Login / Sign Up
- Klik **New Project**
- Isi details (nama, password, region pilih Asia)
- Tunggu selesai (~2 menit)

### 2.2 Copy Keys
- Di sidebar, pilih **Settings → API**
- Copy:
  - `Project URL` → ini jadi `SUPABASE_URL`
  - `anon public` → ini jadi `SUPABASE_ANON_KEY`
  - `service_role secret` → ini jadi `SUPABASE_SERVICE_ROLE_KEY`
- **Simpan di tempat aman!** ⚠️

### 2.3 Setup Database Schema
- Di Supabase, buka **SQL Editor**
- Klik **New Query**
- Copy-paste isi file `database/supabase-schema.sql`
- Klik **Run**

---

## Step 3: Deploy ke Netlify

### 3.1 Connect Netlify dengan GitHub
- Pergi ke https://app.netlify.com
- Login / Sign Up (pilih **Sign up with GitHub**)
- Authorize Netlify
- Klik **Add new site → Import an existing project**
- Pilih GitHub → Authorize
- Pilih repo `zyrex-v16`

### 3.2 Build Settings
- **Base directory:** (kosongkan)
- **Build command:** `npm install`
- **Publish directory:** `frontend`
- Klik **Deploy site**

Netlify bakal mulai build. Tunggu selesai! ⏳

### 3.3 Set Environment Variables
Setelah deploy dimulai:
- Di Netlify dashboard, pilih site
- **Site settings → Build & deploy → Environment**
- Klik **Edit variables**
- Tambahkan:

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_ANON_KEY = your_anon_key
SUPABASE_SERVICE_ROLE_KEY = your_service_role_key
TELEGRAM_BOT_TOKEN = (optional)
TELEGRAM_CHAT_ID = (optional)
NODE_ENV = production
```

- Klik **Save**
- Netlify bakal redeploy otomatis dengan env vars

---

## Step 4: Custom Domain (Optional)

- Di Netlify: **Site settings → Domain management**
- Klik **Add custom domain**
- Ikuti instruksi
- DNS pointing otomatis atau manual

---

## Step 5: Test Deployment

✅ Akses site di `https://your-site-name.netlify.app`
✅ Cek console browser (F12) untuk errors
✅ Test API endpoints (orders, payments, etc)
✅ Telegram notifications (jika enabled)

---

## Troubleshooting

**Build fail?**
- Cek Netlify **Deploy logs**
- Pastikan `package.json` benar
- Cek env variables

**Backend error?**
- Cek Supabase connection
- Pastikan database schema sudah run
- Cek `SUPABASE_URL` dan keys

**CORS error?**
- Di backend `server.js`, CORS sudah setup
- Pastikan frontend URL di-allow di Supabase

---

## Auto-Deploy

✨ Setiap kali push ke GitHub, Netlify otomatis deploy!

```bash
git add .
git commit -m "Update fitur baru"
git push origin main
# Netlify deploy otomatis!
```

---

**Sukses! 🎉**
