# Braid with Abi

Online booking for a one-person braiding business. There are two parts, and neither needs a login:

| Folder | What it is | Where it runs |
|---|---|---|
| `website/` | The public site: about, hair prep, policies, style menu, booking calendar, deposit instructions, chat buttons, emails and reminders | **Vercel** (Next.js) + **Supabase** database |
| `owner-app/` | Abi's app: appointments, "did it happen?", money per week/month, cancel/delete, styles and prices, hours, days off, phone alerts | **Android APK** for the tablet, and a **web app** added to the iPhone Home Screen (Expo) |

## How it works

1. A client picks a style, a size/length, an optional blow-dry and an open time, then enters their name, phone and email. **They're booked straight away.**
2. The screen and an email tell them to send the deposit by Interac e-Transfer, with their booking code in the message.
3. Abi gets a phone alert and an email. When the e-Transfer arrives, Abi taps **Deposit received**, and the client gets an email with the address.
4. **Reminders** go out automatically. The client gets an email and Abi gets a phone alert:
   - about **1 day before**
   - about **2 hours before**
5. After the appointment, the app asks Abi **"Did these happen?"** **Yes** counts it in **Money** (this week, this month). **No** cancels it.
6. At any time, Abi can **cancel** an appointment (the client is emailed), **delete** it, or **mark it done**.
7. Clients can cancel, or move their appointment once, from the link in their email. Moving it is allowed up to 48 hours before; that limit can be changed in the app.

How the owner app connects to the website: the app has a private key built in, which must match `OWNER_KEY` on the website. Treat that key, and the owner app's web address, like a password.

---

## Try it on this computer

```bash
cd website && npm install && npm run dev -- -H 0.0.0.0     # http://localhost:3000
cd owner-app && npm install && npx expo start --web --host lan   # http://localhost:8081
```

- **Database:** with no `DATABASE_URL`, the website uses a real local database saved in `website/.data/`. To start fresh, delete that folder.
- **Emails:** with no `RESEND_API_KEY`, emails are saved as files in `website/.email-previews/`. Open them in a browser.
- **Reminders:** they're checked every 5 minutes while the site is running.
- **Phone alerts:** they only work on the live https address, not on a local test link.

---

## Going live (in this order)

### 1. Domain
Buy **braidwithabi.ca**, for example from Namecheap, Cloudflare or GoDaddy, and register it in Abi's name. If you use a different domain, search and replace `braidwithabi.ca` throughout the project.

### 2. Zoho Mail (free) for Abi's inbox
- Sign up for the free plan: **https://mail.zoho.com/signup?type=org&plan=free**
  - If that link doesn't show the free plan, open the pricing page at https://www.zoho.com/mail/zohomail-pricing.html and choose **Forever Free**.
  - Choose the option to use a domain you already own.
- Add the DNS records Zoho shows you at your registrar: verification TXT, MX, SPF and DKIM.
- Create the mailbox **hello@braidwithabi.ca**. Abi can read it in the Zoho Mail phone app.
- Optional: add the alias **payments@braidwithabi.ca** and register it for Interac e-Transfer **Autodeposit** at Abi's bank.

### 3. Resend (free: 3,000 emails/month) for sending emails
- At resend.com, add the domain `braidwithabi.ca` and add the DNS records it shows (on the `send.` subdomain).
- Once the domain is verified, create an **API key**.

### 4. Supabase (free) for the database
1. Create a project at supabase.com in the region **Canada (Central)**. Save the database password.
2. Click **Connect** and copy the **Transaction pooler** URI (port 6543). Put the database password in place of `[YOUR-PASSWORD]`. This is `DATABASE_URL`.

You don't need to run any SQL. The tables and a starter style menu are created automatically on the first visit. The website also schedules the reminder check every 15 minutes inside Supabase.

