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
