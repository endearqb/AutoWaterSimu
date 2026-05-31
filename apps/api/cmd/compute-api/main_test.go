package main

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"autowatersimu/apps/api/internal/compute"
)

func TestOpenStoreUsesMemoryStoreWhenDatabaseURLMissing(t *testing.T) {
	store, closeStore, err := openStore(context.Background(), compute.Config{}, t.TempDir())
	if err != nil {
		t.Fatalf("openStore returned error: %v", err)
	}
	defer closeStore()

	if _, ok := store.(*compute.MemoryStore); !ok {
		t.Fatalf("expected memory store fallback, got %T", store)
	}
}

func TestOpenArchiveStoreRejectsOverlappingArtifactDirs(t *testing.T) {
	base := t.TempDir()
	artifactDir := filepath.Join(base, "artifacts")
	tests := []struct {
		name       string
		archiveDir string
	}{
		{name: "same", archiveDir: artifactDir},
		{name: "archive inside artifacts", archiveDir: filepath.Join(artifactDir, "archives")},
		{name: "artifacts inside archive", archiveDir: base},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := openArchiveStore(compute.Config{
				ArtifactDir: artifactDir,
				ArchiveDir:  tt.archiveDir,
			})
			if err == nil || !strings.Contains(err.Error(), "COMPUTE_API_ARCHIVE_DIR") {
				t.Fatalf("expected overlapping archive dir error, got %v", err)
			}
		})
	}
}

func TestOpenArchiveStoreAllowsSeparateArtifactDirs(t *testing.T) {
	base := t.TempDir()
	store, err := openArchiveStore(compute.Config{
		ArtifactDir: filepath.Join(base, "artifacts"),
		ArchiveDir:  filepath.Join(base, "archives"),
	})
	if err != nil {
		t.Fatalf("expected separate archive dir to be accepted: %v", err)
	}
	if store == nil {
		t.Fatalf("expected archive store")
	}
}

func TestOpenArchiveStoreAllowsS3ArchiveBackend(t *testing.T) {
	store, err := openArchiveStore(compute.Config{
		ArtifactDir:          t.TempDir(),
		ArchiveS3Endpoint:    "https://archive.example.test",
		ArchiveS3Bucket:      "autowatersimu-archive",
		ArchiveS3Region:      "us-east-1",
		ArchiveS3AccessKeyID: "test-access",
		ArchiveS3SecretKey:   "test-secret",
		ArchiveS3Prefix:      "compute-api",
	})
	if err != nil {
		t.Fatalf("expected s3 archive store to be accepted: %v", err)
	}
	archiveStore, ok := store.(compute.ArtifactArchiveStore)
	if !ok || archiveStore.ArchiveProvider() != "s3_archive" {
		t.Fatalf("expected s3 archive provider, got %T", store)
	}
}

func TestOpenArchiveStoreRejectsAmbiguousArchiveBackends(t *testing.T) {
	_, err := openArchiveStore(compute.Config{
		ArtifactDir:          filepath.Join(t.TempDir(), "artifacts"),
		ArchiveDir:           filepath.Join(t.TempDir(), "archives"),
		ArchiveS3Endpoint:    "https://archive.example.test",
		ArchiveS3Bucket:      "autowatersimu-archive",
		ArchiveS3AccessKeyID: "test-access",
		ArchiveS3SecretKey:   "test-secret",
	})
	if err == nil || !strings.Contains(err.Error(), "COMPUTE_API_ARCHIVE_DIR") {
		t.Fatalf("expected ambiguous archive backend error, got %v", err)
	}
}
