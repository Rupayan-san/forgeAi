# Forge AI – How to Run

> Step-by-step instructions to get the full stack running locally.
> Make sure you have all environment variables ready (see [SETUP.md](./SETUP.md) for how to obtain each key).

---

## ⚡ Quick Start (All-in-One Command)

From the project root, start all services (Backend, RQ Worker, Discord Bot, and Frontend) with a single command:

```bash
python start_all.py
```

To start installed Prometheus, Grafana, and OpenTelemetry Collector binaries
as real child processes, use `python start_all.py --with-observability`.
*Or on Windows, simply double-click or run `start.bat` / `.\start.ps1`.*

Press `Ctrl + C` in the terminal to stop all services simultaneously.

---

## Prerequisites

| Tool       | Version  | Install                                                      |
| ---------- | -------- | ------------------------------------------------------------ |
| **Python** | ≥ 3.11   | [python.org](https://www.python.org/downloads/)              |
| **Node.js**| ≥ 18 LTS | [nodejs.org](https://nodejs.org/)                            |
| **npm**    | ≥ 9      | Bundled with Node.js                                         |
| **Redis**  | ≥ 7      | Docker: `docker run -p 6379:6379 -d redis` **or** Upstash    |
| **Git**    | any      | [git-scm.com](https://git-scm.com/)                         |

---

## 1. Clone the Repository

```bash
git clone https://github.com/<your-org>/forgeAi.git
cd forgeAi
```

---

## 2. Configure Environment Variables

The backend reads its config from `backend/.env`.

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in every value. Here's the full list:

```env
# ── App ──────────────────────────────────────────
PROJECT_NAME=ForgeAI
DEBUG=true
SECRET_KEY=<generate-a-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ── MongoDB ──────────────────────────────────────
MONGODB_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net
MONGODB_DB_NAME=forge_ai

# ── Qdrant ───────────────────────────────────────
QDRANT_URL=https://<your-cluster>.cloud.qdrant.io
QDRANT_API_KEY=<your-qdrant-api-key>

# ── OpenAI ───────────────────────────────────────
OPENAI_API_KEY=sk-...

# ── Redis ────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0

# ── GitHub OAuth ─────────────────────────────────
GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>
GITHUB_REDIRECT_URI=http://localhost:8000/api/v1/auth/github/callback
GITHUB_WEBHOOK_SECRET=<your-webhook-secret>

# ── Agora (Voice) ───────────────────────────────
AGORA_APP_ID=<your-agora-app-id>
AGORA_APP_CERTIFICATE=<your-agora-cert>
AGORA_CUSTOMER_ID=<your-customer-id>
AGORA_CUSTOMER_SECRET=<your-customer-secret>

# ── Discord ──────────────────────────────────────
DISCORD_BOT_TOKEN=<your-discord-bot-token>

# ── Groq ─────────────────────────────────────────
GROQ_API_KEY=<your-groq-api-key>

# ── Frontend ─────────────────────────────────────
FRONTEND_URL=http://localhost:3000
```

> **Tip:** You can generate a random `SECRET_KEY` with:
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(64))"
> ```

---

## 3. Backend Setup (FastAPI + Uvicorn)

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# macOS / Linux
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Start the API server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at **http://localhost:8000**.
Interactive docs: **http://localhost:8000/docs**

---

## 4. RQ Worker (Background Jobs)

The app uses **RQ (Redis Queue)** for background ingestion (GitHub repos, Discord messages). Make sure Redis is running first, then in a **separate terminal**:

```bash
cd backend

# Activate the same virtual environment
.\venv\Scripts\Activate.ps1   # Windows
# source venv/bin/activate    # macOS / Linux

# Start the worker
rq worker --with-scheduler
```

> Leave this terminal running alongside the API server.

---

## 5. Frontend Setup (Next.js)

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will be available at **http://localhost:3000**.

---

## 6. Quick Verification Checklist

| # | Check                                          | Expected Result                          |
| - | ---------------------------------------------- | ---------------------------------------- |
| 1 | Open http://localhost:8000                      | JSON with `name`, `version`, `docs`      |
| 2 | Open http://localhost:8000/docs                 | Swagger UI loads                         |
| 3 | Open http://localhost:3000                      | Frontend landing page loads              |
| 4 | Click **Sign in with GitHub**                   | Redirects to GitHub OAuth → callback     |
| 5 | RQ worker terminal shows `Listening on default` | Worker is ready to process jobs          |

---

## Common Issues

### `ModuleNotFoundError` when running the backend
Make sure you activated the virtual environment (`venv`) and ran `pip install -r requirements.txt` inside it.

### Redis connection refused
Ensure Redis is running. If using Docker:
```bash
docker run -p 6379:6379 -d redis
```
Or update `REDIS_URL` in `.env` if using Upstash.

### GitHub OAuth callback fails
Verify that `GITHUB_REDIRECT_URI` matches **exactly** what you configured in your GitHub OAuth App settings (`http://localhost:8000/api/v1/auth/github/callback`).

### Port already in use
Kill the process on the port or change the port:
```bash
# Backend – use a different port
uvicorn app.main:app --reload --port 8001

# Frontend – Next.js picks the next available port automatically
npm run dev -- --port 3001
```

---

## Terminal Overview

You'll need **three terminals** running simultaneously:

```
Terminal 1  →  Backend API     (uvicorn app.main:app --reload --port 8000)
Terminal 2  →  RQ Worker       (rq worker --with-scheduler)
Terminal 3  →  Frontend        (npm run dev)
```

---

Happy hacking! 🚀
