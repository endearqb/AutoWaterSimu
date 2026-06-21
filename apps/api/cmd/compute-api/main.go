package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"autowatersimu/apps/api/internal/compute"
	platformauth "autowatersimu/apps/api/internal/platform/auth"
	platformconfig "autowatersimu/apps/api/internal/platform/config"
)

func main() {
	if err := run(); err != nil {
		slog.Error("compute api failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	config := platformconfig.Config{
		Environment:            getenv("APP_ENV", os.Getenv("ENVIRONMENT")),
		AuthMode:               getenv("COMPUTE_API_AUTH_MODE", platformauth.AuthModeDisabled),
		BindAddr:               os.Getenv("COMPUTE_API_BIND_ADDR"),
		AllowRemoteNoAuth:      boolEnv("COMPUTE_API_ALLOW_REMOTE_NO_AUTH", false),
		DatabaseURL:            os.Getenv("COMPUTE_API_DATABASE_URL"),
		ArtifactDir:            os.Getenv("COMPUTE_API_ARTIFACT_DIR"),
		ArchiveDir:             os.Getenv("COMPUTE_API_ARCHIVE_DIR"),
		ArchiveS3Endpoint:      os.Getenv("COMPUTE_API_ARCHIVE_S3_ENDPOINT"),
		ArchiveS3Bucket:        os.Getenv("COMPUTE_API_ARCHIVE_S3_BUCKET"),
		ArchiveS3Region:        os.Getenv("COMPUTE_API_ARCHIVE_S3_REGION"),
		ArchiveS3AccessKeyID:   os.Getenv("COMPUTE_API_ARCHIVE_S3_ACCESS_KEY_ID"),
		ArchiveS3SecretKey:     os.Getenv("COMPUTE_API_ARCHIVE_S3_SECRET_ACCESS_KEY"),
		ArchiveS3Prefix:        os.Getenv("COMPUTE_API_ARCHIVE_S3_PREFIX"),
		TokensJSON:             os.Getenv("COMPUTE_API_TOKENS_JSON"),
		TokensFile:             os.Getenv("COMPUTE_API_TOKENS_FILE"),
		Port:                   getenv("COMPUTE_API_PORT", "8088"),
		RepoRoot:               os.Getenv("COMPUTE_API_REPO_ROOT"),
		ContractsDir:           os.Getenv("COMPUTE_API_CONTRACTS_DIR"),
		MigrationsDir:          os.Getenv("COMPUTE_API_MIGRATIONS_DIR"),
		RetentionSweepInterval: durationEnv("COMPUTE_API_RETENTION_SWEEP_INTERVAL", 0),
		RetentionSweepDryRun:   boolEnv("COMPUTE_API_RETENTION_SWEEP_DRY_RUN", true),
		RetentionSweepLimit:    intEnv("COMPUTE_API_RETENTION_SWEEP_LIMIT", 100),
	}
	config.AuthMode = normalizeAuthMode(config.AuthMode)
	if err := resolveRuntimePaths(&config); err != nil {
		return err
	}
	if err := validateNoAuthBind(config); err != nil {
		return err
	}
	auth, err := openAuthProvider(&config)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	store, closeStore, err := openStore(ctx, config)
	if err != nil {
		return err
	}
	defer closeStore()
	artifactStore, err := compute.NewLocalArtifactStore(config.ArtifactDir)
	if err != nil {
		return err
	}
	var archiveStore compute.ArtifactStore
	archiveStore, err = openArchiveStore(config)
	if err != nil {
		return err
	}
	if archiveStore != nil {
		provider := "artifact_archive"
		if archiveProvider, ok := archiveStore.(compute.ArtifactArchiveStore); ok {
			provider = archiveProvider.ArchiveProvider()
		}
		slog.Info("artifact archive backend enabled", "provider", provider)
	}
	validator, err := compute.NewContractValidatorFromDir(config.ContractsDir)
	if err != nil {
		return err
	}
	service := compute.NewServiceWithArchive(store, artifactStore, archiveStore, validator)
	schedulerCtx, stopScheduler := context.WithCancel(context.Background())
	defer stopScheduler()
	if config.RetentionSweepInterval > 0 {
		slog.Info(
			"starting artifact retention scheduler",
			"interval", config.RetentionSweepInterval.String(),
			"dry_run", config.RetentionSweepDryRun,
			"limit", config.RetentionSweepLimit,
		)
		if err := compute.StartArtifactRetentionScheduler(
			schedulerCtx,
			service,
			compute.ArtifactRetentionSchedulerOptions{
				Interval: config.RetentionSweepInterval,
				DryRun:   config.RetentionSweepDryRun,
				Limit:    config.RetentionSweepLimit,
			},
			slog.Default(),
		); err != nil {
			return err
		}
	}
	server := compute.NewServer(service, auth, slog.Default())
	listenAddress := httpListenAddress(config)
	slog.Info("starting compute api", "address", listenAddress, "auth_mode", config.AuthMode)
	return http.ListenAndServe(listenAddress, server.Routes())
}

func loadAuthTokensJSON(config platformconfig.Config) (string, error) {
	inlineTokens := strings.TrimSpace(config.TokensJSON)
	tokensFile := strings.TrimSpace(config.TokensFile)
	if inlineTokens != "" && tokensFile != "" {
		return "", fmt.Errorf("set either COMPUTE_API_TOKENS_JSON or COMPUTE_API_TOKENS_FILE, not both")
	}
	if tokensFile == "" {
		return config.TokensJSON, nil
	}
	tokensBytes, err := os.ReadFile(tokensFile)
	if err != nil {
		return "", fmt.Errorf("read COMPUTE_API_TOKENS_FILE: %w", err)
	}
	if strings.TrimSpace(string(tokensBytes)) == "" {
		return "", fmt.Errorf("COMPUTE_API_TOKENS_FILE must not be empty")
	}
	return string(tokensBytes), nil
}

func openAuthProvider(config *platformconfig.Config) (platformauth.PrincipalProvider, error) {
	if normalizeAuthMode(config.AuthMode) != platformauth.AuthModeStaticToken {
		if err := validateProductionAuthConfig(*config); err != nil {
			return nil, err
		}
		return platformauth.NewProvider(config.AuthMode, "")
	}
	tokensJSON, err := loadAuthTokensJSON(*config)
	if err != nil {
		return nil, err
	}
	config.TokensJSON = tokensJSON
	if err := validateProductionAuthConfig(*config); err != nil {
		return nil, err
	}
	return platformauth.NewProvider(config.AuthMode, tokensJSON)
}

func validateProductionAuthConfig(config platformconfig.Config) error {
	if !isProductionEnv(config.Environment) {
		return nil
	}
	if normalizeAuthMode(config.AuthMode) == platformauth.AuthModeDisabled {
		return fmt.Errorf("COMPUTE_API_AUTH_MODE=disabled is not allowed when APP_ENV or ENVIRONMENT is production")
	}
	if strings.TrimSpace(config.TokensJSON) == "" {
		return fmt.Errorf("COMPUTE_API_TOKENS_JSON or COMPUTE_API_TOKENS_FILE is required when APP_ENV or ENVIRONMENT is production")
	}
	var tokenConfig platformauth.TokenConfig
	if err := json.Unmarshal([]byte(config.TokensJSON), &tokenConfig); err != nil {
		return fmt.Errorf("compute API token config JSON is invalid")
	}
	if len(tokenConfig.Tokens) == 0 {
		return fmt.Errorf("compute API token config must define at least one token when APP_ENV or ENVIRONMENT is production")
	}
	for _, token := range tokenConfig.Tokens {
		if isDefaultDevelopmentToken(token.Token) {
			return fmt.Errorf("default development token value for %q is not allowed when APP_ENV or ENVIRONMENT is production", token.Name)
		}
	}
	return nil
}

func normalizeAuthMode(mode string) string {
	if strings.TrimSpace(mode) == "" {
		return platformauth.AuthModeDisabled
	}
	return strings.TrimSpace(mode)
}

func resolveRuntimePaths(config *platformconfig.Config) error {
	if strings.TrimSpace(config.Port) == "" {
		config.Port = "8088"
	}
	if strings.TrimSpace(config.ArtifactDir) == "" {
		config.ArtifactDir = filepath.Join("tmp", "compute-api-artifacts")
	}
	needsRepoRoot := strings.TrimSpace(config.ContractsDir) == "" ||
		(strings.TrimSpace(config.DatabaseURL) != "" && strings.TrimSpace(config.MigrationsDir) == "")
	if strings.TrimSpace(config.RepoRoot) == "" && needsRepoRoot {
		repoRoot, err := findRepoRoot()
		if err != nil {
			return fmt.Errorf("resolve repo root for compute API runtime paths: %w", err)
		}
		config.RepoRoot = repoRoot
	}
	if strings.TrimSpace(config.ContractsDir) == "" {
		config.ContractsDir = filepath.Join(config.RepoRoot, "contracts")
	}
	if strings.TrimSpace(config.DatabaseURL) != "" && strings.TrimSpace(config.MigrationsDir) == "" {
		config.MigrationsDir = filepath.Join(config.RepoRoot, "apps", "api", "migrations")
	}
	return nil
}

func isProductionEnv(environment string) bool {
	return strings.EqualFold(strings.TrimSpace(environment), "production")
}

func isDefaultDevelopmentToken(token string) bool {
	switch strings.TrimSpace(token) {
	case "dev-public-token", "dev-worker-token", "dev-admin-token":
		return true
	default:
		return false
	}
}

func validateNoAuthBind(config platformconfig.Config) error {
	if normalizeAuthMode(config.AuthMode) != platformauth.AuthModeDisabled || config.AllowRemoteNoAuth {
		return nil
	}
	bindAddr := httpBindAddress(config)
	if isLoopbackBind(bindAddr) {
		return nil
	}
	return fmt.Errorf("COMPUTE_API_AUTH_MODE=disabled requires loopback COMPUTE_API_BIND_ADDR or COMPUTE_API_ALLOW_REMOTE_NO_AUTH=true")
}

func httpListenAddress(config platformconfig.Config) string {
	return net.JoinHostPort(httpBindAddress(config), config.Port)
}

func httpBindAddress(config platformconfig.Config) string {
	bindAddr := strings.TrimSpace(config.BindAddr)
	if bindAddr == "" && normalizeAuthMode(config.AuthMode) == platformauth.AuthModeDisabled {
		return "127.0.0.1"
	}
	return bindAddr
}

func isLoopbackBind(bindAddr string) bool {
	host := strings.Trim(strings.TrimSpace(bindAddr), "[]")
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func openStore(ctx context.Context, config platformconfig.Config) (compute.Store, func(), error) {
	if config.DatabaseURL == "" {
		slog.Warn("COMPUTE_API_DATABASE_URL not set; using in-memory compute metadata store")
		return compute.NewMemoryStore(), func() {}, nil
	}
	store, err := compute.OpenPostgresStore(ctx, config.DatabaseURL)
	if err != nil {
		return nil, nil, err
	}
	if strings.TrimSpace(config.MigrationsDir) == "" {
		store.Close()
		return nil, nil, fmt.Errorf("COMPUTE_API_MIGRATIONS_DIR is required when COMPUTE_API_DATABASE_URL is set")
	}
	if err := store.ApplyMigrations(ctx, config.MigrationsDir); err != nil {
		store.Close()
		return nil, nil, err
	}
	return store, store.Close, nil
}

func openArchiveStore(config platformconfig.Config) (compute.ArtifactStore, error) {
	if s3ArchiveConfigured(config) {
		if strings.TrimSpace(config.ArchiveDir) != "" {
			return nil, fmt.Errorf("set either COMPUTE_API_ARCHIVE_DIR or COMPUTE_API_ARCHIVE_S3_ENDPOINT, not both")
		}
		return compute.NewS3ArtifactStore(compute.S3ArtifactStoreOptions{
			Endpoint:        config.ArchiveS3Endpoint,
			Bucket:          config.ArchiveS3Bucket,
			Region:          config.ArchiveS3Region,
			AccessKeyID:     config.ArchiveS3AccessKeyID,
			SecretAccessKey: config.ArchiveS3SecretKey,
			Prefix:          config.ArchiveS3Prefix,
		})
	}
	if strings.TrimSpace(config.ArchiveDir) == "" {
		return nil, nil
	}
	overlap, err := localArchiveDirsOverlap(config.ArtifactDir, config.ArchiveDir)
	if err != nil {
		return nil, err
	}
	if overlap {
		return nil, fmt.Errorf("COMPUTE_API_ARCHIVE_DIR must not be the same as or nested with COMPUTE_API_ARTIFACT_DIR")
	}
	return compute.NewLocalArtifactStore(config.ArchiveDir)
}

func s3ArchiveConfigured(config platformconfig.Config) bool {
	return strings.TrimSpace(config.ArchiveS3Endpoint) != "" ||
		strings.TrimSpace(config.ArchiveS3Bucket) != "" ||
		strings.TrimSpace(config.ArchiveS3Region) != "" ||
		strings.TrimSpace(config.ArchiveS3AccessKeyID) != "" ||
		config.ArchiveS3SecretKey != "" ||
		strings.TrimSpace(config.ArchiveS3Prefix) != ""
}

func localArchiveDirsOverlap(artifactDir, archiveDir string) (bool, error) {
	artifactAbs, err := filepath.Abs(artifactDir)
	if err != nil {
		return false, err
	}
	archiveAbs, err := filepath.Abs(archiveDir)
	if err != nil {
		return false, err
	}
	artifactAbs = filepath.Clean(artifactAbs)
	archiveAbs = filepath.Clean(archiveAbs)
	if artifactAbs == archiveAbs {
		return true, nil
	}
	archiveInArtifact, err := pathIsWithin(archiveAbs, artifactAbs)
	if err != nil {
		return false, err
	}
	artifactInArchive, err := pathIsWithin(artifactAbs, archiveAbs)
	if err != nil {
		return false, err
	}
	return archiveInArtifact || artifactInArchive, nil
}

func pathIsWithin(path, parent string) (bool, error) {
	rel, err := filepath.Rel(parent, path)
	if err != nil {
		return false, err
	}
	if rel == "." {
		return true, nil
	}
	return rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && !filepath.IsAbs(rel), nil
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	duration, err := time.ParseDuration(value)
	if err != nil {
		slog.Warn("invalid duration env; using fallback", "key", key, "value", value, "fallback", fallback.String())
		return fallback
	}
	return duration
}

func boolEnv(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		slog.Warn("invalid bool env; using fallback", "key", key, "value", value, "fallback", fallback)
		return fallback
	}
	return parsed
}

func intEnv(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 0 {
		slog.Warn("invalid int env; using fallback", "key", key, "value", value, "fallback", fallback)
		return fallback
	}
	return parsed
}

func findRepoRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(wd, "contracts", "compute_job.v1.json")); err == nil {
			return wd, nil
		}
		next := filepath.Dir(wd)
		if next == wd {
			return "", os.ErrNotExist
		}
		wd = next
	}
}
