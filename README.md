# CollabBoard

Real-time collaborative markdown editor with user authentication and version history.

## Quick Start

```bash
git clone <repository-url>
cd CollabBoard
docker-compose up --build
```

Access at https://localhost (accept self-signed certificate)

**Default login:**
- Username: `admin`
- Password: `admin123`

## Production

```bash
cp env.example .env
# Edit .env with your values
docker-compose -f docker-compose.prod.yml up --build -d
```

## Architecture

- **Frontend:** Next.js React app
- **Backend:** Express API + Socket.IO
- **Database:** PostgreSQL
- **Proxy:** NGINX with HTTPS