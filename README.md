# Store2Home

A full-stack grocery delivery platform for Lathrop and Mountain House, CA.

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** Python Flask, SQLAlchemy
- **Database:** PostgreSQL
- **Infra:** Docker Compose

## Quick Start

```bash
# Clone the branch
git clone -b store2home https://github.com/varshasri-eng/multilingual-product-search.git
cd multilingual-product-search

# Create .env file
cp .env.example .env
# Edit .env — set your own passwords and secrets

# Start everything
docker compose up -d
```

Once running:

| Service | URL | Purpose |
|---|---|---|
| Customer portal | http://localhost:3000 | Register, login, dashboard |
| Admin portal | http://localhost:3000/admin/login | Customer & staff management |
| API | http://localhost:5001 | Flask backend |
| pgAdmin | http://localhost:5051 | Database GUI |

## Project Structure

```
├── backend/              # Flask API
│   ├── app/
│   │   ├── models/       # SQLAlchemy models
│   │   ├── routes/       # API endpoints
│   │   └── utils/        # Auth, OTP helpers
│   └── wsgi.py
├── frontend/             # React app
│   └── src/
│       ├── api/          # API client
│       ├── components/   # Layouts
│       ├── context/      # Auth context
│       └── pages/        # account/, admin/, Login, Register
├── db/
│   └── schema.sql
├── docker-compose.yml
└── .env.example
```

## Features

- Customer registration with OTP via email
- Customer dashboard: Profile, Addresses, Orders, Family Group, Notifications, Settings
- Admin portal: customer search & filter (name, phone, email, address, diet group, family group, order)
- Staff management with role-based access (read, write, full)
- Delivery zone enforcement (95330, 95391)
- Family/household groups for shared ordering
