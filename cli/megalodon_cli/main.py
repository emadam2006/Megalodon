
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from megalodon_cli.client import client

app = typer.Typer(
    name="megalodon",
    help="Megalodon — Production Self-Hosted API Security & Network Visibility CLI",
    add_completion=False,
)
network_app = typer.Typer(help="Inspect host network interfaces, listening sockets, and connections")
ip_app = typer.Typer(help="Manage IP allowlists, blocklists, and CIDR rules")
rule_app = typer.Typer(help="Inspect security rules and active protections")
backend_app = typer.Typer(help="Inspect upstream backend services")

app.add_typer(network_app, name="network")
app.add_typer(ip_app, name="ip")
app.add_typer(rule_app, name="rule")
app.add_typer(backend_app, name="backend")

console = Console()


@app.command("status")
def status_cmd():
    """Display high-level Megalodon operational status, traffic metrics and connection counts."""
    health = client.get_health()
    metrics = client.get_metrics()

    console.print(Panel.fit(
        f"[bold cyan]Megalodon Security Platform[/bold cyan]\n"
        f"Status: [{'green' if health.get('status') == 'healthy' else 'yellow'}]{health.get('status', 'unknown').upper()}[/]\n"
        f"Total Requests: [bold white]{metrics.get('total_requests', 0)}[/] | "
        f"Req/s: [bold green]{metrics.get('requests_per_second', 0.0)}[/] | "
        f"Blocked: [bold red]{metrics.get('blocked_requests', 0)}[/] | "
        f"Rate-Limited: [bold yellow]{metrics.get('rate_limited_requests', 0)}[/]\n"
        f"Avg Latency: [bold cyan]{metrics.get('avg_latency_ms', 0.0)} ms[/] | "
        f"Active Connections: [bold magenta]{metrics.get('active_connections_count', 0)}[/]",
        title="Megalodon Status Overview",
        border_style="cyan",
    ))


@app.command("health")
def health_cmd():
    """Verify backend and infrastructure service readiness."""
    health = client.get_health()
    table = Table(title="Dependency Health Checks")
    table.add_column("Dependency", style="cyan")
    table.add_column("Status", style="bold")

    deps = health.get("dependencies", {})
    for dep, st in deps.items():
        color = "green" if "connected" in st else "yellow"
        table.add_row(dep.capitalize(), f"[{color}]{st}[/{color}]")

    console.print(table)


# ---------------- Network Commands ----------------
@network_app.command("interfaces")
def network_interfaces():
    """List host network interfaces, MAC addresses, and assigned IP subnets."""
    interfaces = client.get_interfaces()
    table = Table(title="Discovered Network Interfaces")
    table.add_column("Interface", style="cyan")
    table.add_column("State", style="bold")
    table.add_column("MAC Address", style="magenta")
    table.add_column("MTU", justify="right")
    table.add_column("Addresses (IPv4 / IPv6)", style="green")

    for iface in interfaces:
        state_color = "green" if iface.get("state") == "UP" else "red"
        addrs = ", ".join(f"{a['address']}/{a['prefix']}" for a in iface.get("addresses", []))
        table.add_row(
            iface.get("name", ""),
            f"[{state_color}]{iface.get('state', 'UNKNOWN')}[/{state_color}]",
            iface.get("mac_address") or "N/A",
            str(iface.get("mtu") or "-"),
            addrs or "None",
        )
    console.print(table)


@network_app.command("ports")
def network_ports():
    """List active listening TCP/UDP ports and correlated host processes."""
    ports = client.get_ports()
    table = Table(title="Discovered Listening Ports")
    table.add_column("Protocol", style="cyan")
    table.add_column("Bind Address")
    table.add_column("Port", justify="right", style="bold green")
    table.add_column("PID", justify="right", style="yellow")
    table.add_column("Process Name", style="bold white")
    table.add_column("Command", style="dim")

    for p in ports:
        table.add_row(
            p.get("protocol", ""),
            p.get("bind_address", ""),
            str(p.get("port", "")),
            str(p.get("pid") or "-"),
            p.get("process_name") or "Process unavailable",
            (p.get("command") or "")[:40],
        )
    console.print(table)


