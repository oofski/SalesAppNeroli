# Neroli Sales App

A premium, **local-first Windows desktop application** for the Neroli Salon & Spa leadership team.
It replaces manual reading of raw Zenoti exports with a clean, role-aware tool that surfaces the
metrics that matter — sales performance, team coaching, and guest feedback — across all five
Neroli locations.

Built to the [Comprehensive Build Plan & Technical Specification](#) (v1.0). Visual language takes
cues from Apple's desktop apps and Aveda's natural brand identity: generous whitespace, a warm
green-and-stone palette, and intentional typography.

> **Confidential — Internal Use Only.** No Zenoti report data ever leaves the machine. The only
> outbound request the app makes is a software-update check.

---

## What it does

| Tab | Highlights |
| --- | --- |
| **Dashboard** | Session pulse — KPI bar, uploaded-reports panel, auto-generated quick insights, admin location filter. |
| **Sales › Product** | KPI summary, revenue-by-category & vendor charts, daily trend (multi-location lines), searchable product drill-down with per-transaction expansion, top products & clients, Excel/PDF export. |
| **Sales › Service** | Per-location inner tabs, category revenue (list vs actual), employee performance table, booking-source & payment donuts, promotions tracker, open-appointment flag, guest insights. East Side hides spa categories. |
| **Coaching** | Three-column peer-relative scoring (Performing / On Track / Needs Coaching), No-Activity section, employee detail modal with peer-comparison bars and auto coaching tips, goals system, one-page Coaching Guide PDF. |
| **Reviews** | Summary KPIs, location pills, five-star leaderboard, employee rating table, the full **1–3 star review feed** with rich filtering, tag-frequency charts, and exports. |
| **Settings** | Profile, Security (change password), Preferences, **User Management** (admin), Locations, About / updates. |

The four Zenoti report formats are parsed exactly per the spec's §14 rules (header offsets,
`Total:` row exclusion, `East Side`/`Eastside` canonicalization, HTML-entity decoding,
comma-separated tags, numeric coercion, etc.).

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Shell / packaging | Electron + electron-builder (NSIS Windows installer) |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS with Neroli design tokens |
| State | Zustand |
| Local storage | SQLite via `better-sqlite3` (users, goals, reset tokens) |
| Passwords | bcrypt (`bcryptjs`), cost factor 12 |
| Report parsing | SheetJS (`xlsx`) + PapaParse, in TypeScript |
| Excel export | ExcelJS |
| PDF export | Electron `webContents.printToPDF` |
| Auto-update | `electron-updater` (GitHub Releases) |
| Bundler | electron-vite |

### Two deliberate deviations from the spec

1. **Report parsing runs in TypeScript, not a bundled Python/pandas subprocess.** Every parsing
   rule from §14 is implemented faithfully (`src/main/parsers/`), but keeping a single runtime
   removes the need to ship and IPC-marshal a Python interpreter — simpler to build, package, and
   maintain, with identical user-facing results.
2. **PDF export uses Electron's built-in `printToPDF` instead of Puppeteer.** It drives the *same*
   bundled Chromium engine the spec's Puppeteer approach relies on, with no extra dependency and
   no temp file containing report data ever touching disk (honoring §10.4).

Everything else — architecture, screens, scoring, exports, security model — follows the plan.

---

## Getting started

```bash
npm install          # installs deps and rebuilds native modules for Electron
npm run samples      # generate realistic sample Zenoti exports into ./sample-data
npm run dev          # launch the app in development
```

Then sign in with a seeded account and upload the generated files from `./sample-data`.

### Seeded accounts

Five accounts are created on first launch (§2.1). **Default password for all: `Neroli2026!`**
(change on first use).

| Email | Role | Locations |
| --- | --- | --- |
| `admin@neroli.com` | Admin | All 5 |
| `bonnie@neroli.com` | Admin (COO) | All 5 |
| `jazmine@neroli.com` | GM | Brookfield, Downtown |
| `lesley@neroli.com` | GM | Mequon, North Shore |
| `taylor@neroli.com` | GM | East Side |

Admins see all locations and User Management; GMs are scoped to their assigned locations
everywhere in the app.

### Sample files (`npm run samples`)

- `sales-accrual.xlsx` — product sales across all 5 locations (incl. a `Total:` row to exclude)
- `service-brookfield.xlsx`, `service-eastside.xlsx` — service sales (East Side has no spa categories)
- `employee-metrics-brookfield.csv` — ~20 employees across job categories for peer scoring
- `feedback.xlsx` — ~240 reviews across locations with a realistic share of 1–3 star ratings

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the app with HMR |
| `npm run build` | Type-check + bundle main/preload/renderer |
| `npm run typecheck` | Type-check both the node and web TS projects |
| `npm run samples` | Regenerate sample Zenoti exports |
| `npm run package:win` | Build and produce the signed Windows `.exe` installer |

---

## Project structure

```
src/
  shared/           Types, IPC contract, locations, password policy (used by both processes)
  main/             Electron main process
    db/             SQLite schema + access layer
    parsers/        Zenoti report parsers (accrual, service, metrics+scoring, feedback)
    exports/        ExcelJS + printToPDF generation
    auth.ts         bcrypt auth, lockout, reset flow
    ipc.ts          IPC handlers
  preload/          contextBridge API surface (window.neroli)
  renderer/         React app
    components/     Design system (Button, Card, Table, Modal, charts, …)
    pages/          Dashboard, Sales, Coaching, Reviews, Settings, Login
    lib/            Formatting, data aggregation, PDF templates, exporters
    store/          Zustand stores (auth, reports, upload, ui)
scripts/            Sample-data generator
```

---

## Security & data handling (§10)

- **Local-first.** Uploaded report data is held in memory for the session only — never written to
  disk. Closing the app or removing a report discards it.
- Passwords are bcrypt-hashed (cost 12); the last 5 are remembered to prevent reuse.
- Accounts lock for 15 minutes after 5 failed sign-ins; admins can unlock and force-logout.
- A strict Content-Security-Policy and `contextIsolation` keep the renderer sandboxed.

## Build & release (§13)

`npm run package:win` runs electron-builder against `electron-builder.yml`, producing a per-user
NSIS installer that needs no admin rights. Sign both the installer and binary with an EV
certificate (supplied via CI secrets) before distribution, and tag a release so
`electron-updater` can publish it to GitHub Releases.
