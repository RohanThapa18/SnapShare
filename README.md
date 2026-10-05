# SnapShare

AI-powered event photo-sharing platform with face-recognition-based photo discovery ("Find My Photos"), built as a full-stack capstone project.

## Project Structure

```text
snapshare/
├── backend/              # Express API (Node.js, MongoDB, BullMQ, Cloudinary, Razorpay)
├── frontend/             # React + Vite + Tailwind
├── ai-service/            # Python + InsightFace face-recognition microservice
├── backend.Dockerfile     # Backend Docker image
├── frontend.Dockerfile    # Frontend Docker image
├── docker-compose.yml     # Full local development stack
└── README.md
```

## What's implemented

- **Auth**: JWT + bcrypt, protected routes, profile/password management. **No fixed account role** — anyone can create events, join others, or become a photographer, all from one account (Google-Classroom-style: "Create" or "Join", not a role picker at signup)

- **Per-event access model**: a user's relationship to any given event — organizer, photographer, or participant — is resolved per event from `EventParticipant`/`EventPhotographer`/`Event.organizerId`, never from a global account field. The same account can organize one event and just be a participant in another.

- **Events**: create/edit/delete, bcrypt-hashed passcodes (shown once, never persisted in plaintext), **two separate opaque QR tokens per event** — one for joining as a participant, one for joining as a photographer — participant management, event expiry (auto + lazy self-correction), organizer stats

- **Photographer assignment — two paths**: (1) organizer adds someone by email directly, or (2) organizer shares a separate photographer QR/link and anyone with it can self-assign as a photographer for that event. Both grant event-scoped upload access only — never access to other events.

- **Photo system**: Multer + Sharp processing (EXIF-stripping, compression, resizing) → Cloudinary → async AI processing via BullMQ, so uploads never block on face detection

- **Albums**: Official (photographer-only) and Community (participant-only), enforced server-side against the viewer's actual per-event relationship, not a global role

- **Find My Photos**: selfie → transient embedding (never stored) → cosine similarity search scoped strictly to the joined event, configurable `FACE_MATCH_THRESHOLD`, no raw embeddings ever leave the backend

- **Likes / Favourites / Downloads**: separate collections with unique compound indexes, no bloated arrays on Photo docs

- **Payments**: Razorpay order creation (server-computed amounts only), signature verification, Purchase entitlement records that remain valid after event expiry, earnings as a read-time aggregation over purchases where the user was the photographer (no wallet/payout system)

- **Dashboard**: a single unified endpoint/page reflecting whichever relationships a user actually has — organizing stats, photographing stats, and participating count — rather than separate role-gated dashboards

- **Tests**: Vitest + Supertest + mongodb-memory-server — auth, per-event ownership (including a test proving the same account can organize one event and just participate in another), photographer self-join via token, face-embedding privacy guarantees

- **Deployment configs**: `render.yaml` (backend + AI service + Redis), `vercel.json` (frontend), AI service `Dockerfile`, local `docker-compose.yml`

## What's intentionally NOT implemented (per approved scope)

- Organizer subscriptions / storage billing
- Photographer wallets or payout/withdrawal systems
- Chat, comments, social following
- Forgot-password flow (marked optional/future in the spec)

## Local Setup

### Prerequisites

- Docker Desktop
- Docker Compose
- A MongoDB Atlas cluster (free tier is fine)
- A Cloudinary account (free tier is fine)
- A Razorpay test account (for payment testing)

Node.js and Python do not need to be installed locally to run the Dockerized application.

### 1. Environment Variables

Before starting the containers, configure the environment files used by the services.

#### Backend

Create:

```text
backend/.env
```

Configure:

- `MONGO_URI` — your shared MongoDB Atlas connection string
- `JWT_SECRET` — any long random string
- `CLOUDINARY_CLOUD_NAME` — from your Cloudinary dashboard
- `CLOUDINARY_API_KEY` — from your Cloudinary dashboard
- `CLOUDINARY_API_SECRET` — from your Cloudinary dashboard
- `RAZORPAY_KEY_ID` — from your Razorpay test dashboard
- `RAZORPAY_KEY_SECRET` — from your Razorpay test dashboard
- `AI_SERVICE_SHARED_SECRET` — random shared secret matching the AI service configuration
- `FACE_MATCH_THRESHOLD` — start around `0.5`, tune against your own test photos

The following values are configured automatically by `docker-compose.yml`:

