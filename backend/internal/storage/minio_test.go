package storage

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetContentType(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     string
	}{
		{
			name:     "jpeg image",
			filename: "photo.jpg",
			want:     "image/jpeg",
		},
		{
			name:     "jpeg image uppercase",
			filename: "photo.JPG",
			want:     "application/octet-stream", // Function is case-sensitive
		},
		{
			name:     "jpeg image alternate extension",
			filename: "photo.jpeg",
			want:     "image/jpeg",
		},
		{
			name:     "png image",
			filename: "screenshot.png",
			want:     "image/png",
		},
		{
			name:     "gif image",
			filename: "animation.gif",
			want:     "image/gif",
		},
		{
			name:     "mp4 video",
			filename: "video.mp4",
			want:     "video/mp4",
		},
		{
			name:     "webm video",
			filename: "video.webm",
			want:     "video/webm",
		},
		{
			name:     "unknown extension",
			filename: "document.pdf",
			want:     "application/octet-stream",
		},
		{
			name:     "no extension",
			filename: "file",
			want:     "application/octet-stream",
		},
		{
			name:     "multiple dots",
			filename: "my.file.name.jpg",
			want:     "image/jpeg",
		},
		{
			name:     "empty filename",
			filename: "",
			want:     "application/octet-stream",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetContentType(tt.filename)
			assert.Equal(t, tt.want, got)
		})
	}
}
