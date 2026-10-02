# Multi-stage Dockerfile for Megalodon CLI
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final Runtime Image
FROM python:3.12-slim AS runtime

WORKDIR /app

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY megalodon_cli ./megalodon_cli
COPY sentinel_cli ./sentinel_cli
COPY pyproject.toml .

ENTRYPOINT ["python", "-m", "megalodon_cli.main"]
