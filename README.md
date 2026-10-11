# AI Career Copilot

AI-powered career toolkit: resume analysis, job matching, cover letters, mock interviews, skill-gap analysis,
learning roadmaps, GitHub / project reviews, interview-question generator and an AI mentor.

**Stack:** React + Vite + TypeScript + Tailwind (frontend) · Node.js + Express (API) · **MongoDB** (database) · Groq (AI).

> **Deploying to Vercel?** Follow [DEPLOY.md](DEPLOY.md).

## Quick start

```bash
npm install
cp .env.example .env     # then fill in the values (see below)
npm run dev              # starts the API (port 5000) and the web app (port 5173)
```

Open <http://localhost:5173>, create an account and you're in.

> Requires Node.js **18.11+** (Node 20/22 recommended).

## Environment variables (`.env` in the project root)

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string, e.g. `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net` |
| `MONGODB_DB` | no | Database name (default `ai_career_copilot`). Collections and indexes are created automatically. |
| `JWT_SECRET` | yes | Long random string used to sign login tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `GROQ_API_KEY` | recommended | Enables the AI features. Without it the API returns placeholder data. |
| `GROQ_MODEL_FAST`, `GROQ_MODEL_SMART` | no | Groq model IDs. Both default to `openai/gpt-oss-120b`. Change them if Groq retires a model again. |
| `PORT` | no | API port (default `5000`) |
| `CLIENT_ORIGIN` | no | URL of the web app (default `http://localhost:5173`). Used for CORS and password-reset links. Comma-separate multiple origins. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | no | Email settings for "Forgot password". If `SMTP_HOST` is empty the reset link is printed in the server console. |

`.env` is git-ignored. **Never commit it.** If your database password or API keys were ever shared publicly, rotate them.

### MongoDB Atlas checklist

1. **Network Access** → add your current IP (or `0.0.0.0/0` while developing). Most "could not connect" errors are this.
2. **Database Access** → the user needs *read and write* on the database. If the password contains special characters
   (`@ : / ? # %`), URL-encode them in `MONGODB_URI`.
3. Start the server – you should see `Connected to MongoDB`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API (with auto-reload) + Vite dev server together. Vite proxies `/api` to the API. |
| `npm run dev:server` / `npm run dev:client` | Run only one of the two. |
| `npm run build` | Build the frontend into `dist/`. |
| `npm start` | Start the API. If `dist/` exists it also serves the built web app, so one process serves everything. |
| `npm run typecheck` | TypeScript check. |
| `npm run test:api` | End-to-end API smoke test against a running server (`API_URL=http://localhost:5000`). |

### Production

```bash
npm run build
NODE_ENV=production npm start      # serves the API and the web app on $PORT
```

If you host the frontend and API separately, build the frontend with `VITE_API_URL=https://your-api.example.com`
and set `CLIENT_ORIGIN` on the API to the frontend's URL.

## Deploy on Vercel (frontend + API in one project)

The React build is served as static files and the Express API runs as a Vercel serverless function (`api/index.js`,
routed by `vercel.json`). Nothing else needs to be hosted.

1. Push the project to GitHub and **import it in Vercel** (Framework: *Vite*; build `npm run build`; output `dist` - auto-detected).
2. **Settings → Environment Variables** (add them for *Production*, and *Preview* if you use previews):

   | Name | Value |
   | --- | --- |
   | `MONGODB_URI` | your Atlas connection string |
   | `JWT_SECRET` | a long random string |
   | `GROQ_API_KEY` | your Groq key |
   | `MONGODB_DB`, `GROQ_MODEL_FAST`, `GROQ_MODEL_SMART` | optional |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | needed for password-reset emails (without SMTP the link only appears in the function logs) |

   Do **not** set `VITE_API_URL` - the app and API share the same domain.
3. **MongoDB Atlas → Network Access → add `0.0.0.0/0`.** Vercel functions use changing IP addresses, so a single IP can't be allow-listed.
4. **Redeploy** after adding or changing environment variables (they only apply to new deployments).
5. Open `https://<your-app>.vercel.app/api/health`. `{"ok":true,...}` means the function is running **and** connected to MongoDB.
   Any error message there tells you what is missing.

Serverless limits to know about: request bodies are capped at ~4.5 MB (so resume uploads are limited to **4 MB**), and each
API call must finish within 60 seconds. The `.env` file is not uploaded (`.vercelignore`) - use Vercel's variables instead.

## How it works

```
Browser (React)  ──/api/*──▶  Express API (server/)  ──▶  MongoDB
                                   │
                                   └──▶  Groq (AI models)
```

* **Auth** – email + password (bcrypt). The API returns a JWT that the browser keeps in `localStorage` and sends as
  `Authorization: Bearer …`. Every data route reads the user id from the verified token, so users can only ever access
  their own data. Password reset uses single-use, 1-hour tokens (stored hashed).
* **Resumes** – files (PDF/DOCX, ≤4 MB) are stored in the `resume_files` collection; text is extracted on upload and used
  by *Resume Analysis* and *Job Match*.
* **Dashboard** – statistics are computed live from your data on every load, so they are always up to date.
* **AI** – all prompts live in `server/routes/ai.js` and `server/services/resumeAnalysis.js`; the Groq key never reaches the browser.

### MongoDB collections

`users`, `password_resets`, `resumes`, `resume_files`, `resume_analyses`, `job_matches`, `cover_letters`,
`mock_interviews`, `interview_questions`, `skill_gap_analyses`, `learning_roadmaps`, `github_analyses`,
`project_analyses`, `generated_questions`, `user_activities`, `user_custom_roles`, `career_stats`.

### Project layout

```
server/
  index.js            entry point (connects to MongoDB, starts Express)
  app.js              routes + middleware wiring
  config.js, db.js    environment + MongoDB connection / indexes
  middleware/         JWT auth, error handling
  routes/             auth, resumes, records, interviews, dashboard, ai, ...
  services/           Groq client, resume text extraction, stats, mailer
  test/smoke.mjs      API smoke test
src/                  React app (pages, components, contexts, lib/api.ts)
```

## Troubleshooting

* **`Could not connect to MongoDB`** – see the Atlas checklist above.
* **On Vercel, `/api/health` shows a database message** – it tells you the cause:
  * *"Could not reach the database…"* → Atlas **Network Access** doesn't contain `0.0.0.0/0` yet (or the cluster is paused).
  * *"Database login failed…"* → wrong user/password in `MONGODB_URI` (check Atlas **Database Access**; URL-encode special characters).
  * *"Database host not found…"* → typo in the cluster address inside `MONGODB_URI`.
  * *"Server is not configured…"* → `MONGODB_URI` / `JWT_SECRET` are missing in Vercel's Environment Variables (then redeploy).
* **"Request failed (404)" / "API not found" on Vercel** – the API function isn't deployed or `vercel.json` / the `api/` folder was left out of the repository. Check `/api/health`.
* **Login works but pages say "Network error"** – the API isn't running; use `npm run dev` (not just `npm run dev:client`).
* **Port already in use** – change `PORT` in `.env`.
* **AI answers look like generic placeholders** – `GROQ_API_KEY` is missing or invalid; check the server console.
* **"Could not read any text from this file"** – the PDF is a scanned image or the file is a legacy `.doc`. Upload a text-based PDF or a `.docx`.
