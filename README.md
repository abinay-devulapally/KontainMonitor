# KontainMonitor

A Next.js dashboard for inspecting local Docker or Rancher containers and Kubernetes pods. The app also includes an AI chat assistant and configurable settings.

## Development

```bash
npm install
npm run dev
```

## API Endpoints

### Containers
- `GET /api/containers` – list all containers
- `GET /api/containers/<id>` – detailed info with CPU and memory history
- `GET /api/containers/<id>/metrics` – current CPU and memory percentages
- `POST /api/containers/<id>` – perform an action using `{ "action": "start|stop|restart|pause|unpause|delete" }`

Example requests:

```bash
curl http://localhost:3000/api/containers
curl http://localhost:3000/api/containers/<id>
curl http://localhost:3000/api/containers/<id>/metrics
curl -X POST http://localhost:3000/api/containers/<id> \
  -H 'Content-Type: application/json' \
  -d '{"action":"restart"}'
```

### Chat
- `POST /api/chat` – send a chat conversation and receive a reply. Accepts `{ messages, model?, sessionId? }`. Uses server env `GOOGLE_API_KEY` if client key not provided.
- `GET /api/chat/history` – legacy endpoint returning latest session messages (backward compatible)
- `GET /api/chat/sessions` – list chat sessions
- `POST /api/chat/sessions` – create a session `{ title? }`
- `GET /api/chat/sessions/:id` – get messages of a session
- `PATCH /api/chat/sessions/:id` – rename `{ title }`
- `DELETE /api/chat/sessions/:id` – delete session

## Deployment

A `Dockerfile` is provided for container builds. CI and deployment workflows are in `.github/workflows`.

Environment variables:
- `GOOGLE_API_KEY` – server-side default key for chat (recommended)
- `ALLOW_CONTAINER_ACTIONS` – set to `true` to enable start/stop/restart/pause/delete endpoints

Persistence:
- Chat history is stored in `data/chat-history.json`. Use a persistent volume in production or switch to a database.

## Notes

Container and pod data is collected from the local Docker or Rancher engine. Ensure the host exposes `/var/run/docker.sock` or the Windows named pipe for the app to retrieve real metrics.
