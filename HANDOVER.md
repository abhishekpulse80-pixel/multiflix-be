# Multiflix — Project Handover Guide

**For the next developer.** Written in plain language. If you have never seen this
project before, read sections 1–4 first, then jump to whatever you need to do.

Last updated: 15 August 2026

---

## 1. What Multiflix is

Multiflix is a short-video social app — think of it as a mix of Instagram and
TikTok. Users can:

- Post short videos and photos, and scroll an endless feed
- Post 24-hour Stories
- Publish longer "Blogging" videos
- Listen to music, favourite tracks, and attach music to their posts
- Chat with each other (real-time messaging)
- Follow people, like, comment, save, and share posts
- **Earn money** from views, and request withdrawals to their bank account
- See ads (Google AdMob), which is how the business makes money

Admins can log into a separate web dashboard to manage users, content, music,
ads, payouts and app settings.

---

## 2. The four pieces of the system

This is one product made of **four separate codebases**. Each one lives in its
own GitHub repository and is deployed separately.

| # | Piece | What it is | Technology | Where it runs |
|---|-------|-----------|------------|---------------|
| 1 | **Mobile app** | The Multiflix app users install | React Native | Google Play + Apple App Store |
| 2 | **Backend (API)** | The brain. Stores all data, handles all logic | Node.js + Express + MongoDB | An Ubuntu server (EC2), at `backend.multiflix.in` |
| 3 | **Admin panel** | Internal dashboard for staff | React + Vite | Vercel |
| 4 | **Website** | Public marketing site + legal pages | Next.js | Vercel, at `multiflix.in` |

### How they talk to each other

```
   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
   │  Mobile app  │         │ Admin panel  │         │   Website    │
   │ (iOS/Android)│         │  (Vercel)    │         │  (Vercel)    │
   └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
          │                        │                        │
          │  HTTPS + WebSocket     │  HTTPS                 │ (mostly standalone;
          │                        │                        │  serves deep-link
          └────────────┬───────────┘                        │  files for the app)
                       ▼                                    │
              ┌─────────────────────┐                       │
              │   Backend API       │◄──────────────────────┘
              │ backend.multiflix.in│
              └─────────┬───────────┘
                        │
      ┌─────────┬───────┼─────────┬──────────┬─────────────┐
      ▼         ▼       ▼         ▼          ▼             ▼
  ┌───────┐ ┌─────┐ ┌──────┐ ┌────────┐ ┌─────────┐ ┌───────────┐
  │MongoDB│ │Redis│ │AWS S3│ │Firebase│ │  Brevo  │ │  ffmpeg   │
  │ (data)│ │(job │ │(video│ │ (push  │ │ (emails)│ │ (audio    │
  │       │ │queue│ │ +CDN)│ │ notifs)│ │         │ │ extract)  │
  └───────┘ └─────┘ └──────┘ └────────┘ └─────────┘ └───────────┘
```

**In plain words:** the mobile app and admin panel never touch the database
directly. They both call the backend over the internet, and the backend does
everything else.

### Where the code repositories are

| Piece | GitHub repository |
|-------|-------------------|
| Mobile app | `github.com/mahabeer-dev/multiflix-updated` |
| Backend | `github.com/mahabeer-dev/multiflix-be` |
| Website | `github.com/mahabeer-dev/multiflix-landing` |
| Admin panel | `github.com/mahabeer-dev/multiflix-admin` |

> **Note on folder layout:** in the delivery zip, the backend, web and admin
> folders sit *inside* the mobile app folder for convenience. They are **not**
> part of the mobile app's git repository — each has its own `.git` and its own
> GitHub remote. Keep them separate.

### ⚠️ Which branch is actually live — read before you clone

**`main` is not the live branch on three of the four repos.** If you clone and
work on `main`, you will be editing the wrong code.

| Project | Branch that is live | State of `main` |
|---------|--------------------|-----------------|
| Mobile app | `feature/bg-music-legacy-arch` | **215 commits behind.** Nearly a year of work is not on main |
| Backend | `main` | Up to date ✅ |
| Website | `deploy` | 6 commits behind |
| Admin panel | `deploy` | 11 commits behind |

