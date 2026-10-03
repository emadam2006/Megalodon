from typing import Any, Dict

from app.core.database import get_session_maker
from app.core.kafka import TOPIC_NETWORK_EVENTS, event_bus
from app.core.logging import logger
from app.services.alert_service import alert_service


class NetworkWorker:
    def __init__(self):
        self._running = False

    async def handle_network_event(self, event_data: Dict[str, Any]):
        event_name = event_data.get("event")
        # Generate alert if a new listening port opens unexpectedly on host
        if event_name == "PORT_OPENED":
            port = event_data.get("port")
            session_maker = get_session_maker()
            async with session_maker() as db:
                await alert_service.create_alert(
                    db=db,
                    title=f"New Listening Port Detected: {port}",
                    description=f"Megalodon Network Discovery detected a new open listening socket on port {port}.",
                    severity="INFO",
                    source="network-worker",
                    metadata=event_data,
                )

    async def start(self):
        self._running = True
        event_bus.subscribe_local(TOPIC_NETWORK_EVENTS, self.handle_network_event)
        logger.info("Network Worker started successfully.")

    async def stop(self):
        self._running = False


network_worker = NetworkWorker()
