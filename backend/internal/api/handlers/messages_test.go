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
	"github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"why-backend/internal/models"
	"why-backend/internal/testutil"
)

func TestMessageHandler_CreateMessage_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	handler := NewMessageHandler(db)

	createReq := models.CreateMessageRequest{
		Content:   "Test message content",
		MediaURLs: []string{"https://example.com/image1.jpg"},
	}
	body, _ := json.Marshal(createReq)

	// Mock database response
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "user_id", "content", "media_urls", "created_at", "updated_at"}).
		AddRow("msg-123", "user-123", createReq.Content, pq.Array(createReq.MediaURLs), now, now)

	mock.ExpectQuery("INSERT INTO messages").
		WithArgs("user-123", createReq.Content, sqlmock.AnyArg()).
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/messages", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", "user-123") // Simulate auth middleware

	handler.CreateMessage(c)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response models.Message
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "msg-123", response.ID)
	assert.Equal(t, createReq.Content, response.Content)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestMessageHandler_CreateMessage_InvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := testutil.SetupTestDB(t)
	defer db.Close()

	handler := NewMessageHandler(db)

	body := []byte(`{"content":`)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/messages", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", "user-123")

	handler.CreateMessage(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestMessageHandler_CreateMessage_MissingContent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, _ := testutil.SetupTestDB(t)
	defer db.Close()

	handler := NewMessageHandler(db)

	createReq := models.CreateMessageRequest{
		Content:   "", // Empty content should fail validation
		MediaURLs: []string{},
	}
	body, _ := json.Marshal(createReq)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/messages", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", "user-123")

	handler.CreateMessage(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestMessageHandler_ListMessages_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	handler := NewMessageHandler(db)

	// Mock database response with multiple messages
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "user_id", "content", "media_urls", "created_at", "updated_at"}).
		AddRow("msg-1", "user-1", "First message", pq.StringArray{}, now, now).
		AddRow("msg-2", "user-2", "Second message", pq.StringArray{"url1"}, now, now)

	mock.ExpectQuery("SELECT id, user_id, content, media_urls, created_at, updated_at FROM messages").
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/messages", nil)

	handler.ListMessages(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.Message
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Len(t, response, 2)
	assert.Equal(t, "msg-1", response[0].ID)
	assert.Equal(t, "msg-2", response[1].ID)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestMessageHandler_ListMessages_Empty(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	handler := NewMessageHandler(db)

	// Mock empty result
	rows := sqlmock.NewRows([]string{"id", "user_id", "content", "media_urls", "created_at", "updated_at"})

	mock.ExpectQuery("SELECT id, user_id, content, media_urls, created_at, updated_at FROM messages").
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/messages", nil)

	handler.ListMessages(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.Message
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Nil(t, response) // Empty array should be nil
}

func TestMessageHandler_GetMessage_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	handler := NewMessageHandler(db)

	messageID := "msg-123"
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "user_id", "content", "media_urls", "created_at", "updated_at"}).
		AddRow(messageID, "user-123", "Test message", pq.StringArray{}, now, now)

	mock.ExpectQuery("SELECT id, user_id, content, media_urls, created_at, updated_at FROM messages WHERE id").
		WithArgs(messageID).
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/messages/"+messageID, nil)
	c.Params = gin.Params{{Key: "id", Value: messageID}}

	handler.GetMessage(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response models.Message
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, messageID, response.ID)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestMessageHandler_GetMessage_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	handler := NewMessageHandler(db)

	messageID := "nonexistent"

	mock.ExpectQuery("SELECT id, user_id, content, media_urls, created_at, updated_at FROM messages WHERE id").
		WithArgs(messageID).
		WillReturnError(sql.ErrNoRows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/messages/"+messageID, nil)
	c.Params = gin.Params{{Key: "id", Value: messageID}}

	handler.GetMessage(c)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestMessageHandler_CreateReply_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	handler := NewMessageHandler(db)

	messageID := "msg-123"
	createReq := models.CreateReplyRequest{
		Content:   "Test reply content",
		MediaURLs: []string{},
	}
	body, _ := json.Marshal(createReq)

	// Mock database response
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "message_id", "user_id", "content", "media_urls", "created_at", "updated_at"}).
		AddRow("reply-123", messageID, "user-123", createReq.Content, pq.Array(createReq.MediaURLs), now, now)

	mock.ExpectQuery("INSERT INTO replies").
		WithArgs(messageID, "user-123", createReq.Content, sqlmock.AnyArg()).
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/messages/"+messageID+"/replies", bytes.NewBuffer(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: messageID}}
	c.Set("user_id", "user-123")

	handler.CreateReply(c)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response models.Reply
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "reply-123", response.ID)
	assert.Equal(t, messageID, response.MessageID)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestMessageHandler_ListReplies_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	handler := NewMessageHandler(db)

	messageID := "msg-123"
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "message_id", "user_id", "content", "media_urls", "created_at", "updated_at"}).
		AddRow("reply-1", messageID, "user-1", "First reply", pq.StringArray{}, now, now).
		AddRow("reply-2", messageID, "user-2", "Second reply", pq.StringArray{}, now, now)

	mock.ExpectQuery("SELECT id, message_id, user_id, content, media_urls, created_at, updated_at FROM replies WHERE message_id").
		WithArgs(messageID).
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/messages/"+messageID+"/replies", nil)
	c.Params = gin.Params{{Key: "id", Value: messageID}}

	handler.ListReplies(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.Reply
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Len(t, response, 2)
	assert.Equal(t, "reply-1", response[0].ID)
	assert.Equal(t, "reply-2", response[1].ID)

	err = mock.ExpectationsWereMet()
	assert.NoError(t, err)
}

func TestMessageHandler_ListReplies_Empty(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, mock := testutil.SetupTestDB(t)
	defer db.Close()

	handler := NewMessageHandler(db)

	messageID := "msg-123"
	rows := sqlmock.NewRows([]string{"id", "message_id", "user_id", "content", "media_urls", "created_at", "updated_at"})

	mock.ExpectQuery("SELECT id, message_id, user_id, content, media_urls, created_at, updated_at FROM replies WHERE message_id").
		WithArgs(messageID).
		WillReturnRows(rows)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/messages/"+messageID+"/replies", nil)
	c.Params = gin.Params{{Key: "id", Value: messageID}}

	handler.ListReplies(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []models.Reply
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Nil(t, response)
}