The zips in this handover contain the **correct, live** code for every project.
So if you work from the zips you are fine. The trap is cloning fresh from
GitHub and assuming `main` is current.

**First thing to do with the repos:** either merge each live branch into `main`,
or rename the live branch so it's obvious. Leaving it as-is means the next
person after you will hit the same trap.

---

## 3. ⚠️ The most important thing in this handover: the secret files

Some files are deliberately **not** stored in GitHub because they contain
passwords and keys. They are delivered separately in
`multiflix-SECRETS.zip`. **Without these files you cannot deploy the backend or
release a new app version.**

| File | Belongs in | What it is | Why it matters |
|------|-----------|------------|----------------|
| `streamit-release-key.keystore` | `android/app/` | Android signing key | 🔴 **CRITICAL — see warning below** |
| `release.keystore` | `android/app/` | An older/spare signing key | Keep it, don't delete it |
| `multiflix-be.pem` | `~/.ssh/` | SSH key for the production server | 🔴 Without it you cannot reach or deploy the backend |
| `.env` (backend) | `multiflix-backend/` | Database URL, JWT secret, AWS keys, email keys, Apple keys | Backend won't start without it |
| `.env` (admin) | `multiflix-admin/` | Which API the dashboard talks to | Dashboard can't reach the API |

### Sensitive files that *are* already inside the code zips

These are committed to git, so they arrive with the code — but treat the code
zips as sensitive because of them:

| File | Contains |
|------|----------|
| `multiflix-backend/multiflix-1833c-firebase-adminsdk.json` | Firebase **server private key** |
| `android/gradle.properties` | The keystore passwords, in plain text |
| `android/app/google-services.json` | Firebase config for Android |
| `ios/GoogleService-Info.plist` | Firebase config for iOS |

> **Worth fixing later:** the Firebase service-account key and the keystore
> passwords should not really be in git history. They aren't causing a problem
> today because the repositories are private, but if a repo is ever made public
> or a laptop is lost, those credentials are exposed. The proper fix is to move
> them into environment variables and rotate the Firebase key. Not urgent —
> just don't make these repos public without doing it first.

### 🔴 The Android keystore warning — read this twice

The file `android/app/streamit-release-key.keystore` (key alias: `streamit`) is
what proves to Google Play that an app update genuinely comes from Multiflix.

**If this file is ever lost, you can never update the Android app again.** You
would have to publish a brand-new app listing under a new package name and ask
every existing user to reinstall. There is no recovery, no support ticket, no
workaround.

**Do this today:** copy it to at least two safe places (a password manager, an
encrypted backup, a company vault). The passwords for it are in
`android/gradle.properties` under `MYAPP_RELEASE_STORE_PASSWORD` and
`MYAPP_RELEASE_KEY_PASSWORD`.

### A note about sharing these files

Do not put `multiflix-SECRETS.zip` in a "anyone with the link can view" Google
Drive folder. Share it only with the specific people who need it, using
restricted access. Anyone who gets this zip can read the production database,
send emails as Multiflix, and publish app updates.

---

## 4. Accounts and services you need access to

Before the next developer can do anything real, they need to be added to these
accounts. **Chase this early — it usually takes the longest.**