### 5. Website on Vercel
1. In Vercel, choose **Add New → Project**, import this GitHub repo and set **Root Directory = `website`**.
2. Add these **Environment Variables** (see `website/.env.example`):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://braidwithabi.ca` |
   | `DATABASE_URL` | the Supabase pooler URI from step 4 |
   | `OWNER_KEY` | a long random text, e.g. from `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"` |
   | `RESEND_API_KEY` | from step 3 |
   | `EMAIL_FROM` | `Braid with Abi <bookings@braidwithabi.ca>` |
   | `EMAIL_REPLY_TO`, `OWNER_EMAIL` | `hello@braidwithabi.ca` |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | create a new pair with `npm run vapid` in `website/` |
   | `VAPID_SUBJECT` | `mailto:hello@braidwithabi.ca` |

3. Deploy. Then go to **Settings → Domains**, add `braidwithabi.ca` and `www.braidwithabi.ca`, and create the records Vercel shows at your registrar.
4. Open the site once so the tables are created.

### 6. Owner app
Install the Expo tools once with `npm install -g eas-cli`, then run `eas login`. After that, from `owner-app/`:

1. Run `eas init` to link the project to your Expo account.
2. Put the same values in `owner-app/.env` (used for the iPhone web app) and in `owner-app/eas.json → build.preview.env` (used for the Android APK):
   ```
   EXPO_PUBLIC_SITE_URL=https://braidwithabi.ca
   EXPO_PUBLIC_OWNER_KEY=<same as OWNER_KEY in Vercel>
   EXPO_PUBLIC_VAPID_PUBLIC_KEY=<same as VAPID_PUBLIC_KEY in Vercel>
   ```
   Keep this GitHub repo **private**, because `eas.json` holds the key.

**iPhone (web app):**
1. Run `npm run deploy:web`. The first time, it asks you to pick a name, for example `braidwithabi-owner.expo.app`.
2. On Abi's iPhone (iOS 16.4 or newer):
   1. Open that address in **Safari**.
   2. Tap **Share → Add to Home Screen**.
   3. Open the app from the Home Screen.
   4. Go to **Settings → Phone alerts → Turn on alerts**, then tap **Send me a test alert**.

**Android tablet (APK):**
1. Create a Firebase project. Add an Android app with the package `ca.braidwithabi.owner`, download `google-services.json` into `owner-app/`, and add `"googleServicesFile": "./google-services.json"` under `android` in `app.json`.
2. In Firebase, go to **Project settings → Service accounts** and generate a key. Upload it with `eas credentials` → Android → *FCM V1 service account key*.
3. Run `npm run build:apk` and open the download link on the tablet. Allow "install unknown apps", install it, then turn on alerts under **Settings → Phone alerts**.

### 7. Before telling clients
- [ ] Rewrite the placeholder text in `website/src/lib/content.ts` with Abi. It covers the about section, area, policies, and the **chat links** (WhatsApp, Instagram, TikTok, Messenger, Snapchat). Leave a link empty (`""`) to hide that button.
- [ ] Replace the photos:
  - style photos: **App → Settings → Styles & prices** (tap a style, then *Change photo*)
  - hero and about photos: replace the files in `website/public/images/`
- [ ] In the app, set prices, sizes, hours, days off, the deposit, the e-Transfer email and the address.
- [ ] Test with your own email:
  1. Book on the site.
  2. Check you got the email and Abi got an alert.
  3. Tap **Deposit received**.
  4. Move and then cancel the booking from the email link.
  5. In the app, check **Settings → Phone alerts → "Reminders last checked …"**.

If that line ever says reminders haven't run, open the Supabase **SQL Editor** and run:
```sql
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.schedule('braidwithabi-reminders', '*/15 * * * *',
  $$select net.http_get(url := 'https://braidwithabi.ca/api/reminders')$$);
```

## Costs
- **Domain:** about $15–25 a year.
- **Everything else is free at this size:** Vercel Hobby, Supabase Free, Resend Free, Zoho Mail Forever Free, and Expo's free tier (APK builds and web hosting).
- **Supabase pausing:** free projects pause after a week of no activity. The reminder check every 15 minutes keeps it active.

## Updating
- **Website:** every push to GitHub goes live on Vercel.
- **Owner app:** run `npm run deploy:web` for the iPhone, and `npm run build:apk` for the tablet when something changes.
