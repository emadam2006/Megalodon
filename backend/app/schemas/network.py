from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class NetworkAddressSchema(BaseModel):
    family: str  # IPv4, IPv6
    address: str
    prefix: int


class NetworkInterfaceSchema(BaseModel):
    id: Optional[str] = None
    name: str
    state: str = "UP"  # UP, DOWN, UNKNOWN
    mac_address: Optional[str] = None
    speed_mbps: Optional[int] = None
    mtu: Optional[int] = None
    addresses: List[NetworkAddressSchema] = []
    last_seen_at: Optional[datetime] = None


class NetworkListenerSchema(BaseModel):
    id: Optional[str] = None
    protocol: str = "TCP"  # TCP, UDP
    bind_address: str
    port: int
    process_name: Optional[str] = None
    pid: Optional[int] = None
    command: Optional[str] = None
    last_seen_at: Optional[datetime] = None


class NetworkConnectionSchema(BaseModel):
    protocol: str  # TCP, UDP
    source_ip: str
    source_port: int
    destination_ip: str
    destination_port: int
    state: str  # ESTABLISHED, LISTEN, TIME_WAIT, CLOSE_WAIT, SYN_SENT, SYN_RECV, etc.
    pid: Optional[int] = None
    process_name: Optional[str] = None


class NetworkRouteSchema(BaseModel):
    destination: str
    gateway: str
    genmask: Optional[str] = None
    flags: Optional[str] = None
    metric: Optional[int] = None
    interface: str


class NetworkTopologyNode(BaseModel):
    id: str
    label: str
    type: str  # internet, interface, port, service, client
    status: str = "normal"
    details: dict = {}


class NetworkTopologyEdge(BaseModel):
    source: str
    target: str
    label: Optional[str] = None
    traffic_rate: Optional[float] = None


class NetworkTopologyMapSchema(BaseModel):
    nodes: List[NetworkTopologyNode]
    edges: List[NetworkTopologyEdge]


class NetworkDiscoveryPayload(BaseModel):
    timestamp: datetime
    host_name: str
    interfaces: List[NetworkInterfaceSchema]
    listeners: List[NetworkListenerSchema]
    connections: List[NetworkConnectionSchema]
    routes: List[NetworkRouteSchema] = []
