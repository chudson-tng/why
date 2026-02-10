.PHONY: build run test test-coverage test-coverage-html docker-build docker-run docker-up docker-down docker-logs

build:
	go build -o bin/server ./cmd/server

run:
	go run ./cmd/server

test:
	go test -v ./...

test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out

test-coverage-html:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

test-short:
	go test -v -short ./...

test-race:
	go test -v -race ./...

# Docker Compose commands
docker-up:
	docker-compose up --build

docker-up-d:
	docker-compose up -d --build

docker-down:
	docker-compose down

docker-down-v:
	docker-compose down -v

docker-logs:
	docker-compose logs -f backend

docker-restart:
	docker-compose restart backend

# API Testing
test-api:
	./test-api.sh

# Profiling commands
docker-up-profiling:
	docker-compose -f docker-compose.yml -f docker-compose.profiling.yml up --build

profile-cpu:
	./profile.sh cpu

profile-heap:
	./profile.sh heap

profile-goroutine:
	./profile.sh goroutine

profile-all:
	./profile.sh all

profile-serve:
	@echo "Usage: make profile-serve FILE=<profile-file>"
	@if [ -z "$(FILE)" ]; then \
		echo "Example: make profile-serve FILE=./profiles/cpu_20260210_120000.prof"; \
		exit 1; \
	fi
	./profile.sh serve $(FILE)

# Legacy Docker commands
docker-build:
	docker build -t why-backend:latest .

docker-run:
	docker run -p 8080:8080 --env-file .env why-backend:latest
