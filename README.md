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
- `GET /api/chat/history` – previous chat messages stored on the server
- `POST /api/chat` – send a chat conversation and receive a reply

## Deployment

A `Dockerfile` is provided for container builds. CI and deployment workflows are in `.github/workflows`.

## Notes

Container and pod data is collected from the local Docker or Rancher engine. Ensure the host exposes `/var/run/docker.sock` or the Windows named pipe for the app to retrieve real metrics.
