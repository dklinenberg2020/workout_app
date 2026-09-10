# Workout Tracker

A mobile-first PWA for tracking lifts and HIIT sessions — built for a 6-day split (Sat rest, 3 heavy lifting days on the five basic barbell lifts, 3 HIIT days).

Right now this covers the **tracking infrastructure**: logging sets/reps/weight, logging HIIT sessions, workout history, and per-lift progress (estimated 1-rep max over time via the Epley formula). The actual weekly schedule from your trainer isn't built in yet — for now you just pick "Lift Heavy" or "HIIT" each day you log.

## Stack

- React + TypeScript + Vite
- [Dexie](https://dexie.org/) (IndexedDB) — all data is stored **locally in the browser**, no backend/server
- `vite-plugin-pwa` — installable as a home-screen app on iOS/Android, works offline
- Deployed to GitHub Pages via GitHub Actions on every push to `main`

## Data model

- **Exercises** — seeded with the five basic lifts (Squat, Bench Press, Deadlift, Overhead Press, Barbell Row) plus a generic HIIT Session entry. Add your own on the Exercises tab.
- **Sessions** — one per date + type (lift or HIIT).
- **Sets** — weight × reps per exercise per session.
- **Cardio entries** — duration + notes per HIIT session.

## Local development

```bash
npm install
npm run dev
```

## Deploying

Push to `main` and GitHub Actions builds and publishes to GitHub Pages automatically (workflow: `.github/workflows/deploy.yml`).

One-time setup in the repo: **Settings → Pages → Source → GitHub Actions**.

The app is built assuming it's served from `/workout_app/` (see `base` in `vite.config.ts`) — update that if the repo is renamed.

## Installing on iPhone

Open the deployed GitHub Pages URL in Safari, tap Share → **Add to Home Screen**. It'll behave like a standalone app and keeps working offline since everything is stored locally on-device.

## Data location & backup

All data lives in IndexedDB in your browser on that device — nothing is synced anywhere. Clearing Safari site data / uninstalling will erase it. There's no export/import yet; that's a natural next step if you want cross-device sync or backups.
