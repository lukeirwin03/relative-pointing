# Security Measures - Relative Pointing App

## Overview

This document outlines the security measures implemented to protect the Relative Pointing application from abuse, brute force attacks, and unauthorized access.

## 1. Rate Limiting

### Purpose

Rate limiting prevents attackers from making excessive requests to the API, protecting against brute force attacks on room codes and session takeover attempts.

### Implementation Details

#### General Rate Limiting

- **Window:** 15 minutes
- **Limit:** 100 requests per IP
- **Applied to:** All `/api/*` routes
- **Exception:** `/api/health` (health checks are not rate limited)

```
15 minutes = 100 requests maximum
Average: ~6.67 requests per minute
```

#### Session Join Rate Limiting (Stricter)

- **Window:** 15 minutes
- **Limit:** 10 join attempts per IP
- **Applied to:** `POST /api/sessions/:roomCode/join`
- **Purpose:** Prevent brute force attacks on room codes
- **Response:** HTTP 429 (Too Many Requests)

```
Blocks attackers trying more than 10 room codes in 15 minutes
```

#### Session Creation Rate Limiting

- **Window:** 1 hour
- **Limit:** 5 session creations per IP
- **Applied to:** `POST /api/sessions`
- **Purpose:** Prevent spam session creation
- **Response:** HTTP 429 (Too Many Requests)

```
Maximum 5 new sessions per IP per hour
```

### How It Works

- Each request is tracked by IP address
- IP extracted from `X-Forwarded-For` header (for proxied requests) or direct socket
- When limit is exceeded, server responds with 429 status code
- Client receives clear error message to try again later

---

## 2. Input Validation

### Room Code Validation

Room codes must match the pattern: `[a-z0-9]+-[a-z0-9]+(-[a-z0-9]+)?`

Examples of valid room codes:

- `happy-cat`
- `blue-elephant-123`
- `app-test-1`

Examples of invalid room codes (rejected):

- `happycat` (no dash)
- `!!!` (special characters)
- `room-code-with-many-dashes-here` (excessive)
- `../../../etc/passwd` (path traversal attempt)

### User ID Validation

User IDs must be valid UUIDs in format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

- Invalid IDs are logged as security warnings
- Invalid requests are rejected with HTTP 400

### Username Validation

- Length: 1-100 characters
- No validation on content (allows special characters, spaces, unicode)
- Trim whitespace on both ends

### Request Type Validation

All input parameters are type-checked:

- `creatorId` must be string
- `creatorName` must be string
- `userId` must be string
- `userName` must be string

---

## 3. Security Logging

### Enhanced Logging Format

All requests are logged with:

```
[TIMESTAMP] METHOD PATH - IP: IP_ADDRESS
```

Example:

```
[2024-01-15T10:30:45.123Z] POST /api/sessions/happy-cat/join - IP: 192.168.1.100
```

### Security Alert Logging

Suspicious activities are logged with `[SECURITY]` prefix:

```
[SECURITY] Rate limit exceeded for IP: 192.168.1.100 - Path: /api/sessions/happy-cat/join
[SECURITY] Invalid room code format attempted: ../../../
[SECURITY] Invalid userId format attempted: not-a-uuid
```

### Log Review

Monitor logs regularly for:

- Repeated rate limit violations from same IP
- Invalid input format attempts
- Unusual access patterns

Location: Check your application logs (PM2, systemd, or custom logging)

---

## 4. IP Address Handling

### Proxy Support

Rate limiting correctly handles proxied requests through:

- Nginx reverse proxy
- AWS Load Balancer
- Cloudflare

The system reads:

1. `X-Forwarded-For` header (if available)
2. Direct socket IP (if not proxied)

### Configuration

If behind a proxy, ensure your proxy sets `X-Forwarded-For` header correctly.

