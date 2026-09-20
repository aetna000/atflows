"""Local Administrator bootstrap and recovery commands."""

import hashlib
import json
import os
from pathlib import Path
import secrets


def admin_file() -> Path:
    return Path(os.environ.get("DATA_DIR", Path.home() / ".atflows")) / "admin-auth.json"


def set_temporary_password(*, create_only: bool) -> str | None:
    target = admin_file()
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if create_only and target.exists():
        return None
    password = secrets.token_urlsafe(20)
    salt = secrets.token_bytes(16)
    # The Bun server uses the hex salt string as UTF-8 input to scrypt.
    digest = hashlib.scrypt(password.encode(), salt=salt.hex().encode(), n=16384, r=8, p=1, dklen=64)
    record = {"salt": salt.hex(), "digest": digest.hex(), "temporary": True}
    temporary = target.with_name(f".admin-auth-{secrets.token_hex(8)}.json")
    try:
        with temporary.open("x") as file:
            os.chmod(temporary, 0o600)
            json.dump(record, file)
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)
    return password
