package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"autowatersimu/apps/api/internal/compute"
	platformauth "autowatersimu/apps/api/internal/platform/auth"
	platformconfig "autowatersimu/apps/api/internal/platform/config"
)

func TestOpenStoreUsesMemoryStoreWhenDatabaseURLMissing(t *testing.T) {
	store, closeStore, err := openStore(context.Background(), platformconfig.Config{})
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

func TestValidateProductionAuthConfigRejectsDisabledAuthMode(t *testing.T) {
	err := validateProductionAuthConfig(platformconfig.Config{Environment: "production", AuthMode: platformauth.AuthModeDisabled})
	if err == nil || !strings.Contains(err.Error(), "COMPUTE_API_AUTH_MODE=disabled") {
		t.Fatalf("expected production disabled auth mode to be rejected, got %v", err)
	}
}

func TestValidateProductionAuthConfigRejectsEmptyStaticTokens(t *testing.T) {
	err := validateProductionAuthConfig(platformconfig.Config{Environment: "production", AuthMode: platformauth.AuthModeStaticToken})
	if err == nil || !strings.Contains(err.Error(), "COMPUTE_API_TOKENS_JSON or COMPUTE_API_TOKENS_FILE is required") {
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
			err := validateProductionAuthConfig(platformconfig.Config{Environment: "production", AuthMode: platformauth.AuthModeStaticToken, TokensJSON: tt.tokensJSON})
			if err == nil || !strings.Contains(err.Error(), "default development token") {
				t.Fatalf("expected default development token to be rejected, got %v", err)
			}
		})
	}
}

func TestValidateProductionAuthConfigAllowsExplicitTokens(t *testing.T) {
	config := platformconfig.Config{
		Environment: "production",
		AuthMode:    platformauth.AuthModeStaticToken,
		TokensJSON:  `{"tokens":[{"name":"platform","token":"prod-token-from-secret-manager","scopes":["job:read"]}]}`,
	}
	tokensJSON, err := loadAuthTokensJSON(config)
	if err != nil {
		t.Fatalf("expected explicit production token config to load: %v", err)
	}
	config.TokensJSON = tokensJSON
	err = validateProductionAuthConfig(config)
	if err != nil {
		t.Fatalf("expected explicit production token config to be accepted: %v", err)
	}
}

func TestLoadAuthTokensJSONReadsTokenFile(t *testing.T) {
	tokensPath := filepath.Join(t.TempDir(), "compute-api-tokens.json")
	expected := `{"tokens":[{"name":"platform","token":"prod-token-from-mounted-secret","scopes":["job:read"]}]}`
	if err := os.WriteFile(tokensPath, []byte(expected), 0o600); err != nil {
		t.Fatalf("write token fixture: %v", err)
	}
	config := platformconfig.Config{
		Environment: "production",
		AuthMode:    platformauth.AuthModeStaticToken,
		TokensFile:  tokensPath,
	}
	tokensJSON, err := loadAuthTokensJSON(config)
	if err != nil {
		t.Fatalf("expected token file to load: %v", err)
	}
	if strings.TrimSpace(tokensJSON) != expected {
		t.Fatalf("unexpected token file contents: %q", tokensJSON)
	}
	config.TokensJSON = tokensJSON
	if err := validateProductionAuthConfig(config); err != nil {
		t.Fatalf("expected token file source to pass production guard: %v", err)
	}
}

func TestLoadAuthTokensJSONRejectsAmbiguousSources(t *testing.T) {
	tokensPath := filepath.Join(t.TempDir(), "compute-api-tokens.json")
	if err := os.WriteFile(tokensPath, []byte(`{"tokens":[]}`), 0o600); err != nil {
		t.Fatalf("write token fixture: %v", err)
	}
	_, err := loadAuthTokensJSON(platformconfig.Config{
		TokensJSON: `{"tokens":[{"name":"platform","token":"prod-token","scopes":["job:read"]}]}`,
		TokensFile: tokensPath,
	})
	if err == nil || !strings.Contains(err.Error(), "set either COMPUTE_API_TOKENS_JSON or COMPUTE_API_TOKENS_FILE") {
		t.Fatalf("expected ambiguous token source error, got %v", err)
	}
}

func TestLoadAuthTokensJSONRejectsEmptyTokenFile(t *testing.T) {
	tokensPath := filepath.Join(t.TempDir(), "compute-api-tokens.json")
	if err := os.WriteFile(tokensPath, []byte("  \n"), 0o600); err != nil {
		t.Fatalf("write token fixture: %v", err)
	}
	_, err := loadAuthTokensJSON(platformconfig.Config{TokensFile: tokensPath})
	if err == nil || !strings.Contains(err.Error(), "COMPUTE_API_TOKENS_FILE must not be empty") {
		t.Fatalf("expected empty token file error, got %v", err)
	}
}

func TestValidateNoAuthBindRejectsRemoteBindByDefault(t *testing.T) {
	err := validateNoAuthBind(platformconfig.Config{
		AuthMode: platformauth.AuthModeDisabled,
		BindAddr: "0.0.0.0",
	})
	if err == nil || !strings.Contains(err.Error(), "COMPUTE_API_AUTH_MODE=disabled requires loopback") {
		t.Fatalf("expected remote no-auth bind to be rejected, got %v", err)
	}
}

func TestValidateNoAuthBindAllowsLoopbackDefault(t *testing.T) {
	config := platformconfig.Config{AuthMode: platformauth.AuthModeDisabled, Port: "8088"}
	if err := validateNoAuthBind(config); err != nil {
		t.Fatalf("expected default disabled auth bind to be loopback-safe: %v", err)
	}
	if got := httpListenAddress(config); got != "127.0.0.1:8088" {
		t.Fatalf("unexpected default listen address before port resolution: %q", got)
	}
}

func TestValidateNoAuthBindAllowsExplicitRemoteOverride(t *testing.T) {
	err := validateNoAuthBind(platformconfig.Config{
		AuthMode:          platformauth.AuthModeDisabled,
		BindAddr:          "0.0.0.0",
		AllowRemoteNoAuth: true,
	})
	if err != nil {
		t.Fatalf("expected explicit remote no-auth override to pass: %v", err)
	}
}

func TestResolveRuntimePathsUsesExplicitContractAndMigrationDirs(t *testing.T) {
	config := platformconfig.Config{
		DatabaseURL:   "postgres://example",
		ContractsDir:  filepath.Join(t.TempDir(), "contracts"),
		MigrationsDir: filepath.Join(t.TempDir(), "migrations"),
	}
	if err := resolveRuntimePaths(&config); err != nil {
		t.Fatalf("resolveRuntimePaths returned error: %v", err)
	}
	if config.RepoRoot != "" {
		t.Fatalf("expected explicit runtime dirs to avoid repo root discovery, got %q", config.RepoRoot)
	}
	if config.Port != "8088" {
		t.Fatalf("expected default port, got %q", config.Port)
	}
	if config.ArtifactDir == "" {
		t.Fatalf("expected artifact dir default")
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
