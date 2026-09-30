# SOP — Standard Operating Planner (Next)

This is the modular rebuild of SOP. It replaces the single-file prototype with a maintainable local-first web application while preserving the core planning model:

**Quarter Goal → Monthly Objective → Weekly Mission → Daily Focus → Scheduled Action → AAR**

## Architecture

- React + TypeScript + Vite
- IndexedDB persistence with automatic one-time migration from the legacy `sop_planner_v4` localStorage state
- No backend required
- No paid APIs or services
- PWA shell/service worker for offline use
- GitHub Pages-compatible base path: `/-sop-planner/`
- Pointer-event based calendar and whiteboard interactions

## Current application surfaces

- Home command view
- Quarter map / plan / AAR with multiple actions and dated milestones
- Month calendar with week and day navigation
- Week mission / schedule / AAR with 30-minute calendar dragging
- Day execution view with 30-minute move and resize interactions
- Lightweight Tasks
- Universal Inbox
- Search across planner records
- Whiteboard with boards, templates, notes/text/shapes/charts, connections and direct manipulation
- Settings, history, JSON export/import

## Run locally

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run typecheck
npm run build
```

## Data

Planner data lives in the browser's IndexedDB database named `sop-planner`. On first launch, if no next-generation state exists, SOP checks for the previous prototype key `sop_planner_v4` and migrates compatible events, inbox items, tasks, quarter goals, actions and history.

The existing production prototype should remain available until this branch reaches feature parity and passes regression testing.
