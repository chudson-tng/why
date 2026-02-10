package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"why-backend/internal/auth"
	"why-backend/internal/testutil"
)

func TestAuthMiddleware_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := testutil.GetTestConfig()

	// Generate valid token
	userID := "user-123"
	email := "test@example.com"
	token, err := auth.GenerateToken(userID, email, cfg.JWTSecret)
	assert.NoError(t, err)

	// Setup router with middleware
	router := gin.New()
	router.Use(AuthMiddleware(cfg))
	router.GET("/protected", func(c *gin.Context) {
		// Check that user info was added to context
		contextUserID, exists := c.Get("user_id")
		assert.True(t, exists)
		assert.Equal(t, userID, contextUserID)

		contextEmail, exists := c.Get("email")
		assert.True(t, exists)
		assert.Equal(t, email, contextEmail)

		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Create request with valid token
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAuthMiddleware_MissingAuthHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := testutil.GetTestConfig()

	router := gin.New()
	router.Use(AuthMiddleware(cfg))
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/protected", nil)
	// No Authorization header

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "authorization header required")
}

func TestAuthMiddleware_InvalidHeaderFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := testutil.GetTestConfig()

	tests := []struct {
		name            string
		authHeader      string
		expectedMessage string
	}{
		{
			name:            "missing Bearer prefix",
			authHeader:      "token123",
			expectedMessage: "invalid authorization header format",
		},
		{
			name:            "wrong prefix",
			authHeader:      "Basic token123",
			expectedMessage: "invalid authorization header format",
		},
		{
			name:            "empty token",
			authHeader:      "Bearer ",
			expectedMessage: "invalid or expired token",
		},
		{
			name:            "only Bearer",
			authHeader:      "Bearer",
			expectedMessage: "invalid authorization header format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(AuthMiddleware(cfg))
			router.GET("/protected", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			w := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/protected", nil)
			req.Header.Set("Authorization", tt.authHeader)

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusUnauthorized, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedMessage)
		})
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := testutil.GetTestConfig()

	tests := []struct {
		name  string
		token string
	}{
		{
			name:  "malformed token",
			token: "not.a.valid.token",
		},
		{
			name:  "random string",
			token: "randomstring",
		},
		{
			name:  "empty token",
			token: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(AuthMiddleware(cfg))
			router.GET("/protected", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			w := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/protected", nil)
			req.Header.Set("Authorization", "Bearer "+tt.token)

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusUnauthorized, w.Code)
			assert.Contains(t, w.Body.String(), "invalid or expired token")
		})
	}
}

func TestAuthMiddleware_WrongSecret(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := testutil.GetTestConfig()

	// Generate token with different secret
	userID := "user-123"
	email := "test@example.com"
	token, err := auth.GenerateToken(userID, email, "wrong-secret")
	assert.NoError(t, err)

	router := gin.New()
	router.Use(AuthMiddleware(cfg))
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "invalid or expired token")
}

func TestAuthMiddleware_CaseSensitiveBearer(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := testutil.GetTestConfig()

	userID := "user-123"
	email := "test@example.com"
	token, err := auth.GenerateToken(userID, email, cfg.JWTSecret)
	assert.NoError(t, err)

	tests := []struct {
		name           string
		authHeader     string
		expectedStatus int
	}{
		{
			name:           "lowercase bearer",
			authHeader:     "bearer " + token,
			expectedStatus: http.StatusUnauthorized, // Should fail, expects "Bearer"
		},
		{
			name:           "uppercase BEARER",
			authHeader:     "BEARER " + token,
			expectedStatus: http.StatusUnauthorized, // Should fail, expects "Bearer"
		},
		{
			name:           "correct Bearer",
			authHeader:     "Bearer " + token,
			expectedStatus: http.StatusOK, // Should succeed
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.Use(AuthMiddleware(cfg))
			router.GET("/protected", func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"message": "success"})
			})

			w := httptest.NewRecorder()
			req := httptest.NewRequest("GET", "/protected", nil)
			req.Header.Set("Authorization", tt.authHeader)

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestAuthMiddleware_NextNotCalled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := testutil.GetTestConfig()

	handlerCalled := false

	router := gin.New()
	router.Use(AuthMiddleware(cfg))
	router.GET("/protected", func(c *gin.Context) {
		handlerCalled = true
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/protected", nil)
	// No auth header

	router.ServeHTTP(w, req)

	assert.False(t, handlerCalled, "Handler should not be called when auth fails")
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
