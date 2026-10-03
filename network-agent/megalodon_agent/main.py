import asyncio
import logging
import sys

import httpx
from megalodon_agent.config import agent_settings
from megalodon_agent.discovery import HostNetworkDiscoverer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [megalodon-agent] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("megalodon-agent")


async def run_discovery_agent():
    logger.info("Starting Megalodon Linux Host Network Discovery Agent...")
    logger.info(f"Target Megalodon API: {agent_settings.effective_api_url}")
    logger.info(f"Discovery Loop Interval: {agent_settings.NETWORK_DISCOVERY_INTERVAL}s")

    headers = {
        "Authorization": f"Bearer {agent_settings.NETWORK_AGENT_TOKEN}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        while True:
            try:
                # 1. Inspect host environment safely
                snapshot_data = HostNetworkDiscoverer.snapshot()
                logger.info(
                    f"Discovered: {len(snapshot_data['interfaces'])} interfaces, "
                    f"{len(snapshot_data['listeners'])} listening ports, "
                    f"{len(snapshot_data['connections'])} active connections."
                )

                # 2. Transmit discovery telemetry to Megalodon API
                response = await client.post(
                    agent_settings.effective_api_url,
                    json=snapshot_data,
                    headers=headers,
                )

                if response.status_code == 200:
                    res_json = response.json()
                    logger.info(
                        f"Telemetry accepted by Megalodon API: "
                        f"{res_json.get('events_detected', 0)} events triggered."
                    )
                else:
                    logger.warning(
                        f"Megalodon API responded with status {response.status_code}: {response.text}"
                    )

            except httpx.ConnectError:
                logger.warning(
                    f"Could not connect to Megalodon API at {agent_settings.effective_api_url}. Retrying..."
                )
            except Exception as e:
                logger.error(f"Unexpected error during network discovery loop: {e}")

            await asyncio.sleep(agent_settings.NETWORK_DISCOVERY_INTERVAL)


def main():
    try:
        asyncio.run(run_discovery_agent())
    except KeyboardInterrupt:
        logger.info("Megalodon Agent stopped by user.")


if __name__ == "__main__":
    main()
