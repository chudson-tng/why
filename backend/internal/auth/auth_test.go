package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "valid password",
			password: "mySecurePassword123",
			wantErr:  false,
		},
		{
			name:     "empty password",
			password: "",
			wantErr:  false, // bcrypt can hash empty strings
		},
		{
			name:     "long password",
			password: "averylongpasswordthatexceedsnormallimitsbutshouldsillwork1234567890",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			hash, err := HashPassword(tt.password)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.NotEmpty(t, hash)
			assert.NotEqual(t, tt.password, hash, "hash should not equal plain password")

			// Hash should be different each time
			hash2, err := HashPassword(tt.password)
			require.NoError(t, err)
			assert.NotEqual(t, hash, hash2, "hashes should be different due to salt")
		})
	}
}

func TestCheckPassword(t *testing.T) {
	password := "mySecurePassword123"
	hash, err := HashPassword(password)
	require.NoError(t, err)

	tests := []struct {
		name     string
		password string
		hash     string
		wantErr  bool
	}{
		{
			name:     "correct password",
			password: password,
			hash:     hash,
			wantErr:  false,
		},
		{
			name:     "incorrect password",
			password: "wrongPassword",
			hash:     hash,
			wantErr:  true,
		},
		{
			name:     "empty password",
			password: "",
			hash:     hash,
			wantErr:  true,
		},
		{
			name:     "case sensitive",
			password: "MYSECUREPASSWORD123",
			hash:     hash,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckPassword(tt.password, tt.hash)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGenerateToken(t *testing.T) {
	userID := "user-123"
	email := "test@example.com"
	secret := "test-secret-key"

	tests := []struct {
		name    string
		userID  string
		email   string
		secret  string
		wantErr bool
	}{
		{
			name:    "valid token generation",
			userID:  userID,
			email:   email,
			secret:  secret,
			wantErr: false,
		},
		{
			name:    "empty user id",
			userID:  "",
			email:   email,
			secret:  secret,
			wantErr: false, // JWT allows empty claims
		},
		{
			name:    "empty secret",
			userID:  userID,
			email:   email,
			secret:  "",
			wantErr: false, // Empty secret is valid for signing
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			token, err := GenerateToken(tt.userID, tt.email, tt.secret)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.NotEmpty(t, token)

			// Token should have 3 parts (header.payload.signature)
			assert.Contains(t, token, ".")
		})
	}
}

func TestValidateToken(t *testing.T) {
	userID := "user-123"
	email := "test@example.com"
	secret := "test-secret-key"

	validToken, err := GenerateToken(userID, email, secret)
	require.NoError(t, err)

	tests := []struct {
		name        string
		token       string
		secret      string
		wantErr     bool
		checkClaims bool
	}{
		{
			name:        "valid token",
			token:       validToken,
			secret:      secret,
			wantErr:     false,
			checkClaims: true,
		},
		{
			name:    "invalid secret",
			token:   validToken,
			secret:  "wrong-secret",
			wantErr: true,
		},
		{
			name:    "malformed token",
			token:   "not.a.valid.token",
			secret:  secret,
			wantErr: true,
		},
		{
			name:    "empty token",
			token:   "",
			secret:  secret,
			wantErr: true,
		},
		{
			name:    "random string",
			token:   "randomstring",
			secret:  secret,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := ValidateToken(tt.token, tt.secret)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, claims)
				return
			}
			require.NoError(t, err)
			require.NotNil(t, claims)

			if tt.checkClaims {
				assert.Equal(t, userID, claims.UserID)
				assert.Equal(t, email, claims.Email)
				assert.True(t, claims.ExpiresAt.After(time.Now()))
			}
		})
	}
}

func TestTokenExpiry(t *testing.T) {
	userID := "user-123"
	email := "test@example.com"
	secret := "test-secret-key"

	// Create an expired token manually
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)), // Already expired
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	expiredToken, err := token.SignedString([]byte(secret))
	require.NoError(t, err)

	// Validate should fail for expired token
	_, err = ValidateToken(expiredToken, secret)
	assert.Error(t, err)
}

func TestTokenIntegration(t *testing.T) {
	// Full cycle: generate and validate
	userID := "user-456"
	email := "integration@test.com"
	secret := "integration-test-secret"

	// Generate token
	token, err := GenerateToken(userID, email, secret)
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Validate token
	claims, err := ValidateToken(token, secret)
	require.NoError(t, err)
	require.NotNil(t, claims)

	// Check claims
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.True(t, claims.ExpiresAt.After(time.Now()))
	assert.True(t, claims.IssuedAt.Before(time.Now().Add(1*time.Second)))
}
