# BevisDrive

A secure, Dropbox-style file storage and sharing web app built with Next.js and Supabase.

Live at **https://bevisdrive.com** (hosted on Netlify, deploys automatically from `main`).

## Features

- **Sign-in**: Email/password, users are created by an admin (public sign-up is off)
- **Uploads**: Drag and drop, multi-select, a "Photos & videos" picker for phones, and the screen stays awake during big batches
- **Files**: Rename, move, delete, trash, starred, preview, version history, and drag to reorder
- **Folders**: Nested folders with expand/collapse, custom colors and icons, drag to reorder, and zip download
- **Views**: List or grid, sorting, bulk select, right-click menu, and keyboard shortcuts
- **Search**: Quick search (Ctrl+K) across names, descriptions, tags and folders
- **Sharing**: Password-protected links with expiry dates and view counts, folder sharing, and sharing with specific users by email
- **Extras**: Storage quota, activity log, and a dark/light theme
- **Phone**: Mobile layout, and it can be installed to your home screen like an app
- **Security**: Row-Level Security so users only access their own files

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (Auth, Postgres, Storage, RLS)
- **Hosting**: Netlify + Supabase

## Getting In

**On a computer:** go to https://bevisdrive.com and sign in with your email and password.

**Forgot your password, or need a new user?** Log in to the Supabase dashboard, then open your BevisDrive project → **Authentication** → **Users**. From there you can send a password reset, or use **Add user** to create a new login.

**On your phone (install it like an app):**
- **iPhone:** open https://bevisdrive.com in **Safari** → sign in → tap **Share** → **Add to Home Screen**.
- **Android:** open it in **Chrome** → sign in → tap **⋮** → **Install app** (or **Add to Home screen**).

**Copy photos from your phone:** open BevisDrive → **Photos & videos** → select the photos (on iPhone, drag your finger across thumbnails to select many at once) → pick a folder → **Upload**. Keep the app open until the counter finishes. For other files (PDFs, documents), use **Select files**.

---

---

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose a name and password, then click **Create new project**
4. Wait for the project to finish setting up

### Step 2: Disable Public Sign-ups

Since only admins should create users:

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Click on **Email**
3. Turn OFF **"Enable email confirmations"** (optional, for easier testing)
4. Go to **Authentication** → **Settings**
5. Under **User Signups**, disable **"Allow new users to sign up"**

### Step 3: Run the Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/20251218145900_init.sql` and paste it
4. Click **Run**
5. Repeat for each remaining file in `supabase/migrations/`, in this order:
   `20251218152500_admins.sql`, `20251220_folders.sql`, `20251220_features.sql`

### Step 4: Get Your API Keys

1. In Supabase Dashboard, go to **Project Settings** (gear icon, bottom-left)
2. Click **API**
3. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
   - **service_role** key (another long string - keep this secret!)

### Step 5: Create Your Environment File

1. In the `bevisdrive` folder, copy `.env.local.example` to `.env.local`
2. Fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 6: Create Your First User

Since sign-ups are disabled, create a user manually:

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter an email and password
4. Click **Create user**

---

## Running Locally

1. Open a terminal in the `bevisdrive` folder
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser
5. Log in with the user you created in Supabase

---

## Deploying to Vercel (alternative)

Production currently runs on Netlify (see `SERVERS.md`). These steps are only for hosting on Vercel instead.

### Step 1: Push to GitHub

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/bevisdrive.git
   git push -u origin main
   ```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**

### Step 3: Update Supabase Settings

After deployment, add your Vercel URL to Supabase:

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Add your Vercel URL (e.g., `https://bevisdrive.vercel.app`) to **Site URL**
3. Add it to **Redirect URLs** as well

---

## Project Structure

```
bevisdrive/
├── src/
│   ├── app/
│   │   ├── activity/             # Activity log page
│   │   ├── api/share/download/   # Signed downloads for share links
│   │   ├── auth/                 # Login page
│   │   ├── files/                # Main file browser
│   │   ├── s/[token]/            # Public share pages
│   │   ├── manifest.ts           # Home screen app manifest
│   │   └── layout.tsx
│   ├── components/               # FileBrowser, FileList, Sidebar, UploadZone, ShareModal,
│   │                             # ShareFolderModal, FileVersionHistory, FolderSettingsModal,
│   │                             # QuickSearch, StorageQuota, ThemeToggle, ...
│   └── lib/
│       ├── supabase/             # Browser and server Supabase clients
│       ├── downloadFolder.ts     # Zip download
│       ├── types.ts
│       └── utils.ts
├── supabase/migrations/          # SQL migrations (run in order)
├── middleware.ts                 # Route protection
├── CLAUDE.md / MISTAKES.md / SERVERS.md   # Project notes, error log, hosting info
└── .env.local.example
```

---

## Security Notes

- **Row-Level Security (RLS)**: All database tables have RLS enabled. Users can only access their own files.
- **Storage Policies**: Users can only upload/access files in their own `userId/` folder.
- **Service Role Key**: Only used server-side for generating signed download URLs. Never expose this to the browser.
- **Password Hashing**: Share link passwords are hashed with SHA-256 before storage.

---

## Troubleshooting

**"Missing NEXT_PUBLIC_SUPABASE_URL" error**
- Make sure you created `.env.local` with your Supabase credentials

**Can't log in**
- Check that you created a user in Supabase Dashboard → Authentication → Users
- Make sure the email and password match

**Files not uploading**
- Large videos fail if they exceed Supabase's upload size limit (Supabase dashboard → Storage → Settings)
- Check browser console for errors
- Verify the `user-files` bucket was created (check Supabase Dashboard → Storage)
- Make sure the storage policies were applied (run the migration SQL again if needed)

**Share links not working**
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in your environment
- Check that the file_shares table exists and has data
