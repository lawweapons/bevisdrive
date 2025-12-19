# BevisDrive

A secure, Dropbox-style file storage and sharing web app built with Next.js and Supabase.

## Features

- **Authentication**: Email/password login (admin-only user creation)
- **File Management**: Upload, rename, move, delete files
- **Folder Organization**: Virtual folders with breadcrumb navigation
- **Drag & Drop Upload**: Multiple file upload with progress indicators
- **Search**: Full-text search across file names, descriptions, tags, and folders
- **Sharing**: Password-protected share links with optional expiry dates
- **Security**: Row-Level Security (RLS) ensures users only access their own files

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Postgres, Storage, RLS)
- **Deployment**: Vercel + Supabase

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
5. Create another new query
6. Copy the entire contents of `supabase/migrations/20251218152500_admins.sql` and paste it
7. Click **Run**

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

## Deploying to Vercel

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
│   │   ├── api/share/download/   # API route for share downloads
│   │   ├── auth/                 # Login page
│   │   ├── files/                # Main file browser
│   │   ├── s/[token]/            # Public share pages
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── AppHeader.tsx
│   │   ├── Breadcrumbs.tsx
│   │   ├── FileBrowser.tsx
│   │   ├── FileList.tsx
│   │   ├── LogoutButton.tsx
│   │   ├── SearchBar.tsx
│   │   ├── ShareModal.tsx
│   │   ├── Sidebar.tsx
│   │   └── UploadZone.tsx
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts         # Browser Supabase client
│       │   └── server.ts         # Server Supabase client
│       ├── types.ts
│       └── utils.ts
├── supabase/
│   └── migrations/               # SQL migrations for Supabase
├── middleware.ts                 # Route protection
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
- Check browser console for errors
- Verify the `user-files` bucket was created (check Supabase Dashboard → Storage)
- Make sure the storage policies were applied (run the migration SQL again if needed)

**Share links not working**
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in your environment
- Check that the file_shares table exists and has data
