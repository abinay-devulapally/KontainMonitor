#!/bin/bash

# KontainMonitor Docker Connectivity Diagnostic Script
set -e

echo "🔍 KontainMonitor Docker Connectivity Diagnostic"
echo "==============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# System info
PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
log_info "Platform: $PLATFORM ($(uname -m))"
log_info "User: $(whoami)"

# Check Docker
echo ""
log_info "Checking Docker installation..."

if command -v docker &> /dev/null; then
    log_success "Docker CLI found: $(docker --version)"
    
    if docker info &> /dev/null; then
        log_success "Docker daemon is running"
        
        # Check socket permissions (Linux only)
        if [[ "$PLATFORM" == "linux" ]]; then
            SOCKET_PATH="/var/run/docker.sock"
            if [[ -S "$SOCKET_PATH" ]]; then
                SOCKET_PERMS=$(ls -la "$SOCKET_PATH")
                log_info "Socket: $SOCKET_PERMS"
                
                if [[ -r "$SOCKET_PATH" && -w "$SOCKET_PATH" ]]; then
                    log_success "Docker socket is accessible"
                else
                    log_warning "Socket permissions restricted"
                    log_info "Fix: sudo usermod -aG docker \$USER && newgrp docker"
                fi
            fi
        fi
    else
        log_error "Docker daemon not accessible"
        log_info "Fix: sudo systemctl start docker"
        exit 1
    fi
else
    log_error "Docker CLI not found"
    exit 1
fi

# Test container connectivity
echo ""
log_info "Testing container-to-Docker connectivity..."

if docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock:ro \
    --entrypoint /bin/sh \
    docker:latest \
    -c "docker ps > /dev/null 2>&1 && echo 'Container can access Docker' || exit 1" > /dev/null 2>&1; then
    log_success "Container can access Docker daemon"
else
    log_error "Container cannot access Docker daemon"
    echo ""
    log_info "Solutions:"
    echo "1. Mount socket: -v /var/run/docker.sock:/var/run/docker.sock:ro"
    echo "2. Fix permissions: sudo usermod -aG docker \$USER"
    echo "3. For Windows: -e DOCKER_HOST=tcp://host.docker.internal:2375"
    exit 1
fi

# Check KontainMonitor
echo ""
log_info "Checking KontainMonitor status..."

if curl -f http://localhost:3000/api/health &> /dev/null; then
    log_success "KontainMonitor is running"
    
    # Check Docker in app
    if curl -s http://localhost:3000/api/env | grep -q '"available":true'; then
        log_success "KontainMonitor can access Docker"
    else
        log_warning "KontainMonitor cannot access Docker"
    fi
else
    log_warning "KontainMonitor not running"
    log_info "Start with: docker-compose up -d"
fi

echo ""
log_success "Diagnostic complete!"
echo ""
log_info "Quick commands:"
echo "• Deploy: docker-compose up -d"
echo "• Health: curl http://localhost:3000/api/health"
echo "• Environment: curl http://localhost:3000/api/env"
echo "• Containers: curl http://localhost:3000/api/containers"