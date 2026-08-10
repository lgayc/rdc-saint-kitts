# RDC Saint Kitts — Website

A single scrolling landing page for RDC Saint Kitts (Radiology Diagnostic Center): modalities showcase, appointment booking, a staff-editable "Studies & Work" feed, and social links. Plain HTML/CSS/JS — no build step, no framework, no npm install. Open `index.html` in a browser and it works.

## 1. What's real vs. placeholder

I could not access the clinic's Facebook page directly (Facebook blocks automated browsing), so most content is realistic **placeholder** text you should replace. The following were confirmed via public web search and are real:

- Phone: `+1 869-665-7171`
- Email: `rad.dg.center@gmail.com`
- Facebook page: the one linked in the footer/socials

Everything else — exact address, hours, the modality list, stats, sample posts — is a placeholder. Every placeholder is marked with a `PLACEHOLDER` comment in `js/config.js` so you can find them with a simple search.

## 2. File structure

```
rdc-saint-kitts/
├── index.html              Page structure/content (sections only, no styling logic)
├── css/styles.css          All visual styling + animations (numbered sections inside)
├── js/config.js            ← EDIT THIS FIRST. All clinic text, contact info, services, links
├── js/icons.js             Inline SVG icons (no external icon library needed)
├── js/main.js              Navigation, scroll animations, 3D parallax, horizontal carousel
├── js/booking.js           Appointment form submission logic
├── js/studies.js           "Studies & Work" feed (Google Sheet or local fallback)
├── data/sample-studies.json Fallback content for the Studies section
└── README.md               You're reading it
```

**Rule of thumb for future edits:** if you're changing *text, contact info, services, or links*, you almost always only need `js/config.js`. If you're changing *layout or colors*, go to `css/styles.css` (design tokens are all at the top, in the `:root` block). You should rarely need to touch `index.html` or the other JS files unless you're adding a whole new section or feature.

## 3. Everyday content edits (js/config.js)

Open `js/config.js`. It's one big, commented object, `SITE_CONFIG`. Examples:

- **Change clinic name/tagline:** edit `clinicName`, `tagline`, `subTagline`.
- **Change phone/email/address/hours:** edit the `contact` block.
- **Add/remove/edit a modality (service):** edit the `modalities` array. Each entry needs a `name`, `icon` (see available keys in `js/icons.js`), and `description`. The homepage carousel and the booking form's dropdown both rebuild automatically from this array — you never edit them directly.
- **Change social links:** edit the `social` block.

## 4. Booking notifications (email, Google Calendar, WhatsApp)

This is a static site, so there's no server of its own to receive form submissions. Here's the setup, in order of effort:

### Step 1 — Email (required, ~2 minutes)
1. Create a free account at [formspree.io](https://formspree.io).
2. Create a new form and copy its endpoint URL (looks like `https://formspree.io/f/xxxxxxx`).
3. Paste it into `js/config.js` → `booking.formEndpoint`, replacing the placeholder.

That's it — every booking submission now emails the address on your Formspree account. Until you do this, the form falls back to opening a pre-filled email draft to `booking.testNotificationEmail` (currently set to your email for testing) so you can test the flow before Formspree is connected.

### Step 2 — Also add to Google Calendar + send a WhatsApp message (optional)
Formspree by itself only sends email. To fan the same booking out to Google Calendar and WhatsApp automatically, connect a free **Zapier** automation (no coding):

1. In Zapier, create a new Zap.
2. **Trigger:** "Formspree — New Submission" → connect your Formspree account and select the form from Step 1.
3. **Action 1:** "Google Calendar — Create Detailed Event" → connect the clinic's Google account → map the booking fields (name, date, time, notes) into the event.
4. **Action 2:** "WhatsApp Business by Zapier" (or a Twilio WhatsApp action if you'd rather use Twilio directly) → connect your WhatsApp Business number → send a message using the booking fields.
5. Turn the Zap on.

Zapier's free tier covers a small clinic's booking volume; if you outgrow it, the same idea works with **Make.com** (similar free tier).

> These are third-party accounts (Formspree, Zapier, WhatsApp Business/Twilio) that only you can create and authorize. The steps above are everything needed; none of it requires touching code again once it's wired up.

## 5. Studies & Work — the non-technical editor

Since staff aren't comfortable editing code, the "editor" for this section is a **Google Sheet** — literally a spreadsheet.

**One-time setup:**
1. Create a Google Sheet with exactly these column headers in row 1: `title | date | excerpt | color | link`
2. Add one row per post. `color` (a hex code like `#2dd4bf`) and `link` are optional — leave them blank if not needed.
3. In the Sheet: **File → Share → Publish to web** → choose the specific sheet/tab → format **"Comma-separated values (.csv)"** → **Publish** → copy the link it gives you.
4. Paste that link into `js/config.js` → `studies.sheetCsvUrl`.

**From then on:** to publish a new post, staff just open the Sheet and add a row. No code, no login to this project, nothing to redeploy — the website re-reads the Sheet every time someone loads the page.

Until `sheetCsvUrl` is filled in, the site shows the sample posts in `data/sample-studies.json` so the section is never empty.

## 6. The "3D" scroll effect, explained

Two techniques create the dynamic feel, both in `js/main.js`:

- **Hero parallax:** three blurred color blobs behind the headline move at different speeds as you scroll (`setupHeroParallax`), plus a subtle mouse-tilt on desktop.
- **Horizontal modalities carousel:** the Modalities section is intentionally very tall (`min-height: 220vh` in `css/styles.css`). Its inner `.modalities-pin` is `position: sticky`, so it stays pinned in view while that tall section scrolls underneath it. `setupModalitiesCarousel` measures how far you've scrolled through that tall section (0 to 1) and shifts the card track sideways by the same proportion — so ordinary vertical scrolling drives horizontal motion. To make that effect longer/shorter, adjust the `min-height` value on `.modalities` in `css/styles.css`.

## 7. Deploying the site

Any static host works since there's no server-side code:

- **Netlify / Vercel:** drag-and-drop the project folder in their dashboard, or connect this GitHub repo — both have generous free tiers.
- **GitHub Pages:** enable Pages in this repo's settings.

No build command is needed — it's plain static files.

## 8. Browser support

Built with standard, widely-supported CSS/JS (`position: sticky`, `IntersectionObserver`, `fetch`). Works in all current versions of Chrome, Safari, Firefox, and Edge, desktop and mobile.
