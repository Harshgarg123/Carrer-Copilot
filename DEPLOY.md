# Deploy to Vercel - one-time checklist

Do these in order. Total time: about 5 minutes.

## 1. Check everything locally (before pushing)
```bash
npm install
npm run check      # tests your MongoDB login + Groq key/model
npm run build      # must finish without errors
```
`npm run check` must end with **"All checks passed"**.

## 2. MongoDB Atlas (cannot be done from code)
* **Network Access → Add IP Address → "Allow access from anywhere" (`0.0.0.0/0`) → Confirm.** Wait until it says **Active**.
* **Database → Clusters:** make sure the cluster is not *Paused*.

## 3. Vercel → your project → Settings → Environment Variables
Open the file `vercel-environment-variables.txt` that came with this project, copy **all** its lines and paste them into the
first "Key" box - Vercel fills in every variable at once. Choose **Production** (and Preview if you want), then **Save**.
Do **not** add `VITE_API_URL`.

## 4. Push and deploy
```bash
git add -A
git commit -m "MongoDB backend + Vercel deployment"
git push
```
Vercel deploys automatically. (If you added the variables *after* a deployment, press **Redeploy** - variables only apply
to new deployments.)

## 5. Verify
Open `https://YOUR-APP.vercel.app/api/health` - you should see `{"ok":true,"ai":true}`.
Then sign up and use the app. If the health page shows a message, it names the exact problem (see README → Troubleshooting).

> Never commit `.env` or `vercel-environment-variables.txt` - they contain secrets (`.env` is already git-ignored).
