import asyncio
import json
from typing import Any, Callable, Dict, List, Optional

from aiokafka import AIOKafkaProducer

from app.core.config import settings
from app.core.logging import logger

TOPIC_REQUESTS = "megalodon.requests"
TOPIC_SECURITY_EVENTS = "megalodon.security-events"
TOPIC_ALERTS = "megalodon.alerts"
TOPIC_AUDIT = "megalodon.audit"
TOPIC_NETWORK_EVENTS = "megalodon.network-events"

ALL_TOPICS = [
    TOPIC_REQUESTS,
    TOPIC_SECURITY_EVENTS,
    TOPIC_ALERTS,
    TOPIC_AUDIT,
    TOPIC_NETWORK_EVENTS,
]


class KafkaEventBus:
    """
    Asynchronous event bus supporting production Apache Kafka clusters
    with seamless local async-queue fallback for standalone environments.
    """
    def __init__(self):
        self.producer: Optional[AIOKafkaProducer] = None
        self.fallback_subscribers: Dict[str, List[Callable[[Dict[str, Any]], Any]]] = {
            t: [] for t in ALL_TOPICS
        }
        self.is_connected = False

    async def start(self):
        if not settings.KAFKA_ENABLED:
            logger.info("Kafka is disabled in configuration. Using in-memory async event dispatcher.")
            return

        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                client_id=settings.KAFKA_CLIENT_ID,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                request_timeout_ms=3000,
            )
            # Give short timeout to connect
            await asyncio.wait_for(self.producer.start(), timeout=4.0)
            self.is_connected = True
            logger.info(
                "Connected to Kafka broker at %s", settings.KAFKA_BOOTSTRAP_SERVERS
            )
        except Exception as e:
            logger.warning(
                "Failed to connect to Kafka at %s: %s. Using internal event queue fallback.",
                settings.KAFKA_BOOTSTRAP_SERVERS,
                e,
            )
            self.producer = None
            self.is_connected = False

    async def stop(self):
        if self.producer and self.is_connected:
            await self.producer.stop()
            self.is_connected = False
            logger.info("Kafka producer stopped.")

    async def publish(self, topic: str, data: Dict[str, Any]):
        """Publish an event payload to a Kafka topic or local subscribers."""
        if self.is_connected and self.producer:
            try:
                await self.producer.send_and_wait(topic, data)
                return
            except Exception as e:
                logger.error("Failed to send Kafka event to topic %s: %s", topic, e)

        # In-memory fallback dispatch
        subscribers = self.fallback_subscribers.get(topic, [])
        for handler in subscribers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    asyncio.create_task(handler(data))
                else:
                    handler(data)
            except Exception as e:
                logger.error("Error in local event subscriber for %s: %s", topic, e)

    def subscribe_local(self, topic: str, handler: Callable[[Dict[str, Any]], Any]):
        """Registers local handlers when running in embedded/fallback mode."""
        if topic not in self.fallback_subscribers:
            self.fallback_subscribers[topic] = []
        self.fallback_subscribers[topic].append(handler)


event_bus = KafkaEventBus()
