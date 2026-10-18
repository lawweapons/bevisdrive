# Servers and services

**Do not put secrets (passwords, API keys, service role keys) in this file. It is committed to
GitHub.** Secrets live in the Netlify environment variables and in your local `.env.local`
(ignored by git).

## Production
| What | Where |
|---|---|
| Live site | https://bevisdrive.com |
| Netlify site | `bevisdrive` (team plan: Pro) — https://app.netlify.com/projects/bevisdrive |
| Netlify branch URL | http://main--bevisdrive.netlify.app |
| Netlify site ID | `089bd770-5b27-4d7a-8fc6-945f3c37dab2` |
| Deploys | Automatic from `main` on GitHub |
| GitHub repo | https://github.com/lawweapons/bevisdrive |

## Supabase
- **Project: not yet identified.** On 2026-10-18, none of the 9 projects in the connected
  Supabase org `lawweapons` (Pro plan) had the BevisDrive tables, so the project is probably
  in a different Supabase account or organization.
- To find it: Netlify → bevisdrive → Site configuration → Environment variables →
  `NEXT_PUBLIC_SUPABASE_URL`. The project ref is the subdomain (`https://<ref>.supabase.co`).
  Record the ref and its plan here once known.
- Storage bucket: `user-files` (private)

## Environment variables (names only)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose to the browser)

## Not used
- Vercel: no BevisDrive project exists on the connected Vercel team (the README's Vercel
  steps are an alternative, not the current host).
