package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"autowatersimu/apps/api/internal/compute"
)

func main() {
	if err := run(); err != nil {
		slog.Error("compute api failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	repoRoot, err := findRepoRoot()
	if err != nil {
		return err
	}
	config := compute.Config{
		DatabaseURL:            os.Getenv("COMPUTE_API_DATABASE_URL"),
		ArtifactDir:            getenv("COMPUTE_API_ARTIFACT_DIR", filepath.Join(repoRoot, "tmp", "compute-api-artifacts")),
		TokensJSON:             os.Getenv("COMPUTE_API_TOKENS_JSON"),
		Port:                   getenv("COMPUTE_API_PORT", "8088"),
		RepoRoot:               repoRoot,
		RetentionSweepInterval: durationEnv("COMPUTE_API_RETENTION_SWEEP_INTERVAL", 0),
		RetentionSweepDryRun:   boolEnv("COMPUTE_API_RETENTION_SWEEP_DRY_RUN", true),
		RetentionSweepLimit:    intEnv("COMPUTE_API_RETENTION_SWEEP_LIMIT", 100),
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	store, closeStore, err := openStore(ctx, config, filepath.Join(repoRoot, "apps", "api", "migrations"))
	if err != nil {
		return err
	}
	defer closeStore()
	artifactStore, err := compute.NewLocalArtifactStore(config.ArtifactDir)
	if err != nil {
		return err
	}
	validator, err := compute.NewContractValidator(config.RepoRoot)
	if err != nil {
		return err
	}
	auth, err := compute.NewAuthenticator(config.TokensJSON)
	if err != nil {
		return err
	}
	service := compute.NewService(store, artifactStore, validator)
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
	slog.Info("starting compute api", "port", config.Port)
	return http.ListenAndServe(":"+config.Port, server.Routes())
}

func openStore(ctx context.Context, config compute.Config, migrationsDir string) (compute.Store, func(), error) {
	if config.DatabaseURL == "" {
		slog.Warn("COMPUTE_API_DATABASE_URL not set; using in-memory compute metadata store")
		return compute.NewMemoryStore(), func() {}, nil
	}
	store, err := compute.OpenPostgresStore(ctx, config.DatabaseURL)
	if err != nil {
		return nil, nil, err
	}
	if err := store.ApplyMigrations(ctx, migrationsDir); err != nil {
		store.Close()
		return nil, nil, err
	}
	return store, store.Close, nil
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
