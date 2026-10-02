.PHONY: help install lint fmt test test-cov frontend-install frontend-build frontend-dev up down logs clean

SHELL := /bin/bash
VENV ?= .venv
PYTHON ?= $(VENV)/bin/python
PIP ?= $(VENV)/bin/pip
RUFF ?= $(VENV)/bin/ruff
PYTEST ?= $(VENV)/bin/pytest

help:
	@echo "Megalodon Developer Makefile"
	@echo "----------------------------------------------------"
	@echo "make install          Initialize venv & install dependencies"
	@echo "make lint             Run ruff linter & style checks"
	@echo "make fmt              Auto-format python code with ruff"
	@echo "make test             Execute test suite"
	@echo "make frontend-install Install Node.js frontend dependencies"
	@echo "make frontend-build   Build production Vite frontend assets"
	@echo "make frontend-dev     Start Vite frontend development server"
	@echo "make up               Launch full Megalodon stack via Docker Compose"
	@echo "make down             Stop Megalodon stack via Docker Compose"
	@echo "make logs             Tail Docker Compose container logs"
	@echo "make clean            Remove build caches and artifacts"

install:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r backend/requirements.txt
	$(PIP) install -r network-agent/requirements.txt
	$(PIP) install -r cli/requirements.txt

lint:
	$(RUFF) check .
	$(RUFF) format --check .

fmt:
	$(RUFF) check --fix .
	$(RUFF) format .

test:
	PYTHONPATH=backend:network-agent:cli $(PYTEST) -v tests/

frontend-install:
	cd frontend && npm install

frontend-build:
	cd frontend && npm run build

frontend-dev:
	cd frontend && npm run dev

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	rm -rf build dist *.egg-info frontend/dist
