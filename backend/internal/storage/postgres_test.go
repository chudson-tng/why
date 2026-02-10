package storage

import (
	"context"
	"os"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInitDB_Success(t *testing.T) {
	// Create mock database
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// Mock ping
	mock.ExpectPing()

	// Create a temporary migration file for testing
	tmpDir := t.TempDir()
	migrationDir := tmpDir + "/migrations"
	err = os.MkdirAll(migrationDir, 0755)
	require.NoError(t, err)

	migrationFile := migrationDir + "/001_create_schema.sql"
	migrationContent := []byte("CREATE TABLE test (id INT);")
	err = os.WriteFile(migrationFile, migrationContent, 0644)
	require.NoError(t, err)

	// Change to temp directory
	oldDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(oldDir)

	err = os.Chdir(tmpDir)
	require.NoError(t, err)

	// Mock migration execution
	mock.ExpectExec("CREATE TABLE test").WillReturnResult(sqlmock.NewResult(0, 0))

	// We can't test the actual InitDB function because it creates a new connection
	// Instead, we'll test the runMigrations function
	ctx := context.Background()
	err = runMigrations(ctx, db)
	require.NoError(t, err)

	// Ensure all expectations were met
	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestRunMigrations_FileNotFound(t *testing.T) {
	db, _, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// Change to temp directory without migration file
	tmpDir := t.TempDir()
	oldDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(oldDir)

	err = os.Chdir(tmpDir)
	require.NoError(t, err)

	ctx := context.Background()
	err = runMigrations(ctx, db)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to read migration file")
}

func TestRunMigrations_ExecutionError(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	// Create migration file
	tmpDir := t.TempDir()
	migrationDir := tmpDir + "/migrations"
	err = os.MkdirAll(migrationDir, 0755)
	require.NoError(t, err)

	migrationFile := migrationDir + "/001_create_schema.sql"
	migrationContent := []byte("INVALID SQL;")
	err = os.WriteFile(migrationFile, migrationContent, 0644)
	require.NoError(t, err)

	// Change to temp directory
	oldDir, err := os.Getwd()
	require.NoError(t, err)
	defer os.Chdir(oldDir)

	err = os.Chdir(tmpDir)
	require.NoError(t, err)

	// Mock migration execution failure
	mock.ExpectExec("INVALID SQL").WillReturnError(assert.AnError)

	ctx := context.Background()
	err = runMigrations(ctx, db)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to execute migration")
}
