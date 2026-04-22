# Security Measures - Relative Pointing App

## Overview

This document outlines the security measures implemented to protect the Relative Pointing application from abuse, brute force attacks, and unauthorized access.

## 1. Rate Limiting

### Purpose

Rate limiting prevents attackers from making excessive requests to the API,
dampens brute-force attempts against room codes, and reduces the blast
radius of a single abusive client.

### Current Implementation

**General limiter** — defined in `server/server.js`, applied to all `/api/*` routes:

- **Window:** 15 minutes
- **Limit:** 1000 requests per IP
- **Applied to:** All `/api/*` routes
- **Exceptions:**
  - `/api/health` (never rate limited)
  - All requests when `NODE_ENV === 'test'` (for Playwright e2e runs)
- **Response when exceeded:** HTTP 429 with a "Too many requests…" message
- **Headers:** standard `RateLimit-*` headers (not legacy `X-RateLimit-*`)

```
15 minutes ≈ 1000 requests → ~66 req/min average per IP
```

> **Note:** earlier revisions of this doc described per-endpoint limiters
> for `POST /api/sessions` (create) and `POST /api/sessions/:roomCode/join`
> (join). Those are **not currently implemented** — there is a single
> global limiter only. The session-join limiter in particular is a
> sensible future hardening step; see §8.

### How It Works

- Each request is tracked by IP address via `express-rate-limit`
- The app sets `app.set('trust proxy', 1)` so IP extraction works behind one
  reverse proxy layer (nginx, ALB, Cloudflare). IP is taken from
  `X-Forwarded-For`; falls back to the socket address
- When the limit is exceeded, the server responds with 429 and a message
- Rate-limit state is in-memory per process — single-node only. If you ever
  scale past one backend instance, move to a shared store (Redis) or the
  limit becomes per-instance, not per-cluster

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

**Location:**

- **Container (docker compose):** plain-text files at `./logs/app-YYYY-MM-DD.log`
  on the host (bind-mount from `/var/log/app`), plus the same stream on stdout
  via `docker logs`
- **ECS:** configure the `awslogs` driver in the task definition to ship stdout
  to CloudWatch Logs. If you also want file-based logs in-task, mount an EFS
  volume at `/var/log/app` and set `LOG_DIR=/var/log/app`
- **EC2 (legacy):** systemd/journalctl as documented in `DEPLOYMENT.md`

### What Logs Contain (privacy note)

The application logs include:

- Timestamps, HTTP method and path
- Client IP (from `X-Forwarded-For` or socket)
- Participant names and room codes in presence-check decisions
  (auto-skip, auto-transfer ownership)

The logs do **not** include session contents (task titles, descriptions,
comments, or point assignments). Because the logs persist while session
contents are purged, the IP ↔ name ↔ room-code correlation outlives the
session data. If this retention window is a concern (e.g. GDPR, internal
policy), redact IPs/names before writing or rotate aggressively.

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

## 5. Brute Force Protection — Current Behavior

### Scenario 1: Guessing Room Codes

**Attack:** Attacker rapidly requests random room codes.

**Result:**

- Up to 1000 requests in a 15-minute window succeed (or return 404 for
  unknown codes / 400 for malformed ones)
- Request 1001+: `429 Too Many Requests`
- **Caveat:** 1000 tries per window is still a lot against the room-code
  namespace. If this becomes a concern, add a dedicated per-route limiter on
  `POST /api/sessions/:roomCode/join` (~10/15min) — see §8

### Scenario 2: Invalid Input Attempts

**Attack:** Attacker sends malformed room codes or IDs

**Result:**

- Request rejected with `400 Bad Request`
- Security warning logged
- Counts toward general rate limit

---

## 6. Container Security Posture

The production Docker image (`Dockerfile` + `docker-compose.yml`) is hardened
as follows. Keep these in mind when wiring the image up on ECS — most can be
expressed as ECS task-definition fields.

