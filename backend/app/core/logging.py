import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict


class StructuredJsonFormatter(logging.Formatter):
    """
    JSON log formatter designed for production observability and SIEM ingestion.
    Sanitizes sensitive security tokens, passwords, and secrets.
    """
    SENSITIVE_KEYS = {
        "password", "secret", "token", "authorization", "api_key",
        "cookie", "set-cookie", "access_token", "refresh_token"
    }

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include custom request attributes if present on the record
        for attr in [
            "request_id", "client_ip", "interface", "destination_ip",
            "destination_port", "method", "path", "status", "latency"
        ]:
            if hasattr(record, attr):
                log_entry[attr] = getattr(record, attr)

        # Include any extra structured context
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            clean_extra = {}
            for k, v in record.extra_data.items():
                if k.lower() in self.SENSITIVE_KEYS:
                    clean_extra[k] = "[REDACTED]"
                else:
                    clean_extra[k] = v
            log_entry["context"] = clean_extra

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def setup_logging(level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger("megalodon")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Avoid duplicate handlers
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJsonFormatter())
        logger.addHandler(handler)
        logger.propagate = False

    return logger


logger = setup_logging()
