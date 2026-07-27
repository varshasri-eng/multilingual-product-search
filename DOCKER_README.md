# Running Store2Home with Docker

This replaces the manual "install Postgres, install pgAdmin, run 9 SQL
files by hand, create a venv, fight psycopg2" setup with one command.
Useful especially for Pavan/Murali/Sahiti joining the repo — everyone
gets the identical environment, no per-machine debugging.

## Prerequisites

Install Docker Desktop: https://www.docker.com/products/docker-desktop
(Windows/Mac/Linux). That's the only prerequisite — no local Python,
Node, or Postgres installation needed at all.

## First-time setup

From the project root (where `docker-compose.yml` lives):

```powershell
docker compose up --build
```

First run will take a few minutes (downloading images, installing
dependencies, building containers). Subsequent runs are much faster.

This starts three containers:
- **postgres** — database, auto-loads the full schema + 30 seeded
  products + all search/related-products functions from `docker/init/`
  on first run only
- **backend** — Flask API on `http://localhost:5000`
- **frontend** — React dev server on `http://localhost:5173`

Once all three show as healthy/running, open `http://localhost:5173` —
same as running everything locally, just without the setup pain.

## Day-to-day use

```powershell
docker compose up        # start everything
docker compose down      # stop everything (data persists)
docker compose logs -f backend    # watch backend logs live
docker compose logs -f frontend   # watch frontend logs live
```

Code changes to `backend-python/` or `frontend-react/` hot-reload
automatically — both containers have your source folders mounted, so
this works exactly like running `python app.py` / `npm run dev`
locally, just inside containers.

## If you need a truly fresh database

The init scripts in `docker/init/` only run on a database's **first**
startup — once data exists, they're skipped (same as any Postgres
install). To wipe and rebuild from scratch:

```powershell
docker compose down -v   # -v deletes the database volume too
docker compose up --build
```

## What NOT to do

Don't run `python app.py` or `npm run dev` locally **and** run Docker
at the same time — both will try to use ports 5000/5173/5432 and
conflict. Pick one workflow per session.

## Adding new database migrations going forward

Drop new `.sql` files into `docker/init/` with the next number
(`10_whatever.sql`) — but remember, they only run automatically for
someone spinning up a **fresh** database. For everyone's already-running
containers (including your own), you still run new migrations manually
in pgAdmin/psql, same as before. `docker/init/` is specifically for
"what does a brand-new teammate's database need to look like," not an
ongoing migration runner.