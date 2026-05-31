package artifacts

import (
	"testing"
	"time"
)

func TestRetentionFromMetadataDefaultsToRetainForever(t *testing.T) {
	retention, err := RetentionFromMetadata(nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retention.Policy != PolicyRetainForever || retention.RetainUntil != nil {
		t.Fatalf("unexpected default retention: %#v", retention)
	}
}

func TestRetentionFromMetadataParsesTTLRetainUntil(t *testing.T) {
	retention, err := RetentionFromMetadata(map[string]any{
		"retention_policy": " ttl ",
		"retain_until":     "2026-06-01T00:00:00Z",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if retention.Policy != PolicyTTL || retention.RetainUntil == nil {
		t.Fatalf("unexpected retention: %#v", retention)
	}
	if got, want := retention.RetainUntil.UTC().Format(time.RFC3339), "2026-06-01T00:00:00Z"; got != want {
		t.Fatalf("retain_until mismatch: got %s want %s", got, want)
	}
}

func TestRetentionFromMetadataRejectsInvalidValues(t *testing.T) {
	if _, err := RetentionFromMetadata(map[string]any{"retention_policy": "delete_now"}); err == nil || err.Error() != "retention_policy is invalid" {
		t.Fatalf("expected invalid retention_policy error, got %v", err)
	}
	if _, err := RetentionFromMetadata(map[string]any{"retention_policy": PolicyTTL, "retain_until": "not-a-time"}); err == nil || err.Error() != "retain_until must be RFC3339" {
		t.Fatalf("expected invalid retain_until error, got %v", err)
	}
}

func TestIsRetentionCandidate(t *testing.T) {
	for _, policy := range []string{PolicyTTL, " " + PolicyArchiveCandidate + " "} {
		if !IsRetentionCandidate(policy) {
			t.Fatalf("expected %q to be a retention candidate", policy)
		}
	}
	for _, policy := range []string{"", PolicyRetainForever, "delete_now"} {
		if IsRetentionCandidate(policy) {
			t.Fatalf("expected %q not to be a retention candidate", policy)
		}
	}
}
