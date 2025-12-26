Talk to a lazy cat voice assistant who might help you or not help you.

<img width="1212" height="711" alt="cat" src="https://github.com/user-attachments/assets/25fa9c2b-f8ba-4550-8377-420b99b1e6d7" />

## Structure

A monorepo project for XAI Voice WebRTC integration with a Hono server and Vite + React client.

## Structure

```
packages/
├── client/   # Vite + React frontend
└── server/   # Hono backend with WebRTC/WebSocket support
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp packages/server/.env.example packages/server/.env
# Edit .env with your XAI_API_KEY

# Start development servers
pnpm dev:server   # http://localhost:8000
pnpm dev:client   # http://localhost:5173
```

## Environment Variables

Create a `.env` file in `packages/server/`:

| Variable | Description | Default |
|----------|-------------|---------|
| `XAI_API_KEY` | Your XAI API key | Required |
| `API_URL` | XAI realtime API URL | `wss://api.x.ai/v1/realtime` |
| `PORT` | Server port | `8000` |
| `VOICE` | Voice model to use | `sal` |
| `INSTRUCTIONS` | System instructions for the voice assistant | Default prompt |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000,http://localhost:5173,http://localhost:8080` |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/session` | POST | Get ephemeral token for direct XAI API connection |
| `/sessions` | GET | List all active sessions |
| `/sessions` | POST | Create a new WebRTC session |
| `/sessions/:id` | DELETE | Delete a session |
| `/sessions/:id/stats` | GET | Get WebRTC stats for a session |
| `/signaling/:id` | WebSocket | WebRTC signaling endpoint |

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