| Control                    | How                                                                          | Why it matters                                             |
| -------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Non-root runtime           | `USER node` (uid 1000)                                                       | Container escape ≠ host root                               |
| Read-only root filesystem  | `read_only: true`                                                            | Write-based malware / tampering blocked                    |
| No new privileges          | `security_opt: no-new-privileges`                                            | setuid binaries can't elevate                              |
| Dropped Linux capabilities | `cap_drop: [ALL]`                                                            | No raw sockets, no chroot, no setuid — not needed by Node  |
| Ephemeral SQLite (tmpfs)   | `/data` and `/tmp` mounted as RAM-backed tmpfs with `noexec,nosuid,uid=1000` | **Session data never touches disk**; nothing to exfiltrate |
| Multi-stage build          | Build tools (python3/make/g++) only in builder stage                         | Runtime image is smaller and has no compiler toolchain     |
| Init process               | `tini` as PID 1                                                              | Clean signal forwarding + zombie reaping on `docker stop`  |
| Liveness signal            | Healthcheck hits `/api/health` every 30s                                     | Orchestrator restarts unhealthy tasks                      |
| Secrets excluded           | `.dockerignore` excludes `.env*`, DBs, test artifacts                        | Build context can't leak credentials into image layers     |

**Caveat — healthcheck scope:** `/api/health` currently only confirms the
HTTP server is responsive, _not_ that the database opened successfully. If
SQLite init fails, the container will still report healthy while API calls
fail. Before production, consider making `/api/health` probe the DB.

**Ephemeral-by-design note:** the tmpfs is not just a performance choice —
it's the core of the data-minimization story. CSV imports from Jira may
contain confidential ticket content; by running the DB entirely in RAM and
discarding it on container stop (and at `15 min` inactivity, and on explicit
"Finish & Discard"), the app guarantees no long-lived copy of session
contents exists on the host.

---

## 7. Best Practices for Deployment

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

## 8. Monitoring & Alerting

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

## 9. Future Security Enhancements

Possible future improvements:

- [ ] Per-endpoint rate limiters (tighter caps on join/create) — see §1 caveat
- [ ] Make `/api/health` probe the DB, not just the HTTP server — see §6 caveat
- [ ] JWT-based authentication
- [ ] Room code expiration (destroy old sessions beyond inactivity timeout)
- [ ] CAPTCHA for repeated failures
- [ ] Bot detection (User-Agent validation)
- [ ] Database-backed rate limiting (Redis) — required before horizontal scale-out
- [ ] DDoS protection at the edge (Cloudflare, AWS Shield, ALB rules)
- [ ] Audit logging to separate sink (CloudWatch, etc.)
- [ ] Admin dashboard for monitoring

---

## 10. Incident Response

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

## 11. Security Testing

### Test Rate Limiting

Health checks are exempt, so hammer a real endpoint instead:

```bash
# Fire 1100 requests at /api/sessions (the general limiter caps at 1000 / 15 min).
# Run against a non-test NODE_ENV — tests bypass the limiter on purpose.
for i in $(seq 1 1100); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:5001/api/sessions \
    -H 'Content-Type: application/json' \
    -d '{"creatorId":"00000000-0000-4000-8000-000000000000","creatorName":"t"}'
done | sort | uniq -c

# Should show ~1000 × 200 and then 429s.
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

## 12. Security Headers Reference

| Header                    | Purpose                   | Value            |
| ------------------------- | ------------------------- | ---------------- |
| Strict-Transport-Security | Force HTTPS               | max-age=31536000 |
| X-Content-Type-Options    | Prevent MIME sniffing     | nosniff          |
| X-Frame-Options           | Prevent clickjacking      | SAMEORIGIN       |
| Content-Security-Policy   | Restrict resource loading | (recommended)    |

---

## 13. Questions or Issues?

If you discover a security vulnerability:

1. **DO NOT** post it publicly
2. Contact the development team privately
3. Provide detailed reproduction steps
4. Allow 90 days for a fix before disclosure

---

## Version History

- **v1.1** — Container hardening + doc reconciliation (2026-04-21)
  - Corrected general rate limit (1000/15min, not 100) and removed claims
    about per-endpoint join/create limiters that were never implemented
  - Added §6: container security posture (non-root, read-only FS, tmpfs,
    `cap_drop: ALL`, no-new-privileges, multi-stage build, tini)
  - Documented ephemeral-by-design data lifecycle (SQLite in RAM, purged on
    "Finish & Discard", 15-min inactivity, or container stop)
  - Flagged `/api/health` DB-scope caveat for future hardening
- **v1.0** — Initial security implementation (2024-01-15)
  - General rate limiting
  - Input validation
  - Security logging
  - IP address handling
