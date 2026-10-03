# Multi-stage Dockerfile for Megalodon Network Discovery Agent
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

RUN apt-get update && apt-get install -y --no-install-recommends \
    iproute2 \
    procps \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY megalodon_agent ./megalodon_agent
COPY sentinel_agent ./sentinel_agent
COPY pyproject.toml .

CMD ["python", "-m", "megalodon_agent.main"]
