# CollabBoard - Real-time Collaborative Markdown Editor

A full-stack collaborative markdown editor with real-time editing, user authentication, and version history.

## 🏗️ Architecture

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

## 🚀 Quick Start

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

## 📁 Project Structure

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

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/env.example`)
```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=collabboard
DB_USER=collabboard
DB_PASSWORD=collabboard_dev_password
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=24h
PORT=3001
NODE_ENV=development
FRONTEND_URL=https://localhost
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Root Level (`env.example`)
```env
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
DB_PASSWORD=your_secure_database_password
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_WS_URL=https://yourdomain.com
NODE_ENV=production
```

### Database Schema

The application uses PostgreSQL with the following main tables:

- **users** - User authentication and profiles
- **documents** - Markdown document metadata
- **document_versions** - Version history for documents
- **active_sessions** - Real-time collaboration session tracking

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- HTTPS with self-signed certificates (dev) / Let's Encrypt ready (prod)
- Security headers (HSTS, XSS protection, etc.)
- SQL injection protection with parameterized queries
- CORS configuration

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - User logout

### Documents
- `GET /api/documents` - List user's documents
- `POST /api/documents` - Create new document
- `GET /api/documents/:id` - Get specific document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/versions` - Get document version history

### WebSocket Events
- `join-document` - Join document for real-time editing
- `leave-document` - Leave document session
- `text-change` - Send text changes to other users
- `cursor-move` - Send cursor position updates
- `save-document` - Manually save document version

## 🔄 Real-time Collaboration

The application uses Socket.io for real-time features:

1. **User Presence** - See who's currently editing
2. **Live Text Changes** - See changes as they happen
3. **Cursor Tracking** - See where other users are editing
4. **Auto-save** - Automatic document saving
5. **Version History** - Track document changes over time

## 🐳 Docker Services

### Service Dependencies
```
nginx → frontend → backend → postgres
```

### Health Checks
All services include health checks for reliable deployments:
- **postgres**: `pg_isready`
- **backend**: HTTP health endpoint
- **frontend**: HTTP health endpoint  
- **nginx**: HTTP health endpoint

### Volumes
- `postgres_data` - Persistent database storage
- `nginx_ssl` - SSL certificate storage

## 🚀 Deployment

### AWS EC2 Deployment

1. **Launch EC2 Instance**
   ```bash
   # Amazon Linux 2 or Ubuntu 20.04+
   # t3.medium or larger recommended
   ```

2. **Install Docker**
   ```bash
   sudo yum update -y
   sudo amazon-linux-extras install docker
   sudo systemctl start docker
   sudo usermod -a -G docker ec2-user
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Deploy Application**
   ```bash
   git clone <repository-url>
   cd CollabBoard
   cp env.example .env
   # Edit .env with production values
   
   docker-compose -f docker-compose.yml up -d --build
   ```

4. **Configure Domain (Optional)**
   - Point your domain to the EC2 instance
   - Update NGINX configuration for your domain
   - Set up Let's Encrypt for production SSL

### Environment-Specific Configurations

#### Development
- Uses `docker-compose.override.yml` automatically
- Hot reload for both frontend and backend
- Exposed database port for development tools
- Self-signed SSL certificates

#### Production
- Uses only `docker-compose.yml`
- Optimized builds with multi-stage Dockerfiles
- Health checks and restart policies
- Proper SSL certificate management

## 🛠️ Development

### Local Development

1. **Start development environment**
   ```bash
   docker-compose up --build
   ```

2. **Access services**
   - Frontend: https://localhost
   - Backend API: https://localhost/api
   - Database: localhost:5432

3. **View logs**
   ```bash
   docker-compose logs -f [service_name]
   ```

### Making Changes

- Frontend changes are hot-reloaded automatically
- Backend changes restart the Node.js process
- Database schema changes require rebuilding the postgres container

### Testing

```bash
# Test backend API
curl -k https://localhost/api/health

# Test frontend
curl -k https://localhost/health

# Test database connection
docker-compose exec postgres psql -U collabboard -d collabboard -c "SELECT NOW();"
```

## 🔍 Troubleshooting

### Common Issues

1. **SSL Certificate Errors**
   - In development, accept the self-signed certificate
   - Check NGINX logs: `docker-compose logs nginx`

2. **Database Connection Issues**
   - Ensure postgres container is healthy: `docker-compose ps`
   - Check database logs: `docker-compose logs postgres`

3. **WebSocket Connection Problems**
   - Verify NGINX WebSocket proxy configuration
   - Check browser console for connection errors

4. **Permission Errors**
   - Ensure Docker has proper permissions
   - Check file ownership in mounted volumes

### Useful Commands

```bash
# View service status
docker-compose ps

# View logs
docker-compose logs -f [service]

# Restart specific service
docker-compose restart [service]

# Access service shell
docker-compose exec [service] sh

# Clean up everything
docker-compose down -v --remove-orphans
docker system prune -a
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📧 Support

For support and questions, please open an issue in the GitHub repository.