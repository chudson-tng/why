package testutil

import (
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"why-backend/internal/config"
)

// SetupTestDB creates a mock database for testing
func SetupTestDB(t *testing.T) (*sql.DB, sqlmock.Sqlmock) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	return db, mock
}

// GetTestConfig returns a test configuration
func GetTestConfig() *config.Config {
	return &config.Config{
		Port: "8080",
		Postgres: config.PostgresConfig{
			User:     "test",
			Password: "test",
			Host:     "localhost",
			Port:     "5432",
			DB:       "test",
			SSLMode:  "disable",
		},
		JWTSecret:    "test-secret-key-for-testing-only",
		OTLPEndpoint: "localhost:4317",
		MinIO: config.MinIOConfig{
			Endpoint:        "localhost:9000",
			AccessKeyID:     "test",
			SecretAccessKey: "testsecret",
			BucketName:      "test-bucket",
			UseSSL:          false,
		},
	}
}

// SetupTestRouter creates a test router with gin in test mode
func SetupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}
