# SnipURL — Full-Stack URL Shortener
## Complete Setup Guide

---

## Project Structure

```
url-shortener/
├── server/                    ← Express backend
│   ├── package.json
│   ├── index.js               ← Entry point, server setup
│   ├── .env                   ← Your secrets (create this!)
│   ├── models/
│   │   └── Url.js             ← MongoDB schema/model
│   ├── controllers/
│   │   └── urlController.js   ← Business logic
│   └── routes/
│       └── url.js             ← API route definitions
│
└── client/                    ← React frontend (created by Vite)
    ├── vite.config.js         ← Overwrite with our version
    ├── index.html             ← Overwrite with our version
    └── src/
        ├── index.css          ← Overwrite with our version
        ├── App.jsx            ← Overwrite with our version
        ├── App.css            ← Add this file
        └── components/        ← Create this folder + 3 files
            ├── ShortenForm.jsx
            ├── UrlHistory.jsx
            └── UrlCard.jsx
```

---

## Step 1 — MongoDB Atlas Setup (Free Cloud Database)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a free account
3. Click "Build a Database" → choose **M0 Free**
4. Choose a cloud provider (AWS is fine) and a region near you
5. Set a **username** and **password** (save these — you'll need them)
6. Under "Where would you like to connect from?" — add **0.0.0.0/0** (allows all IPs)
7. Click "Connect" → "Compass" → copy the connection string
8. It looks like: `mongodb+srv://yourname:yourpassword@cluster0.xxxxx.mongodb.net/`

---

## Step 2 — Backend Setup

```bash
# Navigate to the server folder
cd url-shortener/server

# Install all dependencies
npm install

# Create your .env file (copy the example)
cp .env.example .env
```

Now open `.env` and fill in your MongoDB connection string:

```
MONGO_URI=mongodb+srv://yourname:yourpassword@cluster0.xxxxx.mongodb.net/urlshortener?retryWrites=true&w=majority
BASE_URL=http://localhost:5000
PORT=5000
```

Replace `yourname` and `yourpassword` with your Atlas credentials.
Note: `urlshortener` at the end is the database name — MongoDB creates it automatically.

```bash
# Start the server in development mode (auto-restarts on file changes)
npm run dev

# You should see:
# ✅ MongoDB connected
# 🚀 Server running → http://localhost:5000
```

---

## Step 3 — Frontend Setup

```bash
# Go back to the project root
cd url-shortener

# Create a new Vite + React project
npm create vite@latest client -- --template react

# Move into it
cd client

# Install React dependencies
npm install

# Also install axios (for API calls — optional, we used fetch instead)
```

Now **replace/add** these files in your `client/` folder with the files provided:

| File | Action |
|---|---|
| `vite.config.js` | **Overwrite** — adds the API proxy |
| `index.html` | **Overwrite** — adds Google Fonts |
| `src/index.css` | **Overwrite** — clean reset |
| `src/App.jsx` | **Overwrite** — our root component |
| `src/App.css` | **Add** — our design system |
| `src/components/ShortenForm.jsx` | **Add** (create folder first) |
| `src/components/UrlHistory.jsx` | **Add** |
| `src/components/UrlCard.jsx` | **Add** |

```bash
# Start the React dev server
npm run dev

# You should see:
# Local: http://localhost:5173
```

---

## Step 4 — Run Both Together

You need TWO terminal windows open simultaneously:

**Terminal 1 (Backend):**
```bash
cd url-shortener/server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd url-shortener/client
npm run dev
```

Open your browser at **http://localhost:5173** — the app should be running!

---

## Testing the API Directly (Optional — Postman or curl)

**Shorten a URL:**
```bash
curl -X POST http://localhost:5000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://www.google.com"}'
```

**Get all URLs:**
```bash
curl http://localhost:5000/api/urls
```

**Test redirect:**
Open `http://localhost:5000/<shortCode>` in a browser — it should redirect.

---

## Architecture — Why Each Decision Was Made

### Why MERN (MongoDB + Express + React + Node)?

- **Single language**: JavaScript everywhere — no context switching between Java (backend) and JS (frontend). You can move fast.
- **MongoDB**: Schema-flexible, free cloud hosting on Atlas, great on a fresher resume. Far more portfolio-friendly than Redis (which is ephemeral).
- **React**: Most in-demand frontend library. Recognizable to any recruiter.
- **Express**: Minimal, fast, widely used. Accenture projects use it heavily.

### Why nanoid over MurmurHash (from the article)?

| | MurmurHash | nanoid |
|---|---|---|
| Type | Deterministic | Random |
| Same input | Same output always | Different code each time |
| Collision risk | Zero (but no uniqueness guarantee across different inputs) | Near-zero (~3.5 trillion combinations at 7 chars) |
| Interview note | Good for deterministic systems | Better for true short URL generation |

For a portfolio project, nanoid is the better choice. You can explain both in an interview.

### Why MongoDB TTL Index instead of a cron job for expiry?

A cron job is a script that runs on a schedule (e.g., "every midnight, delete expired URLs"). This requires:
- Setting up a scheduler
- Writing cleanup code
- Running an extra process

MongoDB's TTL index does this automatically at the database level — zero extra code, zero maintenance. It's a genuinely elegant solution that shows you understand your tools deeply.

### Why 302 redirect instead of 301?

- **301 Permanent**: Browser caches it forever. If your short link expires, the browser still goes to the old destination and never asks your server.
- **302 Temporary**: Browser always asks your server first. Since our links expire in 7 days, 302 is correct.

---

## Common Errors & Fixes

**"Cannot reach the server"** in the React app:
→ Your Express server isn't running. Open Terminal 1 and run `npm run dev` in the server folder.

**"MongoServerError: Authentication failed"**:
→ Wrong username/password in your MONGO_URI. Double-check your Atlas credentials.

**"connect ECONNREFUSED 127.0.0.1:5000"**:
→ The React app's proxy can't reach the server. Make sure the server is running on port 5000.

**"nanoid is not a function"**:
→ You installed nanoid v4+. Run: `npm install nanoid@3` in the server folder.

**Port 5173 already in use**:
→ Another Vite app is running. Stop it (Ctrl+C) or change the port in vite.config.js.

---

## What to Tell Interviewers

1. **Tech stack**: MERN — MongoDB, Express, React (Vite), Node.js
2. **Architecture**: 3-layer — Routes → Controllers → Models (standard enterprise pattern)
3. **Hashing**: nanoid(7) generates 7-character URL-safe codes, ~3.5 trillion combinations
4. **Expiry**: MongoDB TTL index automatically deletes documents after 7 days
5. **Deduplication**: If the same URL is shortened twice, we return the existing record
6. **Redirect type**: 302 (temporary) because links expire
7. **Dev proxy**: Vite proxies /api requests to Express — no CORS issues in development

---

## Next Steps (to make it even more impressive)

- [ ] **QR Code**: Use the `qrcode` npm package to generate QR codes for each short link
- [ ] **Custom aliases**: Let users choose their own short code (e.g., `/my-portfolio`)
- [ ] **User auth**: Add login so each user sees only their own links (JWT + bcrypt)
- [ ] **Deploy**: Backend on Render.com (free), Frontend on Vercel (free), MongoDB Atlas (free)
- [ ] **Analytics dashboard**: Chart of clicks over time using Chart.js or Recharts
