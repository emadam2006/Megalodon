import asyncio
import json
from typing import Any, Dict, List, Set

from fastapi import WebSocket

from app.core.logging import logger


class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Active connections: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast_json(self, message_type: str, data: Dict[str, Any]):
        """Broadcasts a JSON message payload to all active client connections."""
        if not self.active_connections:
            return

        payload = json.dumps({
            "type": message_type,
            "data": data,
        })

        async with self._lock:
            stale_connections: List[WebSocket] = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(payload)
                except Exception:
                    stale_connections.append(connection)

            for stale in stale_connections:
                self.active_connections.discard(stale)


ws_manager = WebSocketManager()