```text
REDIS_URL=redis://redis:6379
AI_SERVICE_URL=http://ai-service:8000
FRONTEND_URL=http://localhost:5173
```

Do not replace `redis` or `ai-service` with `localhost` inside the backend container. Docker Compose resolves these service names through the internal Docker network.

#### AI Service

Create:

```text
ai-service/.env
```

Configure the internal shared secret so that it matches:

```text
AI_SERVICE_SHARED_SECRET
```

from the backend configuration.

#### Frontend

The frontend API URL is configured directly by Docker Compose:

```text
VITE_API_URL=http://localhost:5000/api
```

No separate frontend `.env` file is required for the standard Docker Compose setup unless you need additional frontend-specific variables.

### 2. Start the Application with Docker

From the project root:

```bash
docker compose up --build
```

This starts the complete SnapShare stack:

```text
redis
ai-service
backend
frontend
```

To start the containers in the background:

```bash
docker compose up --build -d
```

Check the running containers:

```bash
docker compose ps
```

### 3. Access the Application

Once all containers are running:

- **Frontend** → `http://localhost:5173`
- **Backend API** → `http://localhost:5000`
- **Backend health check** → `http://localhost:5000/api/health`
- **AI service** → `http://localhost:8000`
- **Redis** → `localhost:6379`
- **Database** → MongoDB Atlas

Open:

```text
http://localhost:5173
```

in your browser to use SnapShare.

### 4. Docker Service Management

View logs for all services:

```bash
docker compose logs -f
```

View backend logs:

```bash
docker compose logs -f backend
```

View frontend logs:

```bash
docker compose logs -f frontend
```

View AI service logs:

```bash
docker compose logs -f ai-service
```

View Redis logs:

```bash
docker compose logs -f redis
```

Restart a specific service:

```bash
docker compose restart backend
```

Restart the complete stack:

```bash
docker compose restart
```

Stop the application:

```bash
docker compose down
```

Stop the application and remove Docker volumes:

```bash
docker compose down -v
```

> `docker compose down -v` removes the local `redis_data` and `insightface_models` volumes. The next startup may need to download the InsightFace model again.

### 5. Docker Compose Services

The local Docker environment consists of four services.

#### Redis

```text
redis:7-alpine
```

Used by BullMQ for asynchronous photo/AI processing.

Persistent Redis data is stored in:

```text
redis_data
```

#### AI Service

Built from:

```text
./ai-service
```

The service runs InsightFace for face detection and face embedding generation.

The InsightFace model cache is persisted using:

```text
insightface_models
```

The service is available locally at:

```text
http://localhost:8000
```

#### Backend

Built from:

```text
./backend
```

using:

```text
backend.Dockerfile
```

The backend runs on:

```text
http://localhost:5000
```

Inside Docker, the backend communicates with:

```text
Redis      → redis://redis:6379
AI Service → http://ai-service:8000
```

The backend connects to the shared MongoDB Atlas database using `MONGO_URI` from:

```text
backend/.env
```

#### Frontend

Built from:

```text
./frontend
```

using:

```text
frontend.Dockerfile
```

The frontend runs on:

```text
http://localhost:5173
```

The browser communicates with the backend through:

```text
http://localhost:5000/api
```

### 6. Running a Specific Service

You can also start individual services when debugging.

Start Redis:

```bash
docker compose up redis
```

Start the AI service:

```bash
docker compose up ai-service
```

Start the backend:

```bash
docker compose up backend
```

Start the frontend:

```bash
docker compose up frontend
```

For normal development, it is recommended to start the complete stack:

```bash
docker compose up --build
```

## Latest round of changes

- **Navigation**: back button on every inner page (event details, profile, purchases, create event)

- **Leave event**: available to participants and photographers (not organizers, who delete instead); removes both relationship types so a photographer who leaves also drops their participant access

- **Delete event**: organizer-only, with a confirmation prompt, in the event's Settings tab (Danger Zone)

- **Participant/photographer privacy**: emails are masked server-side (`jo***@gmail.com`) in every listing an organizer sees — never sent as full addresses over the API

- **Photo grid**: switched from a forced square crop to a masonry (CSS columns) layout showing full images at their natural aspect ratio, just resized — fixed both the frontend grid and the backend's thumbnail-generation transform, which was force-cropping to a square via Cloudinary

- **Real downloads**: download URLs now carry Cloudinary's `fl_attachment` flag so the browser saves the file directly instead of opening it in a new tab

