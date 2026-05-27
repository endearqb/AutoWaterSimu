package compute

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestPostgresMigrationsUpSmoke(t *testing.T) {
	databaseURL := os.Getenv("COMPUTE_API_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("COMPUTE_API_DATABASE_URL is not set; skipping PostgreSQL migration smoke")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	store, err := OpenPostgresStore(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	if err := store.ApplyMigrations(ctx, filepath.Join(repoRootForTest(t), "apps", "api", "migrations")); err != nil {
		t.Fatal(err)
	}
}
