from atflows import cli


def test_guard_reuses_one_healthy_default_instance(monkeypatch, capsys) -> None:
    monkeypatch.setattr(
        "atflows.status.running_servers",
        lambda: [{
            "pid": 42,
            "dashboard_port": 1337,
            "proxy_port": 8080,
            "dashboard_online": True,
            "proxy_online": True,
        }],
    )
    shown: list[bool] = []
    monkeypatch.setattr(cli, "print_status", lambda: shown.append(True) or 0)

    assert cli._guard_single_default_instance() == 0
    assert shown == [True]
    assert "already running on the selected ports" in capsys.readouterr().out


def test_guard_respects_explicit_custom_ports(monkeypatch) -> None:
    monkeypatch.setenv("DASHBOARD_PORT", "1447")
    monkeypatch.setenv("PROXY_PORT", "8180")
    monkeypatch.setattr(
        "atflows.status.running_servers",
        lambda: [{"pid": 42, "dashboard_port": 1447, "proxy_port": 8180,
                  "dashboard_online": True, "proxy_online": True}],
    )
    monkeypatch.setattr(cli, "print_status", lambda: 0)
    assert cli._guard_single_default_instance() == 0


def test_guard_refuses_running_instance_on_other_ports(monkeypatch, capsys) -> None:
    monkeypatch.setattr(
        "atflows.status.running_servers",
        lambda: [{
            "pid": 99,
            "dashboard_port": 56659,
            "proxy_port": 56658,
            "dashboard_online": True,
            "proxy_online": True,
        }],
    )

    assert cli._guard_single_default_instance() == 2
    error = capsys.readouterr().err
    assert "PID 99 (56659/56658)" in error
    assert "will not choose random ports" in error


def test_guard_refuses_ports_owned_by_another_process(monkeypatch, capsys) -> None:
    monkeypatch.setattr("atflows.status.running_servers", lambda: [])
    monkeypatch.setattr(cli, "_port_available", lambda port: port != 8080)

    assert cli._guard_single_default_instance() == 2
    error = capsys.readouterr().err
    assert "8080" in error
    assert "confirm before stopping it" in error


def test_guard_allows_clean_default_ports(monkeypatch) -> None:
    monkeypatch.setattr("atflows.status.running_servers", lambda: [])
    monkeypatch.setattr(cli, "_port_available", lambda _port: True)

    assert cli._guard_single_default_instance() is None
