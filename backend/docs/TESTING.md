# Testing Guide

This document describes the testing strategy and how to run tests for the Why
backend.

## Test Structure

The project uses a comprehensive test suite with the following components:

### Unit Tests

- **`internal/auth/auth_test.go`** - Tests for authentication logic (password
  hashing, JWT generation/validation)
- **`internal/config/config_test.go`** - Tests for configuration loading and
  environment variable parsing
- **`internal/storage/minio_test.go`** - Tests for MinIO storage utilities
- **`internal/storage/postgres_test.go`** - Tests for database initialization
  and migrations

### Handler Tests

- **`internal/api/handlers/auth_test.go`** - Tests for signup and login
  endpoints
- **`internal/api/handlers/messages_test.go`** - Tests for message CRUD
  operations
- **`internal/api/handlers/media_test.go`** - Tests for media upload endpoints

### Middleware Tests

- **`internal/api/middleware/auth_test.go`** - Tests for JWT authentication
  middleware

### Integration Tests

- **`internal/api/router_test.go`** - End-to-end tests for complete request
  flows

### Test Utilities

- **`internal/testutil/testutil.go`** - Shared test helpers and utilities

## Running Tests

### Run all tests

```bash
make test
```

### Run tests with coverage

```bash
make test-coverage
```

### Generate HTML coverage report

```bash
make test-coverage-html
```

This generates a `coverage.html` file you can open in your browser.

### Run tests with race detection

```bash
make test-race
```

### Run tests in short mode

```bash
make test-short
```

### Run specific package tests

```bash
go test -v ./internal/auth
go test -v ./internal/api/handlers
```

### Run specific test

```bash
go test -v ./internal/auth -run TestHashPassword
```

## Testing Tools

The project uses the following testing libraries:

- **[testify](https://github.com/stretchr/testify)** - Assertion and mocking
  framework
  - `assert` - Flexible assertions
  - `require` - Assertions that stop test execution on failure
  - `mock` - Mocking support

- **[go-sqlmock](https://github.com/DATA-DOG/go-sqlmock)** - SQL database
  mocking
  - Used to test database interactions without a real database
  - Allows setting expectations for queries and results

## Test Coverage

Current test coverage includes:

- Authentication (password hashing, JWT tokens)
- Configuration loading
- Auth handlers (signup, login)
- Message handlers (create, list, get, replies)
- Storage utilities
- Authentication middleware
- Router configuration and CORS
- Integration tests for full request flows

## Writing Tests

### Test File Naming

Test files should be named `*_test.go` and placed in the same package as the
code being tested.

### Example Test Structure

```go
func TestFunctionName(t *testing.T) {
    // Setup
    db, mock := testutil.SetupTestDB(t)
    defer db.Close()

    // Configure mocks
    mock.ExpectQuery("SELECT").WillReturnRows(...)

    // Execute
    result := FunctionToTest(params)

    // Assert
    assert.Equal(t, expected, result)
    assert.NoError(t, mock.ExpectationsWereMet())
}
```

### Table-Driven Tests

For testing multiple scenarios:

```go
func TestFunction(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    string
        wantErr bool
    }{
        {"case 1", "input1", "output1", false},
        {"case 2", "input2", "output2", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Function(tt.input)
            if tt.wantErr {
                assert.Error(t, err)
                return
            }
            assert.NoError(t, err)
            assert.Equal(t, tt.want, got)
        })
    }
}
```

### Mocking Database

Use `sqlmock` to mock database interactions:

```go
db, mock := testutil.SetupTestDB(t)
defer db.Close()

// Expect a query
rows := sqlmock.NewRows([]string{"id", "name"}).
    AddRow("1", "test")
mock.ExpectQuery("SELECT (.+) FROM users").
    WillReturnRows(rows)

// Expect an exec
mock.ExpectExec("INSERT INTO users").
    WillReturnResult(sqlmock.NewResult(1, 1))

// Verify expectations
assert.NoError(t, mock.ExpectationsWereMet())
```

### Testing HTTP Handlers

```go
gin.SetMode(gin.TestMode)

w := httptest.NewRecorder()
c, _ := gin.CreateTestContext(w)
c.Request = httptest.NewRequest("POST", "/path", body)
c.Request.Header.Set("Content-Type", "application/json")

handler.HandlerFunc(c)

assert.Equal(t, http.StatusOK, w.Code)
```

## Continuous Integration

Tests should be run automatically in CI/CD pipelines. Consider adding:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: make test-coverage

- name: Upload coverage
  run: |
    go install github.com/mattn/goveralls@latest
    goveralls -coverprofile=coverage.out -service=github
```

## Test Best Practices

1. **Keep tests independent** - Each test should set up and tear down its own
   state
2. **Use descriptive names** - Test names should clearly describe what they test
3. **Test edge cases** - Include tests for error conditions and boundary cases
4. **Mock external dependencies** - Use mocks for databases, external APIs, etc.
5. **Avoid testing implementation details** - Test behavior, not internal
   structure
6. **Keep tests fast** - Unit tests should run quickly; use integration tests
   for slower scenarios
7. **Maintain test code** - Refactor tests just like production code

## Future Improvements

Potential areas for expanding test coverage:

- [ ] Add integration tests with real PostgreSQL database
- [ ] Add integration tests with real MinIO instance
- [ ] Add benchmark tests for performance-critical paths
- [ ] Add load testing for API endpoints
- [ ] Add mutation testing to verify test quality
- [ ] Add property-based testing for complex logic
