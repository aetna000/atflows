"""Launch the bundled AtFlows Bun server from a writable user cache."""

import os
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.parse import urlencode
import webbrowser

from . import __version__
from .admin import set_temporary_password


def main() -> int:
    args = sys.argv[1:]
    if args[:2] == ["users", "recover-administrator"]:
        password = set_temporary_password(create_only=False)
        print(f"New temporary Administrator password: {password}")
        print("Sign in at the AtFlows dashboard and choose a permanent password.")
        return 0
    setup_password = None
    if args == ["init"]:
        setup_password = set_temporary_password(create_only=True)
        if setup_password is None:
            print("AtFlows is already initialized. Use 'atflows users recover-administrator' to reset access.")
            return 0
        print(f"Temporary Administrator password: {setup_password}")
        print("Starting AtFlows and opening the sign-in page...")
        args = []
    if any(arg in ("-v", "--version") for arg in args):
        print(f"atflows {__version__}")
        return 0
    if any(arg in ("-h", "--help") for arg in args):
        print("AtFlows local LLM observability\n\nUsage: atflows [init|users recover-administrator|--help|--version]\nDashboard: http://localhost:1337 by default (check the startup URL)\nProxy: http://localhost:8080 by default\nRequires Bun >=1.1.0.")
        return 0
    bun = shutil.which("bun")
    if bun is None:
        print("AtFlows requires Bun >=1.1.0. Install it from https://bun.sh", file=sys.stderr)
        return 1
    source = Path(__file__).resolve().parent / "_runtime"
    if not (source / "apps/server/src/server.ts").is_file():
        print("AtFlows runtime is missing from this installation.", file=sys.stderr)
        return 1
    cache = Path(os.environ.get("ATFLOW_RUNTIME_DIR", Path.home() / ".cache" / "atflows")) / __version__
    ready = cache / ".ready"
    if not ready.is_file():
        cache.parent.mkdir(parents=True, exist_ok=True)
        if cache.exists():
            shutil.rmtree(cache)
        shutil.copytree(source, cache)
        print("Preparing AtFlows runtime...", flush=True)
        result = subprocess.run([bun, "install", "--production", "--frozen-lockfile"], cwd=cache, check=False)
        if result.returncode:
            shutil.rmtree(cache, ignore_errors=True)
            return result.returncode
        ready.touch()
    try:
        if setup_password:
            setup_environment = os.environ.copy()
            setup_environment.pop("ATFLOWS_ADMIN_PASSWORD", None)
            process = subprocess.Popen([bun, "run", "apps/server/src/server.ts"], cwd=cache,
                                       env=setup_environment, stdout=subprocess.PIPE,
                                       stderr=subprocess.STDOUT, text=True, bufsize=1)
            try:
                for line in process.stdout:
                    print(line, end="", flush=True)
                    if line.startswith("[atflows] Dashboard:"):
                        address = line.split("Dashboard:", 1)[1].strip()
                        url = f"{address}/?{urlencode({'username': 'administrator', 'password': setup_password})}"
                        webbrowser.open(url)
                return process.wait()
            except KeyboardInterrupt:
                process.terminate()
                process.wait()
                return 130
        return subprocess.call([bun, "run", "apps/server/src/server.ts", *args], cwd=cache)
    except KeyboardInterrupt:
        return 130
