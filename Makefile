.PHONY: help up down restart logs status build clean

SHELL := /bin/bash

help:
	@echo "Megalodon Production Management"
	@echo "----------------------------------------------------"
	@echo "make up        Build and start all production services in background"
	@echo "make down      Stop and terminate all production services"
	@echo "make restart   Restart all production services"
	@echo "make logs      Tail live logs from all containers"
	@echo "make status    Display status of all Megalodon services"
	@echo "make clean     Remove temporary build caches and dangling images"

up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

status:
	docker compose ps

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	rm -rf build dist *.egg-info frontend/dist
