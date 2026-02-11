package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad(t *testing.T) {
	tests := []struct {
		name    string
		envVars map[string]string
		wantErr bool
		check   func(*testing.T, *Config)
	}{
		{
			name: "all environment variables set",
			envVars: map[string]string{
				"PORT":              "9090",
				"POSTGRES_USER":     "user",
				"POSTGRES_PASSWORD": "pass",
				"POSTGRES_HOST":     "localhost",
				"POSTGRES_PORT":     "5432",
				"POSTGRES_DB":       "testdb",
				"POSTGRES_SSLMODE":  "disable",
				"OTLP_ENDPOINT":     "custom-otlp:4317",
				"JWT_SECRET":        "custom-secret",
				"MINIO_ENDPOINT":    "custom-minio:9000",
				"MINIO_ACCESS_KEY":  "customkey",
				"MINIO_SECRET_KEY":  "customsecret",
				"MINIO_BUCKET":      "custom-bucket",
				"MINIO_USE_SSL":     "true",
			},
			wantErr: false,
			check: func(t *testing.T, cfg *Config) {
				assert.Equal(t, "9090", cfg.Port)
				assert.Equal(t, "postgres://user:pass@localhost:5432/testdb?sslmode=disable", cfg.PostgresURL())
				assert.Equal(t, "custom-otlp:4317", cfg.OTLPEndpoint)
				assert.Equal(t, "custom-secret", cfg.JWTSecret)
				assert.Equal(t, "custom-minio:9000", cfg.MinIO.Endpoint)
				assert.Equal(t, "customkey", cfg.MinIO.AccessKeyID)
				assert.Equal(t, "customsecret", cfg.MinIO.SecretAccessKey)
				assert.Equal(t, "custom-bucket", cfg.MinIO.BucketName)
				assert.True(t, cfg.MinIO.UseSSL)
			},
		},
		{
			name: "defaults are used when env vars not set",
			envVars: map[string]string{
				"POSTGRES_USER":     "user",
				"POSTGRES_PASSWORD": "pass",
				"POSTGRES_HOST":     "localhost",
				"POSTGRES_PORT":     "5432",
				"POSTGRES_DB":       "db",
				"POSTGRES_SSLMODE":  "disable",
			},
			wantErr: false,
			check: func(t *testing.T, cfg *Config) {
				assert.Equal(t, "8080", cfg.Port)                                              // Default
				assert.Equal(t, "alloy.monitoring.svc.cluster.local:4317", cfg.OTLPEndpoint)   // Default
				assert.Equal(t, "your-secret-key-change-in-production", cfg.JWTSecret)         // Default
				assert.Equal(t, "loki-minio.monitoring.svc.cluster.local:9000", cfg.MinIO.Endpoint) // Default
				assert.False(t, cfg.MinIO.UseSSL)                                              // Default
			},
		},
		{
			name: "missing required postgres configuration",
			envVars: map[string]string{
				"PORT": "8080",
			},
			wantErr: true,
		},
		{
			name: "MINIO_USE_SSL false",
			envVars: map[string]string{
				"POSTGRES_USER":     "user",
				"POSTGRES_PASSWORD": "pass",
				"POSTGRES_HOST":     "localhost",
				"POSTGRES_PORT":     "5432",
				"POSTGRES_DB":       "db",
				"POSTGRES_SSLMODE":  "disable",
				"MINIO_USE_SSL":     "false",
			},
			wantErr: false,
			check: func(t *testing.T, cfg *Config) {
				assert.False(t, cfg.MinIO.UseSSL)
			},
		},
		{
			name: "MINIO_USE_SSL any other value",
			envVars: map[string]string{
				"POSTGRES_USER":     "user",
				"POSTGRES_PASSWORD": "pass",
				"POSTGRES_HOST":     "localhost",
				"POSTGRES_PORT":     "5432",
				"POSTGRES_DB":       "db",
				"POSTGRES_SSLMODE":  "disable",
				"MINIO_USE_SSL":     "yes",
			},
			wantErr: false,
			check: func(t *testing.T, cfg *Config) {
				assert.False(t, cfg.MinIO.UseSSL) // Only "true" sets it to true
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clear environment
			os.Clearenv()

			// Set test environment variables
			for k, v := range tt.envVars {
				os.Setenv(k, v)
			}

			// Load config
			cfg, err := Load()

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, cfg)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, cfg)

			if tt.check != nil {
				tt.check(t, cfg)
			}
		})
	}
}

func TestGetEnv(t *testing.T) {
	tests := []struct {
		name         string
		key          string
		defaultValue string
		envValue     string
		setEnv       bool
		want         string
	}{
		{
			name:         "environment variable is set",
			key:          "TEST_VAR",
			defaultValue: "default",
			envValue:     "custom",
			setEnv:       true,
			want:         "custom",
		},
		{
			name:         "environment variable not set, use default",
			key:          "TEST_VAR",
			defaultValue: "default",
			setEnv:       false,
			want:         "default",
		},
		{
			name:         "environment variable set to empty string",
			key:          "TEST_VAR",
			defaultValue: "default",
			envValue:     "",
			setEnv:       true,
			want:         "default", // Empty values should use default
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clear environment
			os.Unsetenv(tt.key)

			if tt.setEnv {
				os.Setenv(tt.key, tt.envValue)
			}

			got := getEnv(tt.key, tt.defaultValue)
			assert.Equal(t, tt.want, got)

			// Cleanup
			os.Unsetenv(tt.key)
		})
	}
}
