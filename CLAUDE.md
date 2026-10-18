# BevisDrive — notes for Claude

Private, Dropbox-style file storage and sharing app. Live at **https://bevisdrive.com**.

At the start of every session, read this file, `MISTAKES.md` and `SERVERS.md`, and keep all
three updated as work progresses. Log every resolved error to `MISTAKES.md` right after fixing it.
Never ask for credentials that are documented in `SERVERS.md`.

## Stack
- Next.js 16 (App Router, React Compiler on), React 19, TypeScript, Tailwind CSS 4
- Supabase: Auth (email/password, sign-ups disabled), Postgres with RLS, Storage bucket `user-files`
- Hosting: Netlify (auto-deploys from `main` on GitHub `lawweapons/bevisdrive`)
- Client-side zip via `jszip` + `file-saver`

## Commands
- `npm run dev` — local dev on :3000 (needs `.env.local`, see `.env.local.example`)
- `npm run build` — production build; works with dummy `NEXT_PUBLIC_SUPABASE_*` values for a compile check
- `npm run lint`

## Layout
- `src/app/files` — main file browser (`FilesPageClient` → `FileBrowser`)
- `src/app/auth` — login; `src/app/s/[token]` — public share pages; `src/app/activity` — activity log
- `src/app/api/share/download` — signed downloads for share links (uses service role key)
- `src/app/api/debug-files` + `debug-folders.js` — debug leftovers, remove before hardening
- `src/app/manifest.ts`, `src/app/apple-icon.png`, `public/icon-*.png` — "Add to Home Screen" app support
- `src/components/` — UI (FileList, Sidebar, UploadZone, ShareModal, ShareFolderModal,
  FileVersionHistory, FolderSettingsModal, QuickSearch, StorageQuota, ThemeToggle, …)
- `src/lib/supabase/{client,server}.ts` — Supabase clients; `src/lib/utils.ts` — `buildStoragePath` (UUID-prefixed, so names never collide)
- `middleware.ts` — redirects signed-out users to `/auth`; `/auth` and `/s/*` are public.
  Anything that must load signed-out (manifest, icons) has to be excluded in the matcher.
- `supabase/migrations/` — run in order in the Supabase SQL editor

## Database tables
`files`, `file_shares`, `admins`, `folders`, `activity_log`, `user_preferences`,
`file_versions`, `shared_with_users` — all with RLS scoped to `owner_id` / `auth.uid()`.
Storage policies restrict each user to the `userId/` prefix in `user-files`.

## Features (as of Oct 2026)
Upload (drag-drop, multi-select, photos & videos picker on phones, screen kept awake during
batches), rename, move, delete, trash, starred, nested folders with colors and icons, drag to
reorder files and folders, grid and list views, sort, bulk select, preview, right-click menu,
keyboard shortcuts, Ctrl+K search, storage quota, activity log, dark/light theme,
password-protected and expiring share links with view counts, folder sharing, sharing with
specific users by email, file version history, zip download, mobile layout, installable web app.

## Conventions
- Work on a feature branch; `main` deploys to production.
- Commit messages: short imperative summary ("Add …", "Fix …").
