package compute

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strings"
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

func TestPostgresMigrationsDownSmoke(t *testing.T) {
	if os.Getenv("COMPUTE_API_MIGRATION_DOWN_SMOKE") != "true" {
		t.Skip("COMPUTE_API_MIGRATION_DOWN_SMOKE=true is required because down migrations drop metadata tables")
	}
	databaseURL := os.Getenv("COMPUTE_API_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("COMPUTE_API_DATABASE_URL is not set; skipping PostgreSQL migration down smoke")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	store, err := OpenPostgresStore(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	migrationsDir := filepath.Join(repoRootForTest(t), "apps", "api", "migrations")
	if err := store.ApplyMigrations(ctx, migrationsDir); err != nil {
		t.Fatal(err)
	}
	downs, err := downMigrationFiles(migrationsDir)
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range downs {
		sqlBytes, err := os.ReadFile(filepath.Join(migrationsDir, name))
		if err != nil {
			t.Fatal(err)
		}
		if _, err := store.pool.Exec(ctx, string(sqlBytes)); err != nil {
			t.Fatalf("%s failed: %v", name, err)
		}
	}
}

func downMigrationFiles(migrationsDir string) ([]string, error) {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return nil, err
	}
	var downs []string
	for _, entry := range entries {
		name := entry.Name()
		if strings.HasSuffix(name, ".down.sql") {
			downs = append(downs, name)
		}
	}
	sort.Sort(sort.Reverse(sort.StringSlice(downs)))
	return downs, nil
}
