# KontainMonitor

🐳 **Production-Ready Container Monitoring Dashboard**

A Next.js application for monitoring Docker, Podman, Rancher containers and Kubernetes pods with an integrated AI chat assistant. Built with security, performance, and production deployment in mind.

## ✨ Features

- **Container Monitoring**: Real-time Docker/Podman/Rancher container monitoring
- **Kubernetes Support**: Pod monitoring and management
- **AI Chat Assistant**: Integrated DevOps/SRE assistance with Google AI
- **Resource Metrics**: CPU, memory, and network usage tracking
- **Container Actions**: Start, stop, restart, pause operations
- **Health Monitoring**: Built-in health checks and monitoring
- **Security First**: Rate limiting, input validation, non-root containers
- **Production Ready**: Optimized Docker images, logging, error handling

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Add your Google AI API key to .env.local
GOOGLE_API_KEY=your_actual_api_key_here

# Start development server
npm run dev
```

### Production with Docker Compose (Recommended)
```bash
# Clone repository
git clone <repository-url>
cd KontainMonitor

# Copy environment file
cp .env.example .env

# Set your API key
echo "GOOGLE_API_KEY=your_actual_api_key_here" >> .env

# Deploy with Docker Compose
npm run docker:compose

# Access at http://localhost:3000
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

## 🏗️ Deployment Options

### Option 1: Docker Compose (Production)
```bash
# Production deployment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Standalone Docker
```bash
# Build image
npm run docker:build

# Run container
docker run -d \
  --name kontain-monitor \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v $(pwd)/data:/app/data \
  -e GOOGLE_API_KEY=your_api_key_here \
  kontain-monitor
```

### Option 3: Manual Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

## ⚙️ Configuration

### Environment Variables
```bash
# Required
GOOGLE_API_KEY=your_google_ai_api_key_here

# Optional
NODE_ENV=production
PORT=3000
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
LOG_LEVEL=info
ALLOW_CONTAINER_ACTIONS=true
```

### Data Persistence
- Chat history: `./data/chat-history.json`
- Settings: `./data/settings.json`
- Use Docker volumes for production persistence

### Health Checks
- Health endpoint: `GET /api/health`
- Container health checks included
- Monitors Docker connectivity and filesystem access

## 🔒 Security Features

### Production Security
- **Non-root containers**: Runs as unprivileged user (UID 1001)
- **Input validation**: Zod schemas validate all API inputs
- **Rate limiting**: Configurable request limits per IP
- **Security headers**: XSS protection, CSRF prevention
- **API key validation**: Validates Google AI API key format
- **Docker socket**: Read-only access when possible

### Security Headers
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Best Practices
- Use environment variables for secrets
- Enable rate limiting in production
- Mount Docker socket as read-only when possible
- Regular security updates for dependencies

## 📊 Monitoring & Logging

### Health Monitoring
```bash
# Check application health
curl http://localhost:3000/api/health

# Check with Docker
docker exec kontain-monitor npm run health

# Monitor with Docker Compose
docker-compose ps
```

### Logging
- Structured JSON logging
- Error tracking with context
- Request/response logging
- Docker container logs available

### Metrics
- Container resource usage
- API response times
- Rate limit violations
- Health check status

## 🐛 Troubleshooting

### Common Issues

**Docker socket permission denied**
```bash
# Linux: Add user to docker group
sudo usermod -aG docker $USER

# Or run with sudo
sudo docker run ...
```

**API key issues**
```bash
# Verify API key format (should start with 'AI')
echo $GOOGLE_API_KEY | cut -c1-2

# Test API key
curl -H "Authorization: Bearer $GOOGLE_API_KEY" \
  https://generativelanguage.googleapis.com/v1beta/models
```

**Container not seeing host Docker**
```bash
# Verify Docker socket mount
docker exec -it kontain-monitor ls -la /var/run/docker.sock

# Check Docker connectivity
docker exec -it kontain-monitor curl -f http://localhost:3000/api/health
```

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
