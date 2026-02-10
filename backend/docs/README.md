# Why Backend

A Go-based backend for the "Why" application with messaging, media uploads, and
user authentication.

## Features

- JWT-based authentication
- Messages and threaded replies
- Media file uploads (via MinIO)
- OpenTelemetry observability (metrics & traces)
- PostgreSQL database
- Comprehensive test suite (53.2% coverage)

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- That's it! 🎉

### Run Locally

1. **Start all services:**

   ```bash
   docker-compose up --build
   ```

   This will start:
   - PostgreSQL (port 5432)
   - MinIO (ports 9000 & 9001)
   - Backend API (port 8080)

2. **Access the services:**
   - **API**: http://localhost:8080
   - **MinIO Console**: http://localhost:9001 (user: `minioadmin`, password:
     `minioadmin`)
   - **Health Check**: http://localhost:8080/health
   - **Metrics**: http://localhost:8080/metrics

3. **Stop services:**

   ```bash
   docker-compose down
   ```

4. **Stop and remove volumes (clean slate):**
   ```bash
   docker-compose down -v
   ```

### Development Workflow

**Run in detached mode:**

```bash
docker-compose up -d
```

**View logs:**

```bash
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f minio
```

**Rebuild after code changes:**

```bash
docker-compose up --build backend
```

**Run tests locally (without Docker):**

```bash
make test
make test-coverage
```

## API Endpoints

### Public Endpoints

- `POST /api/v1/signup` - Create account
- `POST /api/v1/login` - Login
- `GET /api/v1/messages` - List all messages
- `GET /api/v1/messages/:id` - Get message
- `GET /api/v1/messages/:id/replies` - Get replies

### Protected Endpoints (require Bearer token)

- `POST /api/v1/messages` - Create message
- `POST /api/v1/messages/:id/replies` - Reply to message
- `POST /api/v1/media` - Upload media

### System Endpoints

- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## Example API Usage

### Signup

```bash
curl -X POST http://localhost:8080/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Login

```bash
curl -X POST http://localhost:8080/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Create Message (with auth)

```bash
curl -X POST http://localhost:8080/api/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"content": "Hello, world!", "media_urls": []}'
```

### List Messages

```bash
curl http://localhost:8080/api/v1/messages
```

## Development

### Project Structure

```
backend/
├── cmd/server/          # Application entry point
├── internal/
│   ├── api/            # HTTP handlers, middleware, routes
│   ├── auth/           # JWT authentication
│   ├── config/         # Configuration management
│   ├── models/         # Data models
│   ├── storage/        # Database & MinIO setup
│   └── telemetry/      # OpenTelemetry
├── migrations/         # Database migrations
├── Dockerfile          # Container image
├── docker-compose.yml  # Local development stack
└── Makefile           # Build commands
```

### Makefile Commands

```bash
make build              # Build binary
make run               # Run locally (requires local Postgres & MinIO)
make test              # Run tests
make test-coverage     # Run tests with coverage
make test-coverage-html # Generate HTML coverage report
make docker-build      # Build Docker image
```

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:

- `POSTGRES_URL` - Database connection string
- `JWT_SECRET` - Secret key for JWT signing
- `MINIO_ENDPOINT` - MinIO server address
- `PORT` - HTTP server port (default: 8080)

## Database

The application automatically runs migrations on startup. The schema includes:

- `users` - User accounts
- `messages` - User messages with media URLs
- `replies` - Threaded replies to messages

## Testing

### Unit/Integration Tests

See [TESTING.md](TESTING.md) for comprehensive testing documentation.

Quick test commands:

```bash
make test                # Run all tests
make test-coverage       # Run with coverage report
make test-coverage-html  # Generate HTML coverage
```

### API Testing

Test the running API with the automated test script:

```bash
# Make sure the server is running first
make docker-up

# In another terminal, run the API tests
make test-api
```

The test script (`test-api.sh`) will:

- Verify all endpoints are working
- Test authentication (signup, login)
- Test message CRUD operations
- Test reply functionality
- Test error handling
- Provide color-coded output

**Manual Testing:**

Use the `api-test.http` file with:

- [VSCode REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
  extension
- [IntelliJ HTTP Client](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html)

This file contains all API endpoints with example requests you can run directly
from your IDE.

## Performance Profiling

Profile the application to analyze performance and identify bottlenecks.

### Start with Profiling Enabled

```bash
make docker-up-profiling
```

### Capture Profiles

```bash
make profile-cpu        # CPU profile (30s)
make profile-heap       # Memory snapshot
make profile-goroutine  # Goroutine analysis
make profile-all        # All profiles
```

### Analyze Results

```bash
make profile-serve FILE=./profiles/cpu_*.prof
```

See [PROFILING.md](PROFILING.md) for comprehensive profiling guide.

## Architecture

- **Web Framework**: Gin
- **Database**: PostgreSQL
- **Object Storage**: MinIO (S3-compatible)
- **Authentication**: JWT tokens
- **Observability**: OpenTelemetry (traces + metrics)
- **Metrics**: Prometheus format
- **Profiling**: pprof (optional, disabled by default)

## Contributing

1. Make your changes
2. Run tests: `make test`
3. Ensure tests pass and coverage is maintained
4. Submit a PR

## License

[Your License Here]