**Nginx example:**

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```

---

## 5. Brute Force Protection Examples

### Scenario 1: Attempting to Guess Room Codes

**Attack:** User tries 20 different room codes in 10 minutes

**Result:**

- First 10 attempts: Succeed (or fail with "not found")
- 11th attempt: `429 Too Many Requests`
- Attacker blocked for 15 minutes

### Scenario 2: Attempting Session Spam

**Attack:** Script creates 10 sessions in 5 minutes

**Result:**

- First 5 sessions: Created successfully
- 6th session: `429 Too Many Requests`
- Attacker blocked for 1 hour

### Scenario 3: Invalid Input Attempts

**Attack:** Attacker sends malformed room codes or IDs

**Result:**

- Request rejected with `400 Bad Request`
- Security warning logged
- Counts toward general rate limit

---

## 6. Best Practices for Deployment

### Production Checklist

- [ ] Review server logs daily for security warnings
- [ ] Monitor rate limit violations
- [ ] Keep Node.js and dependencies updated
- [ ] Use HTTPS/SSL (Let's Encrypt recommended)
- [ ] Enable firewall (ufw, AWS Security Groups)
- [ ] Disable SSH password authentication
- [ ] Use key-pair SSH authentication only
- [ ] Run application as non-root user
- [ ] Set up regular database backups
- [ ] Monitor server resources (CPU, memory, disk)

### Environment Variables

Set these in production (`.env`):

```
NODE_ENV=production
PORT=5001
```

### Response Headers

The application sets these security headers (in Nginx):

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
```

---

## 7. Monitoring & Alerting

### What to Monitor

- Rate limit 429 responses (>5 per hour = suspicious)
- Invalid input rejection rate
- Server CPU and memory usage
- Database connection pool

### Setting Up Alerts

Example alert rule: "If 10+ rate limit violations from single IP in 1 hour, investigate"

### Log Aggregation

For production, consider using:

- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- CloudWatch (AWS)
- Datadog
- New Relic

---

## 8. Future Security Enhancements

Possible future improvements:

- [ ] JWT-based authentication
- [ ] Room code expiration (destroy old sessions)
- [ ] CAPTCHA for repeated failures
- [ ] Bot detection (User-Agent validation)
- [ ] Database-backed rate limiting (for multi-server deployments)
- [ ] DDoS protection (Cloudflare, AWS Shield)
- [ ] Audit logging to separate log file
- [ ] Admin dashboard for monitoring

---

## 9. Incident Response

### If You Detect an Attack

**Step 1: Identify the Attack Source**

```bash
# Check logs for suspicious IPs
grep "\[SECURITY\]" server.log | head -20
```

**Step 2: Block at Firewall Level (Temporary)**

```bash
# If attacker IP is 192.168.1.100
sudo ufw deny from 192.168.1.100
```

**Step 3: Investigate and Document**

- Note the time of attack
- Save relevant logs
- Check if sessions were compromised
- Review for any data exfiltration

**Step 4: Restore if Needed**

```bash
# Remove firewall block
sudo ufw delete deny from 192.168.1.100
```

---

## 10. Security Testing

### Test Rate Limiting

```bash
# Run 15 requests rapidly
for i in {1..15}; do
  curl -s http://localhost:5001/api/health
done

# Should see 429 on requests 11-15
```

### Test Input Validation

```bash
# Invalid room code
curl -X POST http://localhost:5001/api/sessions/../..//join \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","userName":"test"}'

# Should return 400 Bad Request
```

### Test with ab (Apache Bench)

```bash
# Generate load
ab -n 50 -c 5 http://localhost:5001/api/health

# Monitor how many requests fail with 429
```

---

## 11. Security Headers Reference

| Header                    | Purpose                   | Value            |
| ------------------------- | ------------------------- | ---------------- |
| Strict-Transport-Security | Force HTTPS               | max-age=31536000 |
| X-Content-Type-Options    | Prevent MIME sniffing     | nosniff          |
| X-Frame-Options           | Prevent clickjacking      | SAMEORIGIN       |
| Content-Security-Policy   | Restrict resource loading | (recommended)    |

---

## 12. Questions or Issues?

If you discover a security vulnerability:

1. **DO NOT** post it publicly
2. Contact the development team privately
3. Provide detailed reproduction steps
4. Allow 90 days for a fix before disclosure

---

## Version History

- **v1.0** - Initial security implementation (2024-01-15)
  - Rate limiting (general, join, create)
  - Input validation
  - Security logging
  - IP address handling
