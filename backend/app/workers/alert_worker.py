from typing import Any, Dict

from app.core.kafka import TOPIC_ALERTS, event_bus
from app.core.logging import logger


class AlertWorker:
    def __init__(self):
        self._running = False

    async def handle_alert(self, alert_data: Dict[str, Any]):
        # Notification channels: Webhook / Slack / Email routing
        logger.info(f"[Alert Worker] Dispatching alert: {alert_data.get('title')}")

    async def start(self):
        self._running = True
        event_bus.subscribe_local(TOPIC_ALERTS, self.handle_alert)
        logger.info("Alert Worker started successfully.")

    async def stop(self):
        self._running = False


alert_worker = AlertWorker()
