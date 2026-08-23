# ChainGuard Backend

Node.js + Express + MongoDB API for the ChainGuard evidence management system.
This is Step 1 of the build plan: real authentication and evidence storage,
replacing the mocks in the frontend's `src/services/api.js`.

## Setup

1. Copy the example env file and edit it:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set `JWT_SECRET` to any long random string (this signs your login tokens).

2. Install dependencies:
   ```bash
   npm install
   ```

3. Make sure MongoDB is running locally (via MongoDB Compass/Service, or Docker —
   see the `docker-compose.yml` from earlier). Default expected URL:
   `mongodb://localhost:27017/chainguard`

4. Start the server:
   ```bash
   npm run dev
   ```
   You should see:
   ```
   ✅ Connected to MongoDB
   ✅ ChainGuard backend running at http://localhost:5000
   ```

5. Verify it's alive — open in browser or curl:
   ```
   http://localhost:5000/api/health
   ```
   Expected: `{"status":"ok","message":"ChainGuard backend is running"}`

## Endpoints built so far

| Method | Route | Auth required? | Purpose |
|---|---|---|---|
| GET | `/api/health` | No | Check server is running |
| POST | `/api/auth/register` | No | Create a user: `{ name, email, password, role }` |
| POST | `/api/auth/login` | No | Returns a JWT token: `{ email, password }` |
| POST | `/api/evidence/upload` | Yes (Bearer token) | Save a hashed evidence record: `{ caseId, fileName, fileHash }` |
| GET | `/api/evidence` | Yes (Bearer token) | List all evidence records |
| GET | `/api/evidence/:id` | Yes (Bearer token) | Get one evidence record |

For protected routes, send the token from login as a header:
```
Authorization: Bearer <token>
```

## How to verify it works (do this before connecting the frontend)

Use Postman, Thunder Client (VS Code extension), or curl:

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Cop","email":"test@chainguard.com","password":"pass1234","role":"police"}'

# 2. Login (copy the "token" from the response)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@chainguard.com","password":"pass1234"}'

# 3. Upload evidence (replace YOUR_TOKEN)
curl -X POST http://localhost:5000/api/evidence/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"caseId":"CASE-001","fileName":"photo.jpg","fileHash":"abc123"}'

# 4. List evidence (replace YOUR_TOKEN)
curl http://localhost:5000/api/evidence \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Then open **MongoDB Compass**, connect to `mongodb://localhost:27017`, and check
the `chainguard` database — you should see `users` and `evidences` collections
with real data in them.

## Next step: connect the frontend

In `chainguard/src/services/api.js`, replace the mock functions with real calls
to this API, e.g.:

```js
import axios from 'axios';
const client = axios.create({ baseURL: 'http://localhost:5000/api' });

export const login = (email, password) =>
  client.post('/auth/login', { email, password });

export const uploadEvidence = (data, token) =>
  client.post('/evidence/upload', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
```

We'll wire this up together once you've confirmed the backend works on its own.
