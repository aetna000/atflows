"""Launch the bundled AtFlows Bun server from a writable user cache."""

import os
from pathlib import Path
import shutil
import subprocess
import sys

from . import __version__


def main() -> int:
    args = sys.argv[1:]
    if any(arg in ("-v", "--version") for arg in args):
        print(f"atflows {__version__}")
        return 0
    if any(arg in ("-h", "--help") for arg in args):
        print("AtFlows local LLM observability\n\nUsage: atflows [--help] [--version]\nDashboard: http://localhost:3000\nProxy: http://localhost:8080\nRequires Bun >=1.1.0.")
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
        return subprocess.call([bun, "run", "apps/server/src/server.ts", *args], cwd=cache)
    except KeyboardInterrupt:
        return 130
