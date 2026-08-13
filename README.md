# ZYREX Digital Ecosystem V7.1

## One-click Render build
Frontend and backend are bundled into one Render Web Service. The Express server serves `frontend/` and exposes `/api/*` from the same origin.

See `RENDER-ONE-CLICK.md` for the exact deployment steps.

### Project layout
- `frontend/` — public website + admin UI + assets
- `backend/` — Node/Express API and static frontend server
- `database/` — Supabase schema

### Production secrets
Keep all secrets in Render Environment Variables. Never commit `.env`.

## V9 HYPER VISUAL OVERHAUL
This build is intentionally a major visual redesign: cinematic hero, telemetry HUD, animated grid, system map, hyper strip, cursor interaction, 3D card tilt, scanlines, marquee edge typography, and stronger responsive mobile composition. Core Store/Auth/AI/backend architecture is retained.

# ZYREX V11 BLACKSITE
Major visual overhaul with responsive-safe HUD, telemetry deck, portal/radar hero and mobile overflow protections.

## V14.3 Stable quick start
1. Open terminal in `backend/`.
2. `npm install`
3. `npm start`
4. Open `http://localhost:3000/`
5. Admin: `http://localhost:3000/admin`
6. Local admin: `admin@zyrex.local` / `admin123` (development only).
