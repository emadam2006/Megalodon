from typing import Any, Dict

from app.core.kafka import TOPIC_REQUESTS, event_bus
from app.core.logging import logger


class AnalyticsWorker:
    def __init__(self):
        self._running = False

    async def handle_request_event(self, event_data: Dict[str, Any]):
        """Processes request telemetry asynchronously out-of-band from the proxy path."""
        # e.g. persistence to cold storage or timeseries DB
        pass

    async def start(self):
        self._running = True
        event_bus.subscribe_local(TOPIC_REQUESTS, self.handle_request_event)
        logger.info("Analytics Worker started successfully.")

    async def stop(self):
        self._running = False


analytics_worker = AnalyticsWorker()
