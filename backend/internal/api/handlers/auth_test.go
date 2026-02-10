package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"why-backend/internal/auth"
	"why-backend/internal/models"
	"why-backend/internal/testutil"
)

func TestAuthHandler_Signup_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	cfg := testutil.GetTestConfig()
	handler := NewAuthHandler(db, cfg)

	// Setup request
	signupReq := models.SignupRequest{
		Email:    "test@example.com",
		Password: "password123",
	}
	body, _ := json.Marshal(signupReq)

	// Mock database response
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "email", "created_at", "updated_at"}).
		AddRow("user-123", signupReq.Email, now, now)

	mock.ExpectQuery("INSERT INTO users").
		WithArgs(signupReq.Email, sqlmock.AnyArg()).
		WillReturnRows(rows)

	// Create request
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/signup", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	// Execute
	handler.Signup(c)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code)

	var response models.AuthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.NotEmpty(t, response.Token)
	assert.Equal(t, signupReq.Email, response.User.Email)
	assert.Equal(t, "user-123", response.User.ID)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestAuthHandler_Signup_InvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := testutil.SetupTestDB(t)
	defer db.Close()

	cfg := testutil.GetTestConfig()
	handler := NewAuthHandler(db, cfg)

	// Invalid JSON
	body := []byte(`{"email": "test@example.com", "password":`)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/signup", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.Signup(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAuthHandler_Signup_ValidationError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := testutil.SetupTestDB(t)
	defer db.Close()

	cfg := testutil.GetTestConfig()
	handler := NewAuthHandler(db, cfg)

	tests := []struct {
		name    string
		request models.SignupRequest
	}{
		{
			name: "invalid email",
			request: models.SignupRequest{
				Email:    "not-an-email",
				Password: "password123",
			},
		},
		{
			name: "short password",
			request: models.SignupRequest{
				Email:    "test@example.com",
				Password: "short",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.request)

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("POST", "/signup", bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")

			handler.Signup(c)

			assert.Equal(t, http.StatusBadRequest, w.Code)
		})
	}
}

func TestAuthHandler_Signup_DuplicateEmail(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	cfg := testutil.GetTestConfig()
	handler := NewAuthHandler(db, cfg)

	signupReq := models.SignupRequest{
		Email:    "existing@example.com",
		Password: "password123",
	}
	body, _ := json.Marshal(signupReq)

	// Mock duplicate email error
	mock.ExpectQuery("INSERT INTO users").
		WithArgs(signupReq.Email, sqlmock.AnyArg()).
		WillReturnError(sql.ErrConnDone) // Simulating conflict

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/signup", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.Signup(c)

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestAuthHandler_Login_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	cfg := testutil.GetTestConfig()
	handler := NewAuthHandler(db, cfg)

	password := "password123"
	passwordHash, _ := auth.HashPassword(password)

	loginReq := models.LoginRequest{
		Email:    "test@example.com",
		Password: password,
	}
	body, _ := json.Marshal(loginReq)

	// Mock database response
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "email", "password_hash", "created_at", "updated_at"}).
		AddRow("user-123", loginReq.Email, passwordHash, now, now)

	mock.ExpectQuery("SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email").
		WithArgs(loginReq.Email).
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.Login(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.AuthResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.NotEmpty(t, response.Token)
	assert.Equal(t, loginReq.Email, response.User.Email)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestAuthHandler_Login_UserNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	cfg := testutil.GetTestConfig()
	handler := NewAuthHandler(db, cfg)

	loginReq := models.LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "password123",
	}
	body, _ := json.Marshal(loginReq)

	// Mock user not found
	mock.ExpectQuery("SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email").
		WithArgs(loginReq.Email).
		WillReturnError(sql.ErrNoRows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.Login(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]string
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "invalid email or password", response["error"])
}

func TestAuthHandler_Login_WrongPassword(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	cfg := testutil.GetTestConfig()
	handler := NewAuthHandler(db, cfg)

	correctPassword := "correctpassword"
	passwordHash, _ := auth.HashPassword(correctPassword)

	loginReq := models.LoginRequest{
		Email:    "test@example.com",
		Password: "wrongpassword",
	}
	body, _ := json.Marshal(loginReq)

	// Mock database response with correct hash
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "email", "password_hash", "created_at", "updated_at"}).
		AddRow("user-123", loginReq.Email, passwordHash, now, now)

	mock.ExpectQuery("SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email").
		WithArgs(loginReq.Email).
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.Login(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]string
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "invalid email or password", response["error"])
}

func TestAuthHandler_Login_InvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := testutil.SetupTestDB(t)
	defer db.Close()

	cfg := testutil.GetTestConfig()
	handler := NewAuthHandler(db, cfg)

	body := []byte(`{"email": "test@example.com"`)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.Login(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAuthHandler_Login_DatabaseError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	cfg := testutil.GetTestConfig()
	handler := NewAuthHandler(db, cfg)

	loginReq := models.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}
	body, _ := json.Marshal(loginReq)

	// Mock database error
	mock.ExpectQuery("SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email").
		WithArgs(loginReq.Email).
		WillReturnError(sql.ErrConnDone)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/login", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.Login(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
}