| Service | Used for | What to ask for |
|---------|----------|-----------------|
| **GitHub** (`mahabeer-dev`) | All four repositories | Collaborator access to all 4 repos |
| **AWS** | The Ubuntu server (EC2), file storage (S3), CDN (CloudFront) | IAM user + SSH key for the server |
| **MongoDB** | The database | Connection string (it's in the backend `.env`) |
| **Firebase** (project `multiflix-1833c`) | Push notifications, Google Sign-In | Project member access |
| **Google Play Console** | Publishing the Android app | Developer account access |
| **Apple Developer** (team `7JDJ99U8FV`) | Publishing the iOS app | Team member + App Store Connect access |
| **Google AdMob** (`pub-7029440848837237`) | In-app ads and revenue | Account access |
| **Brevo** | Sending emails (password reset codes) | Account access / API key |
| **Vercel** | Hosting the website and admin panel | Team access |
| **Domain registrar** | `multiflix.in` DNS | Access to change DNS records |

---

## 5. What to install on your computer

You need all of this before anything will run.

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 22.11 or newer | Required by all four projects |
| **Yarn** | latest | The mobile app uses Yarn |
| **npm** | comes with Node | Backend/web/admin use npm |
| **Git** | latest | |
| **Watchman** | latest | `brew install watchman` — makes React Native reload faster |
| **Java JDK** | 17 | For Android builds |
| **Android Studio** | latest | Includes the Android SDK and emulator |
| **Xcode** | latest | **Mac only.** Required for iOS |
| **CocoaPods** | via `bundle install` | iOS dependency manager |
| **MongoDB** | 6 or newer | Only if you want a local database |
| **Redis** | latest | Only if you want the background worker locally |
| **ffmpeg** | latest | Only if you want audio extraction locally |

> **You need a Mac to build the iOS app.** There is no way around this. Android
> can be built on Windows, Mac or Linux.

---

## 6. Running everything on your own computer

Do these in order. Start the backend first — everything else depends on it.

### 6.1 Backend (start here)

```bash
cd multiflix-backend
npm install
```

Then make sure `.env` exists in this folder (take it from the secrets zip, or
copy `.env.example` and fill it in). Also drop
`multiflix-1833c-firebase-adminsdk.json` in this same folder.

Start it:

```bash
npm run dev
```

You should see `API listening on http://localhost:4000`. Check it works by
opening `http://localhost:4000/api/v1/health` in a browser.

**Optional — the background worker.** This handles extracting audio from
videos ("Original Sound"). It needs Redis and ffmpeg running. In a second
terminal:

```bash
npm run dev:worker
```

If you skip this, everything still works except original-sound extraction.

### 6.2 Admin panel

```bash
cd multiflix-admin
npm install
npm run dev
```

Opens on `http://localhost:5173`. It talks to whichever API is set in its
`.env` file (`VITE_API_BASE_URL`). By default that's the **live production
API** — if you want it to use your local backend, change it to
`http://localhost:4000/api/v1`.

Log in with the admin account (the email is in the backend `.env` as
`ADMIN_EMAIL`). If no admin exists yet in your local database, create one:

```bash
cd multiflix-backend && npm run seed:admin
```

### 6.3 Website

```bash
cd multiflix-web
npm install
npm run dev
```

Opens on `http://localhost:3000`. This one is mostly self-contained — marketing
pages, privacy policy, terms, and a few special files the app stores require.

### 6.4 Mobile app

```bash
# from the project root
yarn install
```

**Android:**

```bash
yarn android
```

(Have an emulator running, or a phone plugged in with USB debugging on.)

**iOS (Mac only):** first time, and after any native dependency changes:

```bash
bundle install
cd ios && bundle exec pod install && cd ..
```

Then:

```bash
yarn ios
```

**Which API does the app talk to?** Look at `src/config/api.ts`. Right now
**both** development and production builds point at the live server
(`https://backend.multiflix.in/api/v1`). If you want to develop against your
local backend, edit the `DEV_HOST` line in that file:

- Android emulator → `http://10.0.2.2:4000/api/v1`
- iOS simulator → `http://127.0.0.1:4000/api/v1`
- Real phone → `http://<your-computer's-wifi-IP>:4000/api/v1`

Remember to change it back before building a release.

---

## 7. Deploying (putting changes live)

### 7.1 Backend — the Ubuntu server

The backend runs on an AWS EC2 Ubuntu server at `backend.multiflix.in`, managed
by a tool called **PM2** (it keeps the app running and restarts it if it
crashes). The code lives in `/home/ubuntu/multiflix-be`.

Two processes run there:

- `multiflix-be` — the main API
- `multiflix-worker` — the background job worker (audio extraction)

**Connecting to it:** the address is `3.111.5.239`, the username is `ubuntu`,
and you log in with the key file `multiflix-be.pem` from the secrets zip.

```bash
chmod 400 ~/.ssh/multiflix-be.pem
ssh -i ~/.ssh/multiflix-be.pem ubuntu@3.111.5.239
```

> Full instructions, troubleshooting and the day-to-day commands are in
> **`SERVER-ACCESS.md`**, delivered alongside this document.

**To deploy a change:**

```bash
ssh -i ~/.ssh/multiflix-be.pem ubuntu@3.111.5.239
cd /home/ubuntu/multiflix-be
git pull
npm install
npm run build
pm2 restart ecosystem.config.cjs
pm2 save
```

**Useful commands on the server:**

```bash
pm2 status          # are both processes alive?
pm2 logs            # watch live logs
pm2 logs multiflix-be --lines 200   # recent API logs
pm2 restart all     # restart both
```

**One-time setup if you ever rebuild the server:**

```bash
sudo apt update && sudo apt install -y ffmpeg redis-server
sudo systemctl enable --now redis-server
```

The server also needs `.env` and `multiflix-1833c-firebase-adminsdk.json` sitting
in `/home/ubuntu/multiflix-be`. **These are different from your local copies** —
the local `.env` points at a local database, the server one points at the real
production database. Never copy your local `.env` over the server's.

### 7.2 Admin panel — Vercel

Connected to the `multiflix-admin` GitHub repo. **Pushing to the `deploy`
branch deploys it automatically** — not `main`. No manual step needed.

Make sure `VITE_API_BASE_URL` is set in the Vercel project's environment
variables to `https://backend.multiflix.in/api/v1`.

To build it yourself and check for errors first:

```bash
cd multiflix-admin && npm run build
```

### 7.3 Website — Vercel

Same story: connected to `multiflix-landing`, and again the live branch is
**`deploy`**, not `main`.

> Double-check the branch each Vercel project is wired to in
> Vercel → Project → Settings → Git → Production Branch. If someone later
> merges everything into `main` (recommended), update that setting too or
> deploys will silently stop happening.

⚠️ **One thing to verify:** the site serves a file at
`/.well-known/assetlinks.json` that makes Multiflix links open directly in the
Android app. It needs an environment variable called
`ANDROID_CERT_SHA256_FINGERPRINTS` set in Vercel. If it's missing, the file
contains the text `REPLACE_WITH_RELEASE_SHA256_FINGERPRINT` and **Android deep
links silently stop working**.

Check it by opening `https://multiflix.in/.well-known/assetlinks.json` in a
browser. If you see the placeholder text, get the real fingerprint from Play
Console → Release → Setup → App signing, and add it in Vercel.

### 7.4 Android app — Google Play

Current version: **3.3** (version code **52**). Package name: `com.multiflix`.

> ⚠️ **The version numbers in GitHub are wrong.** The bump to 3.3 / code 52 was
> never committed — GitHub still says code **50**, version **3.1** (and iOS 14).
> The zip in this handover has the correct numbers. If you bump from what's in
> GitHub you'll produce code 51, and Google Play will reject it because 52 is
> already published. **Always check what's live in Play Console before bumping.**

**Before every release**, bump both numbers in `android/app/build.gradle`:

```gradle
versionCode 53        // must go UP by at least 1, every single time
versionName "3.4"     // what users see
```

Then build:

```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

The file you upload is at
`android/app/build/outputs/bundle/release/app-release.aab`.

Upload it in Google Play Console → your app → Production → Create new release.

> If the build fails complaining about the keystore, check that
> `android/app/streamit-release-key.keystore` exists and that the four
> `MYAPP_RELEASE_*` values in `android/gradle.properties` are correct.

### 7.5 iOS app — App Store

Bundle ID: `com.multiflix`. Apple team: `7JDJ99U8FV`. Current marketing version:
**16**.

1. Open `ios/Multiflix.xcworkspace` in Xcode — **the `.xcworkspace` file, not
   `.xcodeproj`**. Opening the wrong one causes confusing build errors.
2. Bump `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` (build number) in the
   target's Build Settings.
3. Select **Any iOS Device** as the destination.
4. Menu: **Product → Archive**.
5. When the Organizer window opens: **Distribute App → App Store Connect**.
6. Finish the rest in App Store Connect (screenshots, description, submit for
   review).

If pods are out of date, run `cd ios && bundle exec pod install` first.

---

## 8. What lives where in the code

### Mobile app (`/src`)

| Folder | What's in it |
|--------|--------------|
| `screens/` | One file per screen (Home Feed, Chat, Music, Earnings…) |
| `components/` | Reusable UI pieces used across screens |
| `navigation/` | How screens link together, tab bar, stacks |
| `store/` | Redux — app-wide state and all API calls |
| `services/` | Google/Apple sign-in, AdMob, chat socket, music playback, caching |
| `config/` | **Start here.** API URL, AdMob IDs, Google Sign-In IDs |
| `hooks/`, `utils/`, `theme/` | Helpers, formatting, colours and fonts |

### Backend (`multiflix-backend/src`)

| Folder | What's in it |
|--------|--------------|
| `routes/` | The list of API endpoints (auth, posts, stories, music, chat, admin…) |
| `services/` | The actual business logic behind each route |
| `models/` | The shape of every database table (users, posts, transactions…) |
| `schemas/` | Validation rules for incoming data |
| `middleware/` | Login checks, rate limiting, error handling |
| `socket/` | Real-time chat |
| `queues/`, `worker.ts` | Background jobs (audio extraction) |
| `cron/` | Scheduled jobs (expiring 24h stories) |
| `scripts/` | One-off maintenance commands — see section 9 |
| `config/env.ts` | **Start here.** Every setting the backend reads |

All endpoints live under `/api/v1/…`, for example
`https://backend.multiflix.in/api/v1/posts`.

### Admin panel (`multiflix-admin/src/pages`)

One file per dashboard page: Users, Posts, Blogs, Music, Artists, Ads,
Withdrawals, Reports, Earning Rates, Screen Time, Broadcast, App Settings, and
the login/password-reset flow.

### Website (`multiflix-web/src/app`)

Home page, Contact, Privacy, Terms, `/delete-account` (**required by Google
Play** — do not remove it), public profile pages at `/u/<username>`, and the
`.well-known` deep-link files.

---

## 9. Handy maintenance commands (backend)

Run these from inside `multiflix-backend`. They talk to whatever database your
`.env` points at — **double-check that before running anything on production.**

```bash
npm run seed:admin              # create the admin dashboard login
npm run reset:admin-passwords   # reset admin passwords
npm run seed:users              # add fake users (testing only)
npm run seed:posts              # add fake posts (testing only)
npm run seed:music              # load music tracks
npm run seed:earning-rates      # set up how much users earn per view
npm run backfill:usernames      # fill in missing usernames on old accounts
npm run backfill:music-durations   # fix missing track lengths
npm run backfill:blog-durations    # fix missing blog video lengths
```

🔴 **Never run these on production:**

```bash
npm run wipe:music     # deletes ALL music data
npm run wipe:all       # deletes ALL user data
```

---

## 10. Things that will trip you up

Real quirks in this project, learned the hard way.

**The app always points at the live server.** Both dev and production builds use
`https://backend.multiflix.in`. If you make a mistake while developing, you're
making it against real user data. Point `DEV_HOST` at your local backend while
working (see section 6.4).

**Ads don't show in debug builds.** AdMob usually returns "no fill" for live ad
units on debug builds, so you'll see blank spaces. This is normal — they appear
correctly in release builds. Whether ads show at all is controlled by an admin
switch (`GET /ads/config`), not by the code.

**Users stay logged in for a whole year.** Login tokens last 365 days on
purpose, so people don't get kicked out. There's no refresh-token system. If you
shorten `JWT_EXPIRES_IN`, everyone starts getting logged out.

**PM2 must run in "fork" mode.** It's already configured that way. If someone
switches it to cluster mode, two copies fight over port 4000 and the API crashes
in a restart loop (`EADDRINUSE`).

**Behind a proxy, set `TRUST_PROXY=1`.** The server sits behind nginx. Without
this, rate limiting sees every request as coming from the same IP.

**The `.env` file must sit next to `package.json`.** The backend deliberately
loads it from the project root rather than the current folder, because PM2 runs
from a different directory.

**Android has a known layout bug.** On some Android devices there is extra blank
space at the top and bottom of screens, caused by a conflicting edge-to-edge
display setup. This is a known, currently-unfixed issue.

**Push notifications need the Firebase JSON file.** If
`multiflix-1833c-firebase-adminsdk.json` is missing, the backend still starts
normally but silently sends no push notifications. Easy to miss.

**Password-reset emails need Brevo.** Without `BREVO_API_KEY`, the reset code is
printed to the server console instead of emailed. Fine in development, broken in
production.

**Version codes only go up.** Google Play rejects an upload whose `versionCode`
is the same as or lower than one already published. Always increment.

---

## 11. Handover checklist

Tick these off with the outgoing developer before they leave.

**Repository clean-up — do this first, it's the outgoing developer's job**
- [ ] Commit and push the version bump (`android/app/build.gradle` + the iOS
      project file) so GitHub matches the shipped 3.3 / code 52 / iOS 16
- [ ] Merge `feature/bg-music-legacy-arch` into `main` on the mobile repo
      (215 commits), or agree in writing that the feature branch is the trunk
- [ ] Merge `deploy` into `main` on the website and admin repos, or document
      that `deploy` is the trunk
- [ ] Confirm every repo has zero unpushed commits and a clean working tree
- [ ] 🔴 Copy the **production** `.env` off the server
      (`/home/ubuntu/multiflix-be/.env`) and store it safely — it exists in
      exactly one place right now, and it is not in git or in this handover

**Access**
- [ ] Added as collaborator on all 4 GitHub repositories
- [ ] AWS account access + SSH key for the EC2 server
- [ ] Can actually SSH in and run `pm2 status`
- [ ] Firebase project access (`multiflix-1833c`)
- [ ] Google Play Console access
- [ ] Apple Developer + App Store Connect access (team `7JDJ99U8FV`)
- [ ] AdMob account access
- [ ] Vercel team access (both projects)
- [ ] Brevo account access
- [ ] MongoDB access
- [ ] Domain/DNS access for `multiflix.in`

**Files**
- [ ] Received `multiflix-SECRETS.zip`
- [ ] 🔴 Android keystore backed up in **two** separate safe places
- [ ] Keystore passwords recorded in a password manager
- [ ] Confirmed the server's `.env` is backed up somewhere (it's not in git)

