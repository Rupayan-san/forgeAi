# Forge AI – How to Run

The primary development setup runs every backend-side service in Docker and
keeps only the Next.js frontend native.

```text
Docker:  MongoDB, Redis, Qdrant, FastAPI, Forge worker, Prometheus, Grafana, OTEL
Native:  Next.js frontend
```

## Prerequisites and environment

- Docker Desktop with the Linux engine running
- Python 3.11+ for native fallback/evaluation commands
- Node.js 18+ and npm 9+
- Provider credentials for real AI requests

Create the local backend environment file once:

```powershell
Copy-Item backend\.env.example backend\.env
```

Set real provider secrets in `backend/.env`. It is ignored by Git and must
never be committed. Compose overrides only infrastructure endpoints inside
the containers:

```text
MongoDB       mongodb://mongodb:27017
Redis         redis://redis:6379/0
Qdrant        http://qdrant:6333
OTLP/HTTP     http://otel-collector:4318
```

The native frontend continues to call `http://localhost:8000`.

## Recommended: run the complete stack

Start Docker Desktop, then from the repository root:

```powershell
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

For the normal second and subsequent starts, `docker compose up -d` is
enough. The first build creates the reusable `forge-backend:dev` image used by
FastAPI, the RQ worker, and the optional Discord service.

Start the native frontend in another terminal:

```powershell
cd frontend
npm install             # first run only
npm run dev
```

Open http://localhost:3000. Docker Compose starts:

- MongoDB
- Redis
- Qdrant
- FastAPI backend
- Forge RQ worker
- Prometheus
- Grafana
- OpenTelemetry Collector

### Optional Discord bot

Leave `DISCORD_BOT_TOKEN` empty to keep Discord disabled. The core stack does
not depend on it. To enable it, set the token in `backend/.env` and run:

```powershell
$env:COMPOSE_PROFILES = "discord"
docker compose up -d
docker compose ps discord
```

The bot uses the same backend image and connects to MongoDB and Qdrant through
Compose service names. Never put a token in `docker-compose.yml`.

### Service URLs

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| Swagger (development mode) | http://localhost:8000/docs |
| Metrics | http://localhost:8000/metrics |
| Qdrant | http://localhost:6333 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |
| OTLP/HTTP | http://localhost:4318 |

Grafana defaults to `admin` / `admin` unless `GRAFANA_ADMIN_USER` and
`GRAFANA_ADMIN_PASSWORD` are set in the environment used by Compose.

## Run services separately

The recommended separate-process workflow is to keep infrastructure in
Compose and run the application natively. Start infrastructure first:

```powershell
docker compose up -d mongodb redis qdrant otel-collector
```

### Native FastAPI backend

```powershell
cd backend
python -m venv venv                 # first run only
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt     # first run or after changes
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

When the backend runs natively, use these values in `backend/.env`:

```env
MONGODB_URL=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379/0
QDRANT_URL=http://localhost:6333
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Native RQ worker

In another terminal:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python worker.py
```

The worker listens to `github`, `discord`, and `decisions`.