@network_app.command("connections")
def network_connections():
    """List active TCP/UDP connections across interfaces."""
    conns = client.get_connections()
    table = Table(title="Discovered Network Connections")
    table.add_column("Proto", style="cyan")
    table.add_column("Source IP:Port")
    table.add_column("Destination IP:Port")
    table.add_column("State", style="bold")
    table.add_column("Process", style="white")

    for c in conns[:50]:
        src = f"{c.get('source_ip')}:{c.get('source_port')}"
        dst = f"{c.get('destination_ip')}:{c.get('destination_port')}"
        state = c.get("state", "ESTABLISHED")
        state_col = "green" if state == "ESTABLISHED" else "yellow"
        table.add_row(
            c.get("protocol", "TCP"),
            src,
            dst,
            f"[{state_col}]{state}[/{state_col}]",
            c.get("process_name") or "Process unavailable",
        )
    console.print(table)


# ---------------- IP Policy Commands ----------------
@ip_app.command("list")
def ip_list():
    """List active IP allow/block policies and CIDR blocks."""
    policies = client.list_ip_policies()
    table = Table(title="Configured IP Policies")
    table.add_column("IP / CIDR Range", style="bold cyan")
    table.add_column("Action", style="bold")
    table.add_column("Expires At", style="yellow")
    table.add_column("Reason")
    table.add_column("Created By", style="dim")

    for p in policies:
        act = p.get("action", "")
        act_col = "green" if act == "ALLOW" else "red"
        table.add_row(
            p.get("ip_or_cidr", ""),
            f"[{act_col}]{act}[/{act_col}]",
            str(p.get("expires_at") or "Permanent"),
            p.get("reason") or "-",
            p.get("created_by") or "-",
        )
    console.print(table)


@ip_app.command("block")
def ip_block(
    ip: str = typer.Argument(..., help="IP address or CIDR network to block (e.g. 1.2.3.4 or 10.0.0.0/8)"),
    duration: int | None = typer.Option(None, "--duration", "-d", help="Temporary block duration in minutes"),
    reason: str = typer.Option("Blocked via CLI", "--reason", "-r", help="Reason for block"),
):
    """Block an IP or CIDR network immediately."""
    res = client.block_ip(ip, reason=reason, duration_minutes=duration)
    if "error" in res:
        console.print(f"[bold red]Failed to block {ip}:[/bold red] {res['error']}")
    else:
        dur_msg = f"for {duration} minutes" if duration else "permanently"
        console.print(f"[bold green]Successfully blocked {ip} {dur_msg}.[/bold green]")


@ip_app.command("unblock")
def ip_unblock(
    ip: str = typer.Argument(..., help="IP address or CIDR network to unblock"),
):
    """Remove an IP or CIDR block policy."""
    ok = client.unblock_ip(ip)
    if ok:
        console.print(f"[bold green]Successfully unblocked {ip}.[/bold green]")
    else:
        console.print(f"[bold red]Could not find or unblock {ip}.[/bold red]")


# ---------------- Rule Commands ----------------
@rule_app.command("list")
def rule_list():
    """List configured security rules and condition priorities."""
    rules = client.list_rules()
    table = Table(title="Security Rules")
    table.add_column("Priority", justify="right")
    table.add_column("Rule Name", style="bold cyan")
    table.add_column("Action", style="bold")
    table.add_column("Status")
    table.add_column("Conditions", style="dim")

    for r in rules:
        act = r.get("action", "")
        act_col = "green" if act == "ALLOW" else ("red" if "BLOCK" in act else "yellow")
        status_str = "[green]Enabled[/green]" if r.get("is_enabled") else "[dim]Disabled[/dim]"
        table.add_row(
            str(r.get("priority", 100)),
            r.get("name", ""),
            f"[{act_col}]{act}[/{act_col}]",
            status_str,
            r.get("conditions_json", "")[:50],
        )
    console.print(table)


# ---------------- Backend Commands ----------------
@backend_app.command("list")
def backend_list():
    """List configured upstream backend services."""
    backends = client.list_backends()
    table = Table(title="Upstream Backends")
    table.add_column("Name", style="bold cyan")
    table.add_column("Upstream URL", style="green")
    table.add_column("Health Check")
    table.add_column("Status")
    table.add_column("Timeout")

    for b in backends:
        status_str = "[green]Active[/green]" if b.get("is_active") else "[red]Disabled[/red]"
        table.add_row(
            b.get("name", ""),
            b.get("upstream_url", ""),
            b.get("health_check_path", "/health"),
            status_str,
            f"{b.get('timeout_seconds')}s",
        )
    console.print(table)


if __name__ == "__main__":
    app()
