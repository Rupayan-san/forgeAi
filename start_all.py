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


def start_services():
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
    p_backend = subprocess.Popen(
        backend_cmd,
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1
    )
    processes.append(("Backend", p_backend))
    threading.Thread(target=stream_logs, args=(p_backend, "BACKEND", CYAN), daemon=True).start()

    # 2. Start RQ Worker
    print(f"{MAGENTA}> Launching RQ Background Ingestion Worker ...{RESET}")
    worker_cmd = [PYTHON_EXEC, "worker.py"]
    p_worker = subprocess.Popen(
        worker_cmd,
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1
    )
    processes.append(("RQ Worker", p_worker))
    threading.Thread(target=stream_logs, args=(p_worker, "WORKER", MAGENTA), daemon=True).start()

    # 3. Start Discord Bot (if configured)
    if check_discord_token():
        print(f"{YELLOW}> Launching Discord Bot Listener ...{RESET}")
        discord_cmd = [PYTHON_EXEC, "discord_bot.py"]
        p_discord = subprocess.Popen(
            discord_cmd,
            cwd=str(BACKEND_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1
        )
        processes.append(("Discord Bot", p_discord))
        threading.Thread(target=stream_logs, args=(p_discord, "DISCORD", YELLOW), daemon=True).start()
    else:
        print(f"{YELLOW}i DISCORD_BOT_TOKEN not configured in .env (skipping Discord Bot){RESET}")

    # 4. Start Frontend
    print(f"{GREEN}> Launching Frontend Dev Server on http://localhost:3000 ...{RESET}")
    frontend_cmd = [NPM_CMD, "run", "dev"]
    p_frontend = subprocess.Popen(
        frontend_cmd,
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1
    )
    processes.append(("Frontend", p_frontend))
    threading.Thread(target=stream_logs, args=(p_frontend, "FRONTEND", GREEN), daemon=True).start()

    print(f"\n{BOLD}{GREEN}[OK] All services started! Press Ctrl+C to stop all services.{RESET}\n")

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
    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)
    start_services()
