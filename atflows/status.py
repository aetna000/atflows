"""Discover live AtFlows dashboard and proxy listeners."""

import json
import os
from pathlib import Path
import socket
from urllib.error import URLError
from urllib.request import urlopen


def state_dir() -> Path:
    return Path(os.environ.get("ATFLOWS_STATE_DIR", Path.home() / ".cache" / "atflows" / "instances"))


def _health(port: int, endpoint: str, instance_id: str) -> bool:
    if not isinstance(port, int) or not 1 <= port <= 65535:
        return False
    try:
        with urlopen(f"http://127.0.0.1:{port}{endpoint}", timeout=0.4) as response:
            body = json.load(response)
        return body.get("status") == "ok" and body.get("instance_id") == instance_id
    except (OSError, URLError, ValueError, TimeoutError, socket.timeout):
        return False


def running_servers() -> list[dict]:
    directory = state_dir()
    if not directory.is_dir():
        return []
    result = []
    for file in directory.glob("*.json"):
        try:
            record = json.loads(file.read_text())
            instance_id = record["instance_id"]
            dashboard_port = record["dashboard_port"]
            proxy_port = record["proxy_port"]
            dashboard = _health(dashboard_port, "/api/health", instance_id)
            proxy = _health(proxy_port, "/health", instance_id)
            if dashboard or proxy:
                result.append({**record, "dashboard_online": dashboard, "proxy_online": proxy})
        except (OSError, ValueError, KeyError, TypeError):
            continue
    return sorted(result, key=lambda item: (item.get("started_at", 0), item.get("pid", 0)))


def print_status() -> int:
    servers = running_servers()
    if not servers:
        print("No AtFlows servers are running.")
        return 0
    print(f"AtFlows servers running: {len(servers)}")
    for item in servers:
        dashboard = f"http://localhost:{item['dashboard_port']}" if item["dashboard_online"] else "unavailable"
        proxy = f"http://localhost:{item['proxy_port']}" if item["proxy_online"] else "unavailable"
        print(f"PID {item['pid']}  Dashboard: {dashboard}  Proxy: {proxy}")
    return 0
