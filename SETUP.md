# Forge AI - Environment Setup Guide

## Recommended local infrastructure

Install Docker Desktop and verify Compose before starting Forge:

```powershell
docker --version
docker compose version
docker compose config
docker compose up -d
```

The repository Compose file runs MongoDB, Redis, Qdrant, FastAPI, the Forge
worker, Prometheus, Grafana, and the OpenTelemetry Collector. The Next.js
frontend remains native. Discord is an optional Compose profile. See
[RUN.md](./RUN.md) for the full startup and verification flow.

To run Forge locally, you'll need several API keys and credentials. This guide walks you through exactly how to get each one.

## 1. MongoDB Atlas (Primary Database)
Used to store users, projects, chat history, and decision logs.

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create an account/sign in.
2. Create a new Project and deploy a **Free cluster** (M0).
3. Under **Security > Database Access**, add a new database user with a username and password.
4. Under **Security > Network Access**, add IP address `0.0.0.0/0` (allow access from anywhere, suitable for local dev).
5. Go to **Database**, click **Connect** -> **Drivers**.
6. Copy the connection string. Replace `<password>` with your database user's password.
7. Add to `.env`: `MONGODB_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/forge?retryWrites=true&w=majority`

## 2. GitHub OAuth App (Authentication & Ingestion)
Used for user login and fetching repository data.

1. Go to your GitHub Settings -> Developer Settings -> [OAuth Apps](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. Fill in the details:
   - **Application name**: `Forge (Local Dev)`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:8000/api/v1/auth/github/callback`
4. Click **Register application**.
5. Copy the **Client ID**.
6. Click **Generate a new client secret** and copy it.
7. Add to `.env`:
   - `GITHUB_CLIENT_ID=your_client_id`
   - `GITHUB_CLIENT_SECRET=your_client_secret`
   - `GITHUB_REDIRECT_URI=http://localhost:8000/api/v1/auth/github/callback`

## 3. OpenAI API (Embeddings & AI)
Used to chunk text and generate vectors (`text-embedding-3-small`).

1. Go to the [OpenAI Platform](https://platform.openai.com/).
2. Create an account and add billing (OpenAI API requires prepaid credits).
3. Go to **API Keys** and click **Create new secret key**.
4. Copy the key.
5. Add to `.env`: `OPENAI_API_KEY=sk-...`

## 4. Qdrant Cloud (Vector Database)
Used for semantic search over code and Discord messages.

1. Go to [Qdrant Cloud](https://cloud.qdrant.io/) and sign up.
2. Create a new **Free Cluster**.
3. Once the cluster is ready, click **Data Access Control** (or API keys).
4. Click **Create API Key**.
5. Copy the **Cluster URL** and the **API Key**.
6. Add to `.env`:
   - `QDRANT_URL=https://your-cluster-url.cloud.qdrant.io:6333`
   - `QDRANT_API_KEY=your_qdrant_api_key`

## 5. Redis (Background Jobs)
Used by RQ to run the GitHub/Discord background ingestion workers.

**Option A: Local Redis (Recommended for Windows)**
- Install Redis via WSL (Windows Subsystem for Linux) or Docker: `docker run -p 6379:6379 -d redis`
- Use URL: `REDIS_URL=redis://localhost:6379/0`

**Option B: Upstash (Cloud Redis)**
1. Go to [Upstash](https://upstash.com/) and create an account.
2. Create a new Redis database.
3. Scroll down to the **Connect** section, select Python, and copy the `REDIS_URL`.
4. Add to `.env`: `REDIS_URL=rediss://default:password@endpoint.upstash.io:6379`

## 6. Discord Bot Token (Phase 4)
Used to ingest your Discord server's messages.

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and name it `Forge AI`.
3. Go to the **Bot** tab and click **Reset Token** to get your token.
4. Scroll down and enable **Message Content Intent**.
5. Add to `.env`: `DISCORD_BOT_TOKEN=your_bot_token`

## 7. Agora App ID (Phase 6 - Voice)
Used for the Voice Q&A feature.

1. Go to the [Agora Console](https://console.agora.io/) and create an account.
2. Create a new Project.
3. Select **App ID only** (for local development) or **App ID + Certificate** (for production).
4. Copy the App ID.
5. Add to `.env`: `AGORA_APP_ID=your_agora_app_id`