**Proof it works**
- [ ] Backend runs locally and `/api/v1/health` responds
- [ ] Admin panel runs locally and you can log in
- [ ] Website runs locally
- [ ] App builds and runs on an Android emulator
- [ ] App builds and runs on an iOS simulator
- [ ] Successfully built a signed release `.aab`
- [ ] Successfully deployed a trivial backend change to the server

**Verify**
- [ ] `https://multiflix.in/.well-known/assetlinks.json` shows a real
      fingerprint, not the placeholder (see section 7.3)
- [ ] Push notifications arrive on a real device
- [ ] A password-reset email actually arrives

---

## 12. Quick reference

| Thing | Value |
|-------|-------|
| Live API | `https://backend.multiflix.in/api/v1` |
| Website | `https://multiflix.in` |
| Android package | `com.multiflix` |
| iOS bundle ID | `com.multiflix` |
| Apple team ID | `7JDJ99U8FV` |
| Android keystore | `android/app/streamit-release-key.keystore` (alias `streamit`) |
| Current Android version | 3.3 (code 52) |
| Current iOS version | 16 |
| Firebase project | `multiflix-1833c` |
| AdMob publisher | `pub-7029440848837237` |
| AWS region | `ap-south-1` |
| CDN | CloudFront (see `S3_PUBLIC_BASE_URL` in backend `.env`) |
| Server address | `3.111.5.239` (user `ubuntu`, key `multiflix-be.pem`) |
| Server path | `/home/ubuntu/multiflix-be` |
| Backend port | 4000 |
| Node version | 22.11+ |
