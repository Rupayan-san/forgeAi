#!/usr/bin/env python3
"""
Forge AI - Unified All-in-One Service Launcher
Starts Backend (FastAPI), RQ Worker, Discord Bot (optional), and Frontend (Next.js).
Handles graceful shutdown of all services with Ctrl+C.
"""

import os
import sys

# Configure UTF-8 encoding for Windows terminals
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import subprocess
import threading
import signal
import time
import argparse
import shutil
import socket
from urllib.request import urlopen
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

# Virtual Environment Python/Uvicorn paths
if sys.platform == "win32":
    VENV_PYTHON = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
    VENV_UVICORN = BACKEND_DIR / "venv" / "Scripts" / "uvicorn.exe"
    NPM_CMD = "npm.cmd"
else:
    VENV_PYTHON = BACKEND_DIR / "venv" / "bin" / "python"
    VENV_UVICORN = BACKEND_DIR / "venv" / "bin" / "uvicorn"
    NPM_CMD = "npm"

# Fallback to system python if venv python doesn't exist
PYTHON_EXEC = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable
UVICORN_EXEC = str(VENV_UVICORN) if VENV_UVICORN.exists() else "uvicorn"

# Colors for terminal output
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
MAGENTA = "\033[95m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

processes = []
shutting_down = False


def stream_logs(process, prefix, color):
    """Stream stdout and stderr with colored prefixes."""
    try:
        for line in iter(process.stdout.readline, ""):
            if not line:
                break
            if not shutting_down:
                print(f"{color}{BOLD}[{prefix}]{RESET} {line.rstrip()}", flush=True)
    except Exception:
        pass


def port_is_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return sock.connect_ex(("127.0.0.1", port)) != 0


def executable_available(command: str) -> bool:
    return Path(command).exists() if Path(command).is_absolute() else shutil.which(command) is not None


def launch_process(name: str, command: list[str], cwd: Path, color: str, port: int | None = None, health_url: str | None = None, env: dict | None = None):
    if not executable_available(command[0]):
        print(f"{RED}[ERROR] {name} not started: executable not found ({command[0]}){RESET}")
        return None
    if port is not None and not port_is_available(port):
        print(f"{RED}[ERROR] {name} not started: port {port} is already in use{RESET}")
        return None
    process = subprocess.Popen(
        command, cwd=str(cwd), env=env, stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace", bufsize=1,
    )
    processes.append((name, process))
    threading.Thread(target=stream_logs, args=(process, name.upper().replace(" ", "_"), color), daemon=True).start()
    deadline = time.time() + 15
    while time.time() < deadline:
        if process.poll() is not None:
            print(f"{RED}[ERROR] {name} exited during startup with code {process.returncode}{RESET}")
            return None
        if not health_url:
            time.sleep(1)
            print(f"{GREEN}[OK] {name} process started (pid {process.pid}){RESET}")
            return process
        try:
            with urlopen(health_url, timeout=1) as response:
                if 200 <= response.status < 500:
                    print(f"{GREEN}[OK] {name} is reachable at {health_url}{RESET}")
                    return process
        except Exception:
            pass
        time.sleep(0.5)
    print(f"{YELLOW}[WARN] {name} process is alive but health check did not pass: {health_url}{RESET}")
    return process


def check_discord_token():
    """Check if DISCORD_BOT_TOKEN is set in backend/.env."""
    env_file = BACKEND_DIR / ".env"
    if not env_file.exists():
        return False
    try:
        content = env_file.read_text(encoding="utf-8")
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("DISCORD_BOT_TOKEN=") and not line.endswith("="):
                token = line.split("=", 1)[1].strip().strip('"').strip("'")
                return bool(token and token != "<your-discord-bot-token>")
    except Exception:
        pass
    return False


