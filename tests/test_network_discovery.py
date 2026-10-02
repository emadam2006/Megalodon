from megalodon_agent.discovery import HostNetworkDiscoverer
from megalodon_agent.interfaces import InterfaceCollector
from megalodon_agent.processes import ProcessCorrelator
from megalodon_agent.sockets import SocketCollector


def test_interface_collector():
    interfaces = InterfaceCollector.collect_interfaces()
    assert isinstance(interfaces, list)
    assert len(interfaces) > 0

    # Ensure at least loopback 'lo' is present on any Linux system
    lo_iface = next((i for i in interfaces if i["name"] == "lo"), None)
    assert lo_iface is not None
    assert lo_iface["state"] == "UP"
    assert any(a["address"] == "127.0.0.1" for a in lo_iface["addresses"])


def test_socket_collector():
    listeners = SocketCollector.collect_listeners()
    assert isinstance(listeners, list)
    for l in listeners:
        assert l["protocol"] in ("TCP", "UDP")
        assert isinstance(l["port"], int)
        assert l["port"] > 0
        assert l["bind_address"] is not None


def test_process_correlator_safe_handling():
    # Process 0 or negative PID
    name, cmdline = ProcessCorrelator.get_process_info(None)
    assert name is None

    # Invalid high PID should return unavailable without throwing exception
    name, cmdline = ProcessCorrelator.get_process_info(9999999)
    assert "unavailable" in name.lower() or name is None


def test_host_snapshot():
    snapshot = HostNetworkDiscoverer.snapshot()
    assert "timestamp" in snapshot
    assert "host_name" in snapshot
    assert "interfaces" in snapshot
    assert "listeners" in snapshot
    assert "connections" in snapshot
    assert "routes" in snapshot
