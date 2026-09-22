# TACN Connect

TACN Connect is a digital church community platform for member care, birthdays, events, announcements, celebration flyers, and meaningful communication.

The product is designed to feel warm, respectful, simple, and premium on phones and computers.

## What the platform includes

• Secure member registration and sign in

• Email and Google authentication through Supabase

• Password recovery and account management

• Member profiles with profile photographs

• New registration alerts for the General Admin

• Role and permission management

• A Grant All Access control for trusted administrators

• Birthday calendar, countdowns, greeting wall, and member celebration pages

• Birthday flyer creation and download

• Church events and announcements

• In app notifications

• Foundations for email and SMS delivery

• Responsive navigation and accessible forms

• Light and dark appearance options

## Technology

• React

• TypeScript

• Vite

• Supabase Authentication

• Supabase PostgreSQL

• Supabase Storage

• Row Level Security

• Lucide icons

The application never stores passwords in the interface, source code, or database tables. Passwords are managed securely by Supabase Authentication.

## Local setup

### 1. Install Node.js

Install Node.js version 20 or newer.

### 2. Clone the repository

```bash
git clone https://github.com/Elontim/CHURCH-BIRTHDAY-PLATFORM.git
cd CHURCH-BIRTHDAY-PLATFORM
```

### 3. Install packages

```bash
npm install
```

### 4. Create a Supabase project

1. Visit [Supabase](https://supabase.com)
2. Create a new project
3. Open the SQL Editor
4. Run `supabase/schema.sql`
5. Open Storage and confirm that the `avatars` and `flyers` buckets exist
6. Open Authentication, then Providers
7. Enable Email
8. Enable Google only after adding valid Google OAuth credentials

### 5. Configure environment variables

Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

Add the project values shown in Supabase under Project Settings, then API.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

The anon key is safe for a browser when Row Level Security is enabled. Never place the service role key in this project or expose it in Vercel.

### 6. Start development

```bash
npm run dev
```

Open the address shown in the terminal.

## Database setup

The complete database setup is in `supabase/schema.sql`. It creates:

• Member profiles

• Roles and user role assignments

• Permissions and role permission assignments

• Birthdays and birthday messages

• Events and announcements

• Notifications and notification receipts

• Audit records

• Secure profile creation after registration

• Row Level Security policies

• Storage policies for member profile photographs

Run the schema once in a new Supabase project. Do not repeatedly run destructive changes against a live database without reviewing them.

## Creating the first General Admin

For security, public registration always creates a normal member account. The first General Admin must be promoted directly in Supabase.

1. Register normally in the application
2. In Supabase, open Table Editor
3. Open `profiles` and copy the user ID
4. Open `roles` and copy the ID for `general_admin`
5. Open `user_roles`
6. Add the user ID and role ID

After the user signs in again, the Admin area becomes available.

Never make every newly registered person an administrator.

## Google sign in

1. Create OAuth credentials in Google Cloud Console
2. Add the Supabase callback URL shown on the Google provider page
3. Add the site URL and production domain to the allowed origins
4. Enter the Google client ID and secret in Supabase
5. Enable the Google provider

Google secrets belong in Supabase, not in this repository.

## Profile photograph storage

The schema creates a public `avatars` bucket with user owned folders. Each member can upload only to a folder matching their authenticated user ID.

Accepted interface formats are JPG, PNG, and WebP. The interface limits files to 5 MB.

For stronger image processing in production, add an Edge Function that checks the real file content, removes metadata, and creates optimized sizes.

## Email and SMS

Authentication emails are handled by Supabase. For church messages and birthday greetings, use server side Supabase Edge Functions.

Recommended services:

• Resend for email

• Termii for Nigeria focused SMS

• Twilio where broader international delivery is required

Provider secrets must be stored as Supabase secrets. They must never use a `VITE_` prefix.

## Deployment with Vercel

1. Import this repository into Vercel
2. Add `VITE_SUPABASE_URL`
3. Add `VITE_SUPABASE_ANON_KEY`
4. Deploy
5. Add the final Vercel domain to the Supabase Site URL and redirect URL list

The included `vercel.json` sends application routes back to the React entry point.

## Security checklist

• Keep Row Level Security enabled

• Never expose the Supabase service role key

• Never add demo passwords or default passwords

• Require email verification before sensitive actions

• Review administrator role assignments regularly

• Use server functions for email, SMS, and scheduled jobs

• Validate uploaded files on both client and server

• Enable rate limits and bot protection before public launch

• Keep dependencies updated

• Review audit records after sensitive administrator actions

## Available commands

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
```

## Product direction

The current foundation is designed for gradual delivery. Authentication, profiles, birthdays, and the administrator registration inbox come first. Events, messaging, flyer templates, and automated birthday delivery can then be expanded without rebuilding the application.

## Licence

Private church project. Add an explicit licence before public reuse or distribution.
