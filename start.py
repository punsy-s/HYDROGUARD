import os
import signal
import subprocess
import sys
import time
import webbrowser
from pathlib import Path


# Project folders
ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"

BACKEND_PYTHON = BACKEND / ".venv" / "Scripts" / "python.exe"


backend_process = None
frontend_process = None


def start_backend():
    global backend_process

    if not BACKEND_PYTHON.exists():
        print("❌ Backend virtual environment not found!")
        print(f"Expected: {BACKEND_PYTHON}")
        print()
        print("Create it with:")
        print("  cd backend")
        print("  python -m venv .venv")
        print("  .\\.venv\\Scripts\\activate")
        print("  pip install -r requirements.txt")
        sys.exit(1)

    print("🚀 Starting HydroGuard Backend...")

    backend_process = subprocess.Popen(
        [
            str(BACKEND_PYTHON),
            "-m",
            "uvicorn",
            "main:app",
            "--reload",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        cwd=BACKEND,
    )


def start_frontend():
    global frontend_process

    print("🚀 Starting HydroGuard Frontend...")

    # npm.cmd is required on Windows
    frontend_process = subprocess.Popen(
        [
            "npm.cmd",
            "run",
            "dev",
            "--",
            "--port",
            "3000",
        ],
        cwd=FRONTEND,
    )


def stop_process(process, name):
    if process is None:
        return

    if process.poll() is None:
        print(f"🛑 Stopping {name}...")

        try:
            # Kill the process tree on Windows
            if os.name == "nt":
                subprocess.run(
                    [
                        "taskkill",
                        "/F",
                        "/T",
                        "/PID",
                        str(process.pid),
                    ],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                process.terminate()

        except Exception as e:
            print(f"Could not stop {name}: {e}")


def cleanup():
    stop_process(frontend_process, "Frontend")
    stop_process(backend_process, "Backend")


def main():
    print()
    print("=" * 50)
    print("        HYDROGUARD DEVELOPMENT SERVER")
    print("=" * 50)
    print()

    try:
        start_backend()
        start_frontend()

        print()
        print("-" * 50)
        print("HydroGuard is running")
        print("-" * 50)
        print()
        print("Frontend : http://localhost:3000")
        print("Backend  : http://localhost:8000")
        print("Swagger  : http://localhost:8000/docs")
        print()
        print("Press Ctrl+C to stop everything.")
        print("-" * 50)

        # Give Vite/FastAPI a moment to start
        time.sleep(2)

        # Open browser
        webbrowser.open("http://localhost:3000")

        # Keep this launcher running
        while True:
            # If either process crashes, stop everything
            if backend_process.poll() is not None:
                print("\n❌ Backend stopped.")
                break

            if frontend_process.poll() is not None:
                print("\n❌ Frontend stopped.")
                break

            time.sleep(1)

    except KeyboardInterrupt:
        print("\n")
        print("🛑 Shutdown requested...")

    finally:
        cleanup()

        print()
        print("✅ HydroGuard stopped.")
        print()


if __name__ == "__main__":
    main()