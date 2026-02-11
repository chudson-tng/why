package config

import (
	"fmt"
	"os"
)

// postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=${POSTGRES_SSLMODE}
type Config struct {
	Port         string
	Postgres     PostgresConfig
	MinIO        MinIOConfig
	OTLPEndpoint string
	JWTSecret    string
	EnablePprof  bool
}

func (c *Config) PostgresURL() string {
	// Validate that all required fields are set
	if c.Postgres.User == "unset" ||
		c.Postgres.Password == "unset" ||
		c.Postgres.Host == "unset" ||
		c.Postgres.Port == "unset" ||
		c.Postgres.DB == "unset" ||
		c.Postgres.SSLMode == "unset" {
		return ""
	}
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.Postgres.User,
		c.Postgres.Password,
		c.Postgres.Host,
		c.Postgres.Port,
		c.Postgres.DB,
		c.Postgres.SSLMode,
	)
}

type PostgresConfig struct {
	User     string
	Password string
	Host     string
	Port     string
	DB       string
	SSLMode  string
}

type MinIOConfig struct {
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	UseSSL          bool
}

func Load() (*Config, error) {
	cfg := &Config{
		Port: getEnv("PORT", "8080"),
		Postgres: PostgresConfig{
			User:     getEnv("POSTGRES_USER", "unset"),
			Password: getEnv("POSTGRES_PASSWORD", "unset"),
			Host:     getEnv("POSTGRES_HOST", "unset"),
			Port:     getEnv("POSTGRES_PORT", "unset"),
			DB:       getEnv("POSTGRES_DB", "unset"),
			SSLMode:  getEnv("POSTGRES_SSLMODE", "unset"),
		},
		OTLPEndpoint: getEnv("OTLP_ENDPOINT", "alloy.monitoring.svc.cluster.local:4317"),
		JWTSecret:    getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
		EnablePprof:  getEnv("ENABLE_PPROF", "false") == "true",
		MinIO: MinIOConfig{
			Endpoint:        getEnv("MINIO_ENDPOINT", "loki-minio.monitoring.svc.cluster.local:9000"),
			AccessKeyID:     getEnv("MINIO_ACCESS_KEY", "loki"),
			SecretAccessKey: getEnv("MINIO_SECRET_KEY", "supersecret"),
			BucketName:      getEnv("MINIO_BUCKET", "why-media"),
			UseSSL:          getEnv("MINIO_USE_SSL", "false") == "true",
		},
	}

	if cfg.PostgresURL() == "" {
		return nil, fmt.Errorf("POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB and POSTGRES_SSLMODE are required")
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
