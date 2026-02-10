package handlers

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"why-backend/internal/testutil"
)

func TestMediaHandler_UploadMedia_MissingFile(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := testutil.GetTestConfig()

	// Create handler with nil minio client (won't be called for this test)
	handler := NewMediaHandler(nil, cfg)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/media", nil)
	c.Request.Header.Set("Content-Type", "multipart/form-data")

	handler.UploadMedia(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestMediaHandler_UploadMedia_InvalidFormData(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := testutil.GetTestConfig()

	handler := NewMediaHandler(nil, cfg)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/media", nil)
	c.Request.Header.Set("Content-Type", "application/json") // Wrong content type

	handler.UploadMedia(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func createMultipartFormData(t *testing.T, fieldName, fileName string, fileContent []byte) (*bytes.Buffer, string) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile(fieldName, fileName)
	if err != nil {
		t.Fatal(err)
	}

	_, err = part.Write(fileContent)
	if err != nil {
		t.Fatal(err)
	}

	err = writer.Close()
	if err != nil {
		t.Fatal(err)
	}

	return body, writer.FormDataContentType()
}

// Note: Full integration tests for MinIO uploads would require:
// 1. A mock MinIO client implementation
// 2. Or a test MinIO instance
// 3. Or using an interface for MinIO and mocking it
//
// For comprehensive testing, consider creating an interface wrapper around
// minio.Client and using dependency injection to allow mocking in tests.
// This would enable testing the full upload flow without requiring a real MinIO instance.
//
// Example interface:
// type MinIOClient interface {
//     PutObject(ctx, bucket, name string, reader io.Reader, size int64, opts PutObjectOptions) (UploadInfo, error)
// }
