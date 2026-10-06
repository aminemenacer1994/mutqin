# Ackee (Docker Compose)

Self-hosted Ackee for Mutqin. This is **not** the Laravel app. The tracker in Mutqin sends page views and events to this stack.

Official guide: [With Docker Compose](https://github.com/electerious/Ackee/blob/master/docs/Get%20started.md#with-docker-compose).

## Local (get your event ID)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. From this folder:

```bash
cd ackee
cp .env.example .env
# Edit ACKEE_PASSWORD in ackee/.env
docker compose up -d
```

3. Open [http://127.0.0.1:3000](http://127.0.0.1:3000) and sign in with `ACKEE_USERNAME` / `ACKEE_PASSWORD`.
4. **Settings → Domains** → add `mutqin.ai` and `app.mutqin.ai`. Copy each ID into Laravel `.env`:
   - `ACKEE_DOMAIN_ID_WEBSITE=`
   - `ACKEE_DOMAIN_ID_APP=`
5. **Events** → New event (name: `Mutqin actions`). Copy the UUID into Laravel `.env`:
   - `ACKEE_EVENT_ID=`

Local Mutqin tracking (optional):

```env
ACKEE_ENABLED=true
ACKEE_ALLOW_LOCALHOST=true
ACKEE_SERVER=http://127.0.0.1:3000
```

Stop:

```bash
docker compose down
```

Data stays in the Docker volume `ackee_mongo_data`.

## Production (`analytics.mutqin.ai`)

Ackee itself speaks HTTP on port 3000. HTTPS needs a reverse proxy.

On a VPS:

1. Point DNS: `analytics.mutqin.ai` → the VPS (A/AAAA).
2. Open ports 80 and 443.
3. Copy this `ackee/` folder (or clone the repo), set `ackee/.env` (`ACKEE_PASSWORD`, `ACKEE_PUBLIC_HOST=analytics.mutqin.ai`).
4. Start with TLS:

```bash
cd ackee
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d
```

5. Open `https://analytics.mutqin.ai`, create the two domains + one event, paste IDs into **Laravel Cloud** / production `.env`:

```env
ACKEE_ENABLED=true
ACKEE_SERVER=https://analytics.mutqin.ai
ACKEE_DOMAIN_ID_WEBSITE=
ACKEE_DOMAIN_ID_APP=
ACKEE_EVENT_ID=
```

CORS is already set for `https://mutqin.ai` and `https://app.mutqin.ai` via `ACKEE_ALLOW_ORIGIN`.