### Native Discord bot (optional)

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python discord_bot.py
```

Run it only when `DISCORD_BOT_TOKEN` is configured.

### Native frontend

```powershell
cd frontend
npm run dev
```

### Native Prometheus, Grafana, and OTEL

If these tools are installed locally, run them in separate terminals:

```powershell
prometheus --config.file="monitoring\prometheus\prometheus.yml"
```

```powershell
$env:GF_PATHS_PROVISIONING = "$(Resolve-Path monitoring\grafana\provisioning)"
$env:FORGE_GRAFANA_DASHBOARDS = "$(Resolve-Path monitoring\grafana\dashboards)"
grafana-server
```

```powershell
otelcol-contrib --config="monitoring\otel-collector-config.yaml"
```

For native Prometheus, change its target to `localhost:8000` if the backend
is native. The committed Compose target is `backend:8000`.

## Run everything with the launcher

For the native fallback, run from the repository root:

```powershell
python start_all.py
```

This starts native FastAPI, the native worker, optional native Discord, and
the native frontend. Add installed local observability binaries with:

```powershell
python start_all.py --with-observability
```

For the primary Docker workflow, use the launcher only if you also want it to
start the native frontend:

```powershell
python start_all.py --docker
```

The legacy `--docker-infra` flag remains an alias for `--docker`. Compose is
the source of truth for Dockerized backend services; the launcher does not
start duplicate native backend or worker processes in this mode.

The Windows shortcut is equivalent:

```powershell
.\start.ps1
```

## Evaluation and benchmark

Evaluation runs the real RAG pipeline against an existing project. It requires
the Dockerized or native backend environment and a real `project_id`:

```powershell
Push-Location backend
.\venv\Scripts\python.exe ..\evaluate.py --project-id <project-id> --user-id <user-id>
Pop-Location
```

To export evaluation examples/results to LangSmith when `LANGCHAIN_API_KEY`
is configured:

```powershell
Push-Location backend
.\venv\Scripts\python.exe ..\evaluate.py --project-id <project-id> --user-id <user-id> --export-langsmith
Pop-Location
```

Run the real performance benchmark with:

```powershell
Push-Location backend
.\venv\Scripts\python.exe ..\benchmark.py --project-id <project-id> --user-id <user-id> --iterations 1
Pop-Location
```

Reports contain answer quality, source attribution, retrieval metrics,
latency percentiles, provider usage, and cost status. No fabricated answer or
baseline is used.

## Observability and Grafana

Make at least one real Forge API or AI request before checking data.

### Metrics

```powershell
(Invoke-WebRequest http://localhost:8000/metrics).Content
```

Look for metrics such as:

- `forge_http_requests_total`
- `forge_http_request_duration_seconds`
- `forge_llm_requests_total`
- `forge_llm_tokens_total`
- `forge_retrieval_requests_total`
- `forge_worker_jobs_total`

### Prometheus

Open http://localhost:9090/targets. The `forge_backend` target must show
`UP` and use `backend:8000/metrics` inside the Docker network. A useful query
is:

```promql
sum(rate(forge_http_requests_total[5m]))
```

### OpenTelemetry

The backend emits OTLP/HTTP traces to `otel-collector:4318` in Compose. View
collector output with:

```powershell
docker compose logs -f otel-collector
```

After a real query, traces should include existing spans for query
processing, retrieval, reranking, context construction, and LLM work.
Telemetry is fail-safe: setting `TELEMETRY_ENABLED=false`, or an unavailable
collector, must not stop the application.

Forge’s primary trace/metrics path is OpenTelemetry plus Prometheus/Grafana.
LangSmith is optional here and is used by the explicit evaluation export; it
is not required for normal request tracing.

### Grafana

1. Open http://localhost:3001 and sign in.
2. Open the provisioned **Forge AI - System & AI Intelligence Dashboard**.
3. Confirm the Prometheus datasource points to `http://prometheus:9090`.
4. Send a real Forge request.
5. Refresh the dashboard and confirm HTTP, LLM, token, retrieval, and worker
   panels contain data.

If the dashboard is empty, check `/metrics`, then Prometheus `/targets`, then:

```powershell
docker compose logs backend prometheus grafana
```

## Logs and status

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f worker
docker compose logs -f mongodb redis qdrant
```

Rebuild the backend image after changing requirements or the Dockerfile:

```powershell
docker compose build backend
docker compose up -d backend worker
```

Because source directories are mounted for development, application-code
changes are picked up by the backend reload configuration when enabled via
`DEBUG=true`; rebuild for dependency or image changes.

## Stop, restart, and persistence

Stop containers without deleting data:

```powershell
docker compose down
```

Start them again and verify that data, Qdrant collections, Prometheus data,
and Grafana provisioning remain available:

```powershell
docker compose up -d
docker compose ps
```

Only reset local data intentionally:

```powershell
docker compose down -v
```

The persistent volumes are `forge_mongodb_data`, `forge_redis_data`,
`forge_qdrant_data`, `forge_prometheus_data`, and `forge_grafana_data`.

## Troubleshooting

### Docker daemon unavailable

Start Docker Desktop and confirm:

```powershell
docker info
docker compose config
```

### Backend is unhealthy

Inspect:

```powershell
docker compose logs backend
docker compose ps
```

The healthcheck uses `http://localhost:8000/api/v1/health` inside the backend
container. Confirm MongoDB, Redis, and Qdrant are healthy first.

### Prometheus target is down

The Dockerized backend target must be `backend:8000`. Do not use
`localhost:8000` from inside the Prometheus container. Confirm the backend is
healthy and inspect `docker compose logs prometheus backend`.

### Native frontend cannot connect

Confirm the backend is published on `http://localhost:8000`, and keep the
frontend’s existing API configuration pointed at that host URL. Do not use the
internal Compose name `backend` from the browser.

### Ports already in use

Stop the conflicting process or change the published host port in Compose and
update dependent local configuration. The frontend defaults to port 3000 and
the backend to port 8000. For a conflicting host Qdrant port, keep the
container port unchanged and use an alternate host port for this session:

```powershell
$env:QDRANT_HOST_PORT = "16333"
$env:QDRANT_GRPC_HOST_PORT = "16334"
docker compose up -d
```

The backend still uses `qdrant:6333` internally; only host access changes.