- **Event sharing**: Event ID and passcode are now clearly displayed (with copy buttons) right after creation, along with the actual QR code — not just described in text

- **QR scanning**: Join Event and Join as Photographer now have a real "Scan QR" mode using the device camera (`html5-qrcode`), not just text mentioning a QR option with no way to use it

- **Responsive layout**: mobile hamburger nav, masonry grids that adapt column count by breakpoint, forms that scale down cleanly on small screens

- **Extend event duration**: organizer can push an event's expiry date forward from Settings; pushing it into the future automatically re-activates an already-EXPIRED event

- **Cloudinary reconciliation**: fixes photos becoming permanently stuck/broken if deleted directly in the Cloudinary dashboard instead of through the app — an organizer-triggered "Sync with Cloudinary" button plus an automatic background sweep every 6 hours both detect and remove orphaned records

- **Theme stylesheet**: `frontend/src/styles/theme.css` is a single, heavily-commented file controlling every color and font across the whole app — see below

## Customizing fonts and colors

Edit:

```text
frontend/src/styles/theme.css
```

Every brand color (background, primary, accent, success, error, surface, border, text) and the app's font are defined there as CSS variables under `@theme`, and every component references them via Tailwind classes like `bg-primary` or `text-accent` — so changing a value in this one file updates the whole app.

To use a different Google Font, update both the `--font-sans` variable in this file and the font `<link>` tag in:

```text
frontend/index.html
```

## Account and Event Roles

There's no role picker at signup. Instead, from the Dashboard (Google-Classroom style):

- **Create Event** → you become that event's organizer

- **Join Event** → enter the Event ID + passcode the organizer shared, or scan their participant QR code (links to `/join/:eventId/:joinToken`, auto-joins on load)

- **Join as Photographer** → enter the Event ID + a separate photographer code the organizer shared, or scan their photographer QR code (links to `/join-photographer/:eventId/:photographerToken`)

An organizer can also skip the QR entirely and add a photographer directly by email from the event's Photographers tab — the invitee just needs an existing SnapShare account, no special "photographer" account type required.

The same account can organize one event, photograph a friend's event, and just be a participant in a third — there's nothing tying an account to one fixed role.

### 4. Tests

```bash
docker compose exec backend npm test
```

The test suite uses:

```text
Vitest
Supertest
mongodb-memory-server
```

`mongodb-memory-server` downloads a real MongoDB binary on first run, so the test environment requires normal internet access.

If you prefer to run the backend tests outside Docker, the backend's normal Node.js development environment can still be used.

## Tuning FACE_MATCH_THRESHOLD

The spec intentionally does not hardcode a final similarity threshold. To tune it:

1. Upload a set of test event photos with known people in them.

2. Run Find My Photos with selfies of those same people.

3. Start at `0.5`, and adjust up (fewer false positives, may miss some real matches) or down (catches more matches, may include false positives) based on results.

4. ArcFace embeddings (what InsightFace's `buffalo_l` produces) typically separate well in the `0.4`–`0.6` cosine similarity range, but this varies with photo quality/angle/lighting in your actual dataset — there's no universal correct number.

## Deployment

- **Frontend** → Vercel (`vercel.json` included, SPA rewrites configured)

- **Backend + AI service + Redis** → Render (`backend/render.yaml` Blueprint included — import it directly in the Render dashboard)

- **Database** → MongoDB Atlas (external, not part of the Docker Compose stack)

- **Images** → Cloudinary (external)

- **Payments** → Razorpay (external; switch from test to live keys when ready)

Set all `sync: false` environment variables in the Render dashboard manually — these are the credentials that must never be committed to the repo (Mongo URI, Cloudinary secret, Razorpay secret, frontend URL, AI shared secret).

## Git Workflow

- `main` — stable, deployable

- `develop` — integration branch

- `feature/*` — one branch per feature area

## Security Notes

- Passwords: bcrypt, 12 salt rounds

- Event passcodes: bcrypt-hashed, plaintext shown exactly once at creation

- JWT: httpOnly cookie + Bearer token support, role embedded but re-verified server-side on every request (never trusted from the frontend alone)

- Payments: signature verified server-side via HMAC-SHA256 against Razorpay's secret — frontend success callbacks are never trusted alone

- Face embeddings: `select: false` at the schema level, stripped again in `toJSON`, every query mandatorily scoped by `eventId`, selfies never persisted

- Rate limiting: tighter limits on `/auth`, `/payments`, and `/find-my-photos` than the global default