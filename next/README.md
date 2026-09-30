# SOP — Modular Web App Rebuild

This directory is the clean modular successor to the single-file SOP prototype.

## Goals

- Preserve the planning chain: Quarter → Month → Week → Day → Scheduled Action → AAR.
- Keep the app local-first and free-first.
- Replace the monolithic HTML prototype with React + TypeScript + Vite.
- Store planner state in IndexedDB.
- Automatically migrate compatible data from the legacy `sop_planner_v4` localStorage record on first launch.
- Keep the existing production prototype untouched until this rebuild passes feature-parity testing.

## Current surfaces

Home, Quarter Map/Plan/AAR, Month, Week Mission/Schedule/AAR, Day, Tasks, Inbox, Whiteboard, scheduling dialogs, data export/import.

## Local development

```bash
cd next
npm install
npm run dev
```

## Production validation

```bash
npm run build
```

The branch workflow `SOP Next Build` runs the same build on pushes to `rebuild/modular-webapp`.
