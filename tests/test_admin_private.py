import json
import os

import pytest

from atflows.admin import admin_file, set_temporary_password
from atflows.private_paths import private_path


def test_bootstrap_and_recovery_keep_auth_private(tmp_path, monkeypatch):
    monkeypatch.setenv('DATA_DIR', str(tmp_path))
    first = set_temporary_password(create_only=True)
    assert first and private_path(tmp_path) and private_path(admin_file())
    assert first not in admin_file().read_text()
    assert set_temporary_password(create_only=True) is None
    second = set_temporary_password(create_only=False)
    assert second != first and private_path(admin_file())
    assert json.loads(admin_file().read_text())['temporary'] is True


def test_bootstrap_refuses_symlink_directory(tmp_path, monkeypatch):
    target = tmp_path / 'target'
    target.mkdir()
    link = tmp_path / 'link'
    try:
        link.symlink_to(target, target_is_directory=True)
    except OSError:
        pytest.skip('symlink creation unavailable')
    monkeypatch.setenv('DATA_DIR', str(link))
    with pytest.raises(ValueError):
        set_temporary_password(create_only=True)
    assert not (target / 'admin-auth.json').exists()


def test_bootstrap_refuses_to_change_permissions_on_home(monkeypatch):
    monkeypatch.setenv('DATA_DIR', str(__import__('pathlib').Path.home()))
    with pytest.raises(ValueError, match='dedicated directory'):
        set_temporary_password(create_only=True)
