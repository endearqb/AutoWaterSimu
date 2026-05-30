package main

import (
	"context"
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
