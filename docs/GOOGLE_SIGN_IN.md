# Turning on "Continue with Google"

The code is ready. The button appears on the login and sign-up pages by itself as soon as Google
is switched on in Supabase; until then nobody sees it. Turning it on needs a free Google Cloud
OAuth client, which only the owner of the Google account can create. It takes about 15 minutes.

## 1. Google Cloud (console.cloud.google.com)

1. Create a project, for example "The Daily Aggregator".
2. **Google Auth Platform > Branding** (called "OAuth consent screen" in older menus): app name
   `The Daily Aggregator`, your address as support email, and under *Authorised domains*
   `supabase.co` (and later your own domain).
   **Audience**: **External**, then **Publish app** so that everyone can sign in, not only the
   test users you list. The app only asks for the basic scopes (email, name, picture), so Google
   does not need to review it.
3. **Google Auth Platform > Data Access**: add only `openid`, `.../auth/userinfo.email` and
   `.../auth/userinfo.profile`. Nothing else is needed.
4. **Google Auth Platform > Clients > Create client**, type **Web application**:
   - Authorised JavaScript origins: `https://daily-aggregator.vercel.app` and
     `http://localhost:3000`.
   - Authorised redirect URIs (Supabase's addresses, **not** the site's). One client serves both
     projects:
     - `https://zjxzzecffppaffrdhmds.supabase.co/auth/v1/callback` (production)
     - `https://sppfigcxpmhrcybhvbhp.supabase.co/auth/v1/callback` (dev)
   - Copy the **Client ID** and **Client secret**. Keep the secret out of git and out of chats.

## 2. Supabase dashboard (production, then dev)

**First** make sure *Authentication > Sign In / Providers > Email > Confirm email* is **on** (it
needs the custom SMTP from the go-live list). With it off, anyone can register someone else's
address with a password of their choosing; when the real owner later uses "Continue with Google",
Supabase adds Google to that account and the stranger's password still opens it.

1. *Authentication > Sign In / Providers > Google*: switch it on, paste the Client ID and the
   Client secret, save.
2. *Authentication > URL Configuration*:
   - production: Site URL `https://daily-aggregator.vercel.app`, Redirect URLs
     `https://daily-aggregator.vercel.app/**`;
   - dev: Site URL `http://localhost:3000`, Redirect URLs `http://localhost:3000/**` and
     `http://localhost:3100/**` (the preview port used for browser tests).
   After Google, Supabase sends people to `/auth/callback` on the site; an address that is not in
   this list is replaced by the Site URL.

Within five minutes the button shows up on `/login` and `/signup` (the app checks which sign-in
methods are on and keeps the answer for five minutes).

## 3. Dev project

Do the same two steps in the dev project's dashboard (same Client ID and secret). Dev has Confirm
email off, which is fine there: it only holds test accounts.

## How it behaves

- **New reader**: Google confirms the email address, so the account is ready at once (no
  confirmation email). The byline starts as their first name from Google, accents folded
  (María -> Maria); if that leaves fewer than three letters, or the name is in another script, it is
  the part of the email before the @. They can change it on the first-run page or in Settings.
- **Same email as an existing, confirmed account**: Supabase adds Google to that account instead of creating
  a second one, so the reader keeps their saved stories. The password keeps working too.
- **Settings**: a reader who only uses Google sees "How you sign in" instead of the email and
  password forms (there is no password to change).
- **Deleting a Google-only account**: there is no password to ask for, so the reader must have
  signed in with Google in the last 10 minutes. If not, the dialog shows **Confirm with Google**;
  after Google they return to Settings with the dialog open again.
- **Pressing "Cancel" on Google's page** brings the reader back to the login page with
  "Signing in did not finish. Please try again."

## Good to know

- Google's page says "to continue to zjxzzecffppaffrdhmds.supabase.co", because the free plan has no
  custom domain for Supabase. A Supabase custom domain (paid add-on) would show your own address.
- Apple and Facebook sign-in were left out on purpose: Apple needs a paid developer account
  (99 USD a year), Facebook needs a business verification. Google covers most people, and email
  and password stay for everyone else.
