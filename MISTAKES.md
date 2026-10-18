# Mistakes and fixes

Log every resolved error here right after fixing it: what broke, why, and the fix.

## 2026-10-18 — Deprecated `viewport` in `metadata`
- **Problem:** `src/app/layout.tsx` set `viewport` inside `metadata`, which Next.js 14+
  deprecates and warns about.
- **Fix:** Moved it to a separate `export const viewport: Viewport` (also sets `themeColor`).

## 2026-10-18 — Middleware would block the web app manifest
- **Problem:** The middleware matcher only skipped image files, so `/manifest.webmanifest`
  would redirect signed-out visitors to `/auth`, and "Add to Home Screen" would get no
  manifest.
- **Fix:** Added `manifest.webmanifest` to the matcher's exclusions. Verified it returns 200
  signed-out while `/files` still redirects (307).
- **Lesson:** Any new public asset that isn't an image needs a matcher exclusion.

## 2025-12 — `useSearchParams` build error (commit 21a6471)
- **Problem:** The production build failed because `useSearchParams` was used without a
  Suspense boundary.
- **Fix:** Wrapped the `/auth` and `/files` page contents in `<Suspense>`.

## 2025-12 — File action menu cut off or hidden (commits 9e70998, 8057974)
- **Problem:** The row action menu was clipped by its scrolling container.
- **Fix:** Render the menu with `position: fixed` at computed coordinates.

## 2025-12 — Empty folders disappeared (commits 15a277e, 2ca94e3)
- **Problem:** Folders came only from file rows, so an empty folder vanished on reload.
- **Fix:** First persisted them in localStorage, then moved them to a `folders` table.
