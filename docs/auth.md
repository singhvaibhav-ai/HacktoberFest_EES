# Authentication

This document describes how authentication works in HacktoberFest_EES (CodeArena).

## Overview
HacktoberFest_EES uses **team-based** authentication. A "user" is a *team* (e.g. "Team Ohm"). Each team registers once with a team name and a password, then logs in to submit solutions to problems.

## Endpoints

| Method | Route               | Purpose                                |
|--------|---------------------|----------------------------------------|
| POST   | `/api/auth/signup`  | Register a new team and start session  |
| POST   | `/api/auth/login`   | Authenticate an existing team          |
| POST   | `/api/auth/logout`  | Invalidate session and clear cookie    |
| GET    | `/api/auth/me`      | Get current logged-in team details     |

### POST /api/auth/signup
**Request**
```json
{ "username": "Team Ohm", "password": "secret123" }
```
**Responses**
- `201 Created` — team registered successfully; session cookie set
  ```json
  { "username": "Team Ohm" }
  ```
- `400 Bad Request` — missing team name or password
  ```json
  { "error": "Team name and password are required" }
  ```
- `409 Conflict` — team name is already taken
  ```json
  { "error": "That team name is taken" }
  ```

### POST /api/auth/login
**Request**
```json
{ "username": "Team Ohm", "password": "secret123" }
```
**Responses**
- `200 OK` — login successful; session cookie set
  ```json
  { "username": "Team Ohm" }
  ```
- `400 Bad Request` — missing team name or password
  ```json
  { "error": "Team name and password are required" }
  ```
- `401 Unauthorized` — invalid credentials
  ```json
  { "error": "Invalid credentials" }
  ```
- `429 Too Many Requests` — locked out due to too many failed attempts (includes `Retry-After` header with seconds remaining)
  ```json
  { "error": "Too many failed login attempts. Please try again in 15 minute(s)." }
  ```

### POST /api/auth/logout
**Responses**
- `200 OK` — session destroyed server-side and cookie cleared
  ```json
  { "ok": true }
  ```

### GET /api/auth/me
**Responses**
- `200 OK` — returns `{ "username": "Team Ohm" }` if authenticated, or `null` if unauthenticated.

## Session Handling
- On successful signup or login, an HTTP-only cookie named `codearena_session` is set (with `SameSite: Lax` and a 24-hour expiration).
- Sessions are stored in server memory (`Map<token, username>`).
- The `currentUser` middleware inspects the cookie and populates `req.user = { username }` on incoming requests.
- Protected endpoints (such as `POST /api/submissions`) use the `requireLogin` middleware, which rejects unauthenticated requests with `401 Unauthorized`.
- `/api/auth/logout` invalidates the session token in the server-side map and clears the cookie.

## Rate Limiting & Brute-Force Protection (#60)
- The `/api/auth/login` endpoint is protected against brute-force password guessing by rate limiting failed attempts.
- Attempts are tracked using a composite key of the **client IP** and **normalized team name** (`ip|team`). This ensures attackers cannot lock out other teams sharing the same network (e.g., at an in-person hackathon), while also preventing denial-of-service against a legitimate team from an external IP.
- **Threshold**: 5 failed login attempts within a 15-minute window.
- **Lockout**: After 5 failed attempts, subsequent login requests receive a `429 Too Many Requests` response with a `Retry-After` header indicating remaining lockout time in seconds.
- **Reset**: A successful login or expiration of the window resets the counter.

## Password Storage
> ⚠️ Known limitation tracked in #57 / #59:
> Passwords are currently stored in plain text in `server/data/db.json`. They should be hashed (e.g., using bcrypt or argon2) before storage.

## Error Messages & Security (#51, #53)
- Failed logins return a generic `401 Unauthorized` (`Invalid credentials`) without revealing whether the team name exists, preventing account enumeration (#51).
- Rate-limited responses return `429 Too Many Requests` with a `Retry-After` header (#60).

## Case Sensitivity Note (#52)
Team names are treated case-sensitively in user storage. Team name normalization is tracked in #52. For rate-limiting purposes, team names are normalized to lowercase to prevent circumventing lockout via casing variations.

## Adding / Changing Authentication
1. Update routes in `server/auth.js`.
2. Keep response shapes backward-compatible.
3. Run tests using `node --test server/*.js`.
