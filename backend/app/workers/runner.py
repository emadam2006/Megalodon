import argparse
import asyncio
import signal
from app.core.logging import logger
from app.core.kafka import event_bus
from app.workers.analytics_worker import analytics_worker
from app.workers.security_worker import security_worker
from app.workers.alert_worker import alert_worker
from app.workers.network_worker import network_worker

WORKERS = {
    "analytics": analytics_worker,
    "security": security_worker,
    "alert": alert_worker,
    "network": network_worker,
}


async def main():
    parser = argparse.ArgumentParser(description="Megalodon Background Worker Runner")
    parser.add_argument("worker_type", choices=list(WORKERS.keys()), help="Type of worker to run")
    args = parser.parse_args()

    worker = WORKERS[args.worker_type]
    logger.info(f"Initializing {args.worker_type} worker...")

    try:
        await event_bus.start()
    except Exception as e:
        logger.warning(f"Event bus start encountered exception: {e}, continuing with local bus")

    await worker.start()

    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop_event.set)
        except (NotImplementedError, AttributeError):
            pass

    logger.info(f"{args.worker_type.capitalize()} worker running cleanly.")
    try:
        await stop_event.wait()
    except (asyncio.CancelledError, KeyboardInterrupt):
        pass
    finally:
        logger.info(f"Stopping {args.worker_type} worker...")
        if hasattr(worker, "stop"):
            await worker.stop()
        await event_bus.stop()


if __name__ == "__main__":
    asyncio.run(main())
