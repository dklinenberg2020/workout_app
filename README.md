# Workout Tracker

A mobile-first PWA for tracking lifts and HIIT sessions — built for a 6-day split (Sat rest, 3 heavy lifting days on the five basic barbell lifts, 3 HIIT days).

Right now this covers the **tracking infrastructure**: logging sets/reps/weight, logging HIIT sessions, workout history, per-lift progress (estimated 1-rep max over time via the Epley formula), and a printable trainer report. The actual weekly schedule from your trainer isn't built in yet — for now you just pick "Lift Heavy" or "HIIT" each day you log.

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
- **Body weight** — one entry per date, logged independently of workout sessions.

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

## Trainer report

The **Report** tab builds a printable summary: consistency stats (sessions logged, avg/week, adherence to non-rest days, current/longest streaks), per-lift progress (estimated 1RM trend chart + set-by-set table, since/current numbers, % change) for any period (4/8/12 weeks or all time), and a blank notes section for your trainer to write adjustments.

To turn it into a PDF: open the Report tab, pick a period, tap **Print / Save as PDF**. On iPhone this opens the system print preview — pinch open the thumbnail to view it full-screen, then use the Share icon to save it to Files or send it directly. On a computer, the browser's print dialog lets you save as PDF directly.

## Body weight & Apple Health / smart scales

The Log tab has a standalone "Body weight" field (independent of the lift/HIIT session you're logging that day), and the Progress and Report tabs chart it over time alongside your lifts.

There's no automatic sync with Apple Health or scale apps (Withings, Vsync, etc.) — iOS only lets *native* apps read HealthKit data, so a web app fundamentally can't pull it in the background. The practical workaround is a one-tap iPhone Shortcut that reads your latest Health weight sample and deep-links into the app with it pre-filled, so logging is "run Shortcut → tap Save" instead of typing a number:

1. Open the **Shortcuts** app → new Shortcut.
2. Add **Find Health Samples Where** → Type: Weight, Sort by Date, most recent, Limit 1.
3. Add **Get Details of Health Sample** → Weight, to get the numeric value.
4. Add **Text**, and build the URL: `https://dklinenberg2020.github.io/workout_app/#/?bw=` followed by the weight value from step 3.
5. Add **Open URLs** with that text.
6. Optionally add this Shortcut to an Automation (e.g. "Time of Day", every morning) with "Ask Before Running" off, so it's one notification tap away, or run it manually from your Home Screen/widget.

Opening that URL loads the Log tab with the weight field pre-filled from Health — review it and tap **Save**. It's a deliberate one-tap confirm rather than a silent write, so a bad Health reading never overwrites your data unattended.

## Data location & backup

All data lives in IndexedDB in your browser on that device — nothing is synced anywhere. Clearing Safari site data / uninstalling will erase it. There's no export/import yet; that's a natural next step if you want cross-device sync or backups.
