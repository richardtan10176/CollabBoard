# CollabBoard - Real-time Collaborative Markdown Editor

A full-stack collaborative markdown editor with real-time editing, user authentication, and version history.

### CollabBoard is now LIVE!!! Visit [here](https://www.collabboard.xyz)

##  Architecture

CollabBoard consists of 4 Docker containers orchestrated with Docker Compose:

1. **NGINX** - Reverse proxy with HTTPS termination
2. **Next.js Frontend** - React-based client application
3. **Express Backend** - REST API with WebSocket support
4. **PostgreSQL** - Database for users and documents

```
Client (HTTPS) → NGINX (443) → Next.js (3000) → Express API (3001) → PostgreSQL (5432)
                                       ↓
                              WebSocket (Socket.io)
```

##  Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CollabBoard
   ```

2. **Start the application**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Open https://localhost in your browser
   - Accept the self-signed certificate warning
   - Register a new account or use the default admin account:
     - Username: `admin`
     - Password: `admin123`

### Production Setup

1. **Configure environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your production values
   ```

2. **Use production configuration**
   ```bash
   docker-compose -f docker-compose.yml up --build -d
   ```

##  Project Structure

```
CollabBoard/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Authentication, etc.
│   │   ├── routes/          # API routes
│   │   ├── services/        # WebSocket service
│   │   └── utils/           # Database, auth utilities
│   ├── Dockerfile
│   └── package.json
├── frontend/                # Next.js React application
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # API utilities
│   ├── Dockerfile
│   └── package.json
├── nginx/                   # NGINX reverse proxy
│   ├── nginx.conf
│   └── Dockerfile
├── psql/                    # PostgreSQL setup
│   ├── init.sql             # Database schema
│   └── Dockerfile
├── docker-compose.yml       # Production configuration
├── docker-compose.override.yml  # Development overrides
└── README.md
```
