package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"why-backend/internal/api/middleware"
	"why-backend/internal/auth"
	"why-backend/internal/models"
	"why-backend/internal/testutil"
)

func TestRouter_HealthCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := testutil.SetupTestDB(t)
	defer db.Close()

	// Initialize metrics for tests
	_ = middleware.InitMetrics(context.Background())

	cfg := testutil.GetTestConfig()
	router := NewRouter(db, nil, cfg)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "ok", response["status"])
}

func TestRouter_CORS(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := testutil.SetupTestDB(t)
	defer db.Close()

	_ = middleware.InitMetrics(context.Background())

	cfg := testutil.GetTestConfig()
	router := NewRouter(db, nil, cfg)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("OPTIONS", "/api/v1/messages", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	req.Header.Set("Access-Control-Request-Method", "GET")

	router.ServeHTTP(w, req)

	// CORS should be configured
	assert.NotEmpty(t, w.Header().Get("Access-Control-Allow-Origin"))
}

func TestRouter_PublicRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	_ = middleware.InitMetrics(context.Background())

	cfg := testutil.GetTestConfig()
	router := NewRouter(db, nil, cfg)

	tests := []struct {
		name           string
		method         string
		path           string
		setupMock      func()
		expectedStatus int
	}{
		{
			name:   "list messages without auth",
			method: "GET",
			path:   "/api/v1/messages",
			setupMock: func() {
				rows := sqlmock.NewRows([]string{"id", "user_id", "content", "media_urls", "created_at", "updated_at"})
				mock.ExpectQuery("SELECT id, user_id, content, media_urls, created_at, updated_at FROM messages").
					WillReturnRows(rows)
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.setupMock != nil {
				tt.setupMock()
			}

			w := httptest.NewRecorder()
			req := httptest.NewRequest(tt.method, tt.path, nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestRouter_ProtectedRoutes_RequireAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := testutil.SetupTestDB(t)
	defer db.Close()

	_ = middleware.InitMetrics(context.Background())

	cfg := testutil.GetTestConfig()
	router := NewRouter(db, nil, cfg)

	protectedRoutes := []struct {
		method string
		path   string
	}{
		{"POST", "/api/v1/messages"},
		{"POST", "/api/v1/messages/123/replies"},
		{"POST", "/api/v1/media"},
	}

	for _, route := range protectedRoutes {
		t.Run(route.method+" "+route.path, func(t *testing.T) {
			w := httptest.NewRecorder()
			req := httptest.NewRequest(route.method, route.path, nil)
			router.ServeHTTP(w, req)

			// Should return 401 Unauthorized without auth
			assert.Equal(t, http.StatusUnauthorized, w.Code)
		})
	}
}

func TestRouter_ProtectedRoutes_WithAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	_ = middleware.InitMetrics(context.Background())

	cfg := testutil.GetTestConfig()
	router := NewRouter(db, nil, cfg)

	// Generate valid token
	userID := "user-123"
	email := "test@example.com"
	token, err := auth.GenerateToken(userID, email, cfg.JWTSecret)
	require.NoError(t, err)

	// Test creating a message with auth
	createReq := models.CreateMessageRequest{
		Content:   "Test message",
		MediaURLs: []string{},
	}
	body, _ := json.Marshal(createReq)

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "user_id", "content", "media_urls", "created_at", "updated_at"}).
		AddRow("msg-123", userID, createReq.Content, pq.Array(createReq.MediaURLs), now, now)

	mock.ExpectQuery("INSERT INTO messages").
		WithArgs(userID, createReq.Content, sqlmock.AnyArg()).
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/messages", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestRouter_MetricsEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := testutil.SetupTestDB(t)
	defer db.Close()

	_ = middleware.InitMetrics(context.Background())

	cfg := testutil.GetTestConfig()
	router := NewRouter(db, nil, cfg)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/metrics", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	// Prometheus metrics should be in text format
	assert.Contains(t, w.Header().Get("Content-Type"), "text/plain")
}

func TestRouter_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := testutil.SetupTestDB(t)
	defer db.Close()

	_ = middleware.InitMetrics(context.Background())

	cfg := testutil.GetTestConfig()
	router := NewRouter(db, nil, cfg)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/nonexistent", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// Integration test: Full signup -> login -> create message flow
func TestRouter_FullAuthFlow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	_ = middleware.InitMetrics(context.Background())

	cfg := testutil.GetTestConfig()
	router := NewRouter(db, nil, cfg)

	email := "integration@test.com"
	password := "password123"
	userID := "user-integration-123"

	// Step 1: Signup
	signupReq := models.SignupRequest{
		Email:    email,
		Password: password,
	}
	body, _ := json.Marshal(signupReq)

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "email", "created_at", "updated_at"}).
		AddRow(userID, email, now, now)

	mock.ExpectQuery("INSERT INTO users").
		WithArgs(email, sqlmock.AnyArg()).
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/signup", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var signupResp models.AuthResponse
	err := json.Unmarshal(w.Body.Bytes(), &signupResp)
	require.NoError(t, err)
	token := signupResp.Token
	assert.NotEmpty(t, token)

	// Step 2: Use token to create a message
	createReq := models.CreateMessageRequest{
		Content:   "My first message",
		MediaURLs: []string{},
	}
	body, _ = json.Marshal(createReq)

	msgRows := sqlmock.NewRows([]string{"id", "user_id", "content", "media_urls", "created_at", "updated_at"}).
		AddRow("msg-1", userID, createReq.Content, pq.Array(createReq.MediaURLs), now, now)

	mock.ExpectQuery("INSERT INTO messages").
		WithArgs(userID, createReq.Content, sqlmock.AnyArg()).
		WillReturnRows(msgRows)

	w = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/v1/messages", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var msgResp models.Message
	err = json.Unmarshal(w.Body.Bytes(), &msgResp)
	require.NoError(t, err)
	assert.Equal(t, "msg-1", msgResp.ID)
	assert.Equal(t, createReq.Content, msgResp.Content)

	// Verify all mock expectations
	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}
