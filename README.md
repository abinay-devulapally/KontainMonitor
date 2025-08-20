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

## Run as a Container (with monitoring)

When running the app inside a container, it cannot see your host's Docker or Kubernetes by default. Mount the appropriate sockets/configs or point `DOCKER_HOST` to a reachable endpoint.

- Linux/macOS (Docker socket + kubeconfig):

  ```bash
  docker run --rm -p 3000:3000 \
    -e GOOGLE_API_KEY=your_key_here \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v $HOME/.kube/config:/root/.kube/config:ro \
    ghcr.io/abinay-devulapally/kontainmonitor:latest
  ```

- Podman (user socket):

  ```bash
  export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock
  podman system service --time=0 &
  docker run --rm -p 3000:3000 \
    -e GOOGLE_API_KEY=your_key_here \
    -e DOCKER_HOST="$DOCKER_HOST" \
    -v /run/user/$(id -u)/podman/podman.sock:/run/user/$(id -u)/podman/podman.sock \
    ghcr.io/abinay-devulapally/kontainmonitor:latest
  ```

- Windows (Docker Desktop):
  - For Linux containers, the Windows named pipe cannot be directly mounted into a Linux container. Use a TCP `DOCKER_HOST` (enable "Expose daemon on tcp://localhost:2375 without TLS" in Docker Desktop settings), then:

    ```powershell
    docker run --rm -p 3000:3000 \
      -e GOOGLE_API_KEY=your_key_here \
      -e DOCKER_HOST=tcp://host.docker.internal:2375 \
      ghcr.io/abinay-devulapally/kontainmonitor:latest
    ```

  - For Windows containers, map the named pipe:

    ```powershell
    docker run --rm -p 3000:3000 \
      -e GOOGLE_API_KEY=your_key_here \
      -v \\./pipe/docker_engine:\\./pipe/docker_engine \
      ghcr.io/abinay-devulapally/kontainmonitor:latest
    ```

If you do not mount a Docker socket or set `DOCKER_HOST`, the Containers page will be empty. Similarly, to see Pods, mount your kubeconfig or run the container inside a cluster with in-cluster config available.

### Enabling container actions (start/stop/restart/delete)

- By default, actions are disabled for safety. To enable:

  - Local dev: create `.env.local` with:

    ```env
    ALLOW_CONTAINER_ACTIONS=true
    ```

  - Docker: pass `-e ALLOW_CONTAINER_ACTIONS=true`.

- The UI disables buttons and shows a banner if actions are off or the engine is unreachable.
