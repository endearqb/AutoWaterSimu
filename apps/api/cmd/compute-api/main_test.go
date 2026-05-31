package main

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"autowatersimu/apps/api/internal/compute"
	platformconfig "autowatersimu/apps/api/internal/platform/config"
)

func TestOpenStoreUsesMemoryStoreWhenDatabaseURLMissing(t *testing.T) {
	store, closeStore, err := openStore(context.Background(), platformconfig.Config{}, t.TempDir())
	if err != nil {
		t.Fatalf("openStore returned error: %v", err)
	}
	defer closeStore()

	if _, ok := store.(*compute.MemoryStore); !ok {
		t.Fatalf("expected memory store fallback, got %T", store)
	}
}

func TestValidateProductionAuthConfigAllowsNonProductionDefaults(t *testing.T) {
	if err := validateProductionAuthConfig(platformconfig.Config{Environment: "local"}); err != nil {
		t.Fatalf("non-production defaults should be accepted: %v", err)
	}
}

func TestValidateProductionAuthConfigRejectsEmptyTokens(t *testing.T) {
	err := validateProductionAuthConfig(platformconfig.Config{Environment: "production"})
	if err == nil || !strings.Contains(err.Error(), "COMPUTE_API_TOKENS_JSON is required") {
		t.Fatalf("expected production empty token config to be rejected, got %v", err)
	}
}

func TestValidateProductionAuthConfigRejectsDefaultDevTokens(t *testing.T) {
	tests := []struct {
		name       string
		tokensJSON string
	}{
		{name: "dev public", tokensJSON: `{"tokens":[{"name":"public","token":"dev-public-token","scopes":["job:read"]}]}`},
		{name: "dev worker", tokensJSON: `{"tokens":[{"name":"worker","token":"dev-worker-token","scopes":["worker:claim"]}]}`},
		{name: "dev admin", tokensJSON: `{"tokens":[{"name":"admin","token":"dev-admin-token","scopes":["artifact:admin"]}]}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateProductionAuthConfig(platformconfig.Config{Environment: "production", TokensJSON: tt.tokensJSON})
			if err == nil || !strings.Contains(err.Error(), "default development token") {
				t.Fatalf("expected default development token to be rejected, got %v", err)
			}
		})
	}
}

func TestValidateProductionAuthConfigAllowsExplicitTokens(t *testing.T) {
	err := validateProductionAuthConfig(platformconfig.Config{
		Environment: "production",
		TokensJSON:  `{"tokens":[{"name":"platform","token":"prod-token-from-secret-manager","scopes":["job:read"]}]}`,
	})
	if err != nil {
		t.Fatalf("expected explicit production token config to be accepted: %v", err)
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
			_, err := openArchiveStore(platformconfig.Config{
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
	store, err := openArchiveStore(platformconfig.Config{
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
	store, err := openArchiveStore(platformconfig.Config{
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
	_, err := openArchiveStore(platformconfig.Config{
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
