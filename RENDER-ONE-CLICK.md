# ZYREX V7.1 — One-Click Render Deployment

This build is prepared to run **frontend + backend from one Render Web Service**. The Node/Express backend serves `frontend/` itself, so you do not need Vercel for the frontend.

## 1. GitHub
Upload the project contents to a GitHub repository. Do **not** upload `backend/.env` or any secret API key.

## 2. Supabase
Create a Supabase project and run:

`database/supabase-schema.sql`

Then keep these values ready:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3. Render
Create **New → Web Service** and connect the GitHub repository.

Use:
- Root Directory: `backend`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`

The backend uses `../frontend`, so the frontend is served automatically.

## 4. Environment variables
Add these in Render:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_API_KEY` (optional until AI is configured)
- `AI_API_URL` (optional until AI is configured)
- `AI_MODEL` (optional until AI is configured)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH` (recommended)
- `ADMIN_TOKEN` (optional legacy admin access)
- `FRONTEND_URL` (optional; Render can use `RENDER_EXTERNAL_URL`)
- `ALLOWED_ORIGINS` (optional for cross-origin access)

For a single-service deployment, frontend requests use `/api` automatically.

## 5. URLs after deploy
- Website: `https://YOUR-SERVICE.onrender.com/`
- Admin: `https://YOUR-SERVICE.onrender.com/admin`
- Health: `https://YOUR-SERVICE.onrender.com/api/health`

## 6. QRIS
The default QRIS asset is:
`frontend/assets/zyrex-qris.jpg`

## 7. Important security rule
Never put `AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or admin secrets into frontend files or GitHub. Put them only in Render Environment Variables.

## 8. Payment behavior
The current store supports checkout, QRIS display, payment-proof upload and admin verification. Automatic bank/QRIS payment confirmation still requires a payment gateway/webhook integration.
