# Multi-stage Dockerfile for Megalodon Backend
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final Runtime Image
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install runtime libpq for PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged user
RUN groupadd -g 10001 megalodon && \
    useradd -u 10001 -g megalodon -s /bin/bash -m megalodon

# Copy dependencies from builder
COPY --from=builder /root/.local /home/megalodon/.local
ENV PATH=/home/megalodon/.local/bin:$PATH

# Copy application code
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

RUN chown -R megalodon:megalodon /app /home/megalodon

USER megalodon

EXPOSE 8000 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