def start_services(with_observability: bool = False):
    global shutting_down

    print(f"\n{GREEN}{BOLD}{'='*60}{RESET}")
    print(f"{GREEN}{BOLD}       Starting Forge AI Full Stack System{RESET}")
    print(f"{GREEN}{BOLD}{'='*60}{RESET}\n")

    # 1. Start Backend FastAPI
    print(f"{CYAN}> Launching Backend API on http://localhost:8000 ...{RESET}")
    backend_cmd = [
        PYTHON_EXEC, "-m", "uvicorn", "app.main:app",
        "--reload", "--host", "0.0.0.0", "--port", "8000"
    ]
    if launch_process("Backend", backend_cmd, BACKEND_DIR, CYAN, port=8000, health_url="http://127.0.0.1:8000/") is None:
        shutdown()

    # 2. Start RQ Worker
    print(f"{MAGENTA}> Launching RQ Background Ingestion Worker ...{RESET}")
    worker_cmd = [PYTHON_EXEC, "worker.py"]
    launch_process("RQ Worker", worker_cmd, BACKEND_DIR, MAGENTA)

    # 3. Start Discord Bot (if configured)
    if check_discord_token():
        print(f"{YELLOW}> Launching Discord Bot Listener ...{RESET}")
        discord_cmd = [PYTHON_EXEC, "discord_bot.py"]
        launch_process("Discord Bot", discord_cmd, BACKEND_DIR, YELLOW)
    else:
        print(f"{YELLOW}i DISCORD_BOT_TOKEN not configured in .env (skipping Discord Bot){RESET}")

    # 4. Start Frontend
    print(f"{GREEN}> Launching Frontend Dev Server on http://localhost:3000 ...{RESET}")
    frontend_cmd = [NPM_CMD, "run", "dev"]
    launch_process("Frontend", frontend_cmd, FRONTEND_DIR, GREEN, port=3000, health_url="http://127.0.0.1:3000/")

    if with_observability:
        print(f"\n{BOLD}{CYAN}Starting configured observability processes...{RESET}")
        prometheus_config = ROOT_DIR / "monitoring" / "prometheus" / "prometheus.yml"
        if prometheus_config.exists():
            launch_process("Prometheus", ["prometheus", f"--config.file={prometheus_config}"], ROOT_DIR, CYAN, port=9090, health_url="http://127.0.0.1:9090/-/ready")
        else:
            print(f"{YELLOW}[WARN] Prometheus not started: config file missing ({prometheus_config}){RESET}")

        grafana_env = os.environ.copy()
        grafana_env["GF_PATHS_PROVISIONING"] = str(ROOT_DIR / "monitoring" / "grafana" / "provisioning")
        grafana_env["FORGE_GRAFANA_DASHBOARDS"] = str(ROOT_DIR / "monitoring" / "grafana" / "dashboards")
        launch_process("Grafana", ["grafana-server"], ROOT_DIR, GREEN, port=3001, health_url="http://127.0.0.1:3001/api/health", env=grafana_env)

        collector_config = ROOT_DIR / "monitoring" / "otel-collector-config.yaml"
        collector_executable = "otelcol-contrib" if executable_available("otelcol-contrib") else "otelcol"
        if collector_config.exists() and executable_available(collector_executable) and port_is_available(4317) and port_is_available(4318):
            launch_process("OpenTelemetry Collector", [collector_executable, f"--config={collector_config}"], ROOT_DIR, MAGENTA)
        else:
            print(f"{YELLOW}[WARN] OpenTelemetry Collector not started: executable/config unavailable or ports 4317/4318 occupied ({collector_executable}, {collector_config}){RESET}")

    print(f"\n{BOLD}{GREEN}{'='*60}{RESET}")
    print(f"{BOLD}{GREEN} [OK] Forge AI application processes started.{RESET}")
    print(f"{CYAN}  • Web App:          http://localhost:3000{RESET}")
    print(f"{CYAN}  • Backend API:      http://localhost:8000{RESET}")
    print(f"{CYAN}  • Prometheus Scrape:http://localhost:8000/metrics{RESET}")
    print(f"{CYAN}  • Prometheus UI:    http://localhost:9090 (if running){RESET}")
    print(f"{CYAN}  • Grafana UI:       http://localhost:3001 (if running){RESET}")
    print(f"{CYAN}  • AI Evaluation:    python evaluate.py{RESET}")
    print(f"{BOLD}{GREEN}{'='*60}{RESET}\n")

    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown()


def shutdown(signum=None, frame=None):
    global shutting_down
    if shutting_down:
        return
    shutting_down = True

    print(f"\n{RED}{BOLD}[STOP] Shutting down all Forge AI services...{RESET}")
    for name, p in processes:
        try:
            if sys.platform == "win32":
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                p.terminate()
                p.wait(timeout=3)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass
        print(f"{RED}  - Stopped {name}{RESET}")

    print(f"{GREEN}[OK] All services stopped cleanly.{RESET}")
    sys.exit(0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Start Forge application and optional local observability processes")
    parser.add_argument("--with-observability", action="store_true", help="Start installed Prometheus, Grafana, and OpenTelemetry Collector processes")
    args = parser.parse_args()
    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)
    start_services(with_observability=args.with_observability)
