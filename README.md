# XAI Avatar

A monorepo project with Hono server and Vite + React client.

## Structure

```
packages/
├── client/   # Vite + React frontend
└── server/   # Hono backend
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev:server   # http://localhost:3001
pnpm dev:client   # http://localhost:5173
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:server` | Start Hono dev server |
| `pnpm dev:client` | Start Vite dev server |
| `pnpm build:server` | Build server |
| `pnpm build:client` | Build client |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint errors |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Check formatting |
