# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in KontainMonitor, please report it responsibly:

1. **Do not** create a public GitHub issue for security vulnerabilities
2. Email the maintainers with details of the vulnerability
3. Include steps to reproduce the issue
4. Allow time for the issue to be addressed before public disclosure

## Security Features

### Authentication & Authorization
- API key validation for AI services
- Rate limiting on all API endpoints
- Input validation using Zod schemas
- CORS protection

### Container Security
- Non-root user execution (UID 1001)
- Read-only Docker socket access
- Minimal container privileges
- Security capabilities dropped

### Data Protection
- No sensitive data logged
- API keys never exposed in responses
- Input sanitization for XSS prevention
- Secure headers implementation

### Network Security
- Security headers (CSP, HSTS, etc.)
- Rate limiting per IP address
- Request size limits
- Timeout protection

## Security Best Practices

### Deployment
1. **Use environment variables** for all secrets
2. **Enable rate limiting** in production
3. **Mount Docker socket as read-only** when possible
4. **Use HTTPS** in production environments
5. **Regularly update dependencies**
6. **Monitor application logs** for suspicious activity

### API Keys
1. **Rotate API keys** regularly
2. **Use server-side API keys** when possible
3. **Validate API key format** before use
4. **Never commit API keys** to version control

### Container Security
1. **Run as non-root user**
2. **Use minimal base images**
3. **Scan images for vulnerabilities**
4. **Limit container capabilities**
5. **Use read-only filesystems** where possible

## Security Headers

The application automatically sets the following security headers:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Rate Limiting

Default rate limits:
- Chat API: 60 requests per minute per IP
- Session creation: 30 requests per minute per IP
- General API: 60 requests per minute per IP

Configure via environment variables:
```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

## Vulnerability Response

We are committed to addressing security vulnerabilities promptly:

1. **Assessment**: Within 24 hours of report
2. **Acknowledgment**: Within 48 hours
3. **Fix Development**: Target 7 days for critical issues
4. **Release**: Security patches released ASAP
5. **Disclosure**: Coordinated disclosure after fix

## Security Checklist for Deployment

- [ ] Environment variables configured securely
- [ ] HTTPS enabled for production
- [ ] Rate limiting enabled
- [ ] Docker socket mounted as read-only
- [ ] Regular dependency updates scheduled
- [ ] Log monitoring configured
- [ ] Health checks enabled
- [ ] Backup strategy implemented
- [ ] Incident response plan in place

## Contact

For security-related inquiries, please contact the maintainers through the project's official communication channels.