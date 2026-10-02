# Contributing to Megalodon

Thank you for your interest in contributing to Megalodon! As an open-source, self-hosted API security, traffic management, and network visibility platform, community contributions help keep Megalodon secure, performant, and reliable.

## Code of Conduct

Please read and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md) in all community interactions.

## Development Workflow

### Prerequisites
- Python 3.12+
- Node.js 20+ & npm
- Docker and Docker Compose
- Git

### Local Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/megalodon/megalodon.git
   cd megalodon
   ```

2. Set up environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Python Backend Environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e "./backend[dev]"
   pip install -e "./network-agent"
   pip install -e "./cli"
   ```

4. Frontend Environment:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Running with Docker Compose:
   ```bash
   docker compose up -d
   ```

## Pull Request Guidelines

1. Create a feature branch: `git checkout -b feature/my-new-feature`
2. Follow Python PEP 8, formatted with `ruff` and typed with `mypy`.
3. Follow React/TypeScript strict guidelines with ESLint and Prettier.
4. Ensure all tests pass: `pytest` and `npm test`.
5. Write unit and integration tests for new functionality.
6. Submit a Pull Request targeting the `main` branch with a clear description of the problem and solution.

## Reporting Bugs and Requesting Features

Use the GitHub Issues tracker to report bugs and suggest features. For potential security vulnerabilities, see our [Security Policy](SECURITY.md).
