package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWithLocalCORSAllowsLoopbackOptions(t *testing.T) {
	handler := WithLocalCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next handler should not run for CORS preflight")
	}))
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/compute/jobs", nil)
	request.Header.Set("Origin", "http://localhost:5173")
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", response.Code)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Fatalf("expected local origin to be echoed, got %q", got)
	}
	if got := response.Header().Get("Access-Control-Expose-Headers"); got != "X-Artifact-Checksum, X-Evidence-Checksum" {
		t.Fatalf("expected checksum expose headers, got %q", got)
	}
}

func TestWithLocalCORSRejectsNonLoopbackOrigin(t *testing.T) {
	handler := WithLocalCORS(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusAccepted)
	}))
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	request.Header.Set("Origin", "https://example.com")
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusAccepted {
		t.Fatalf("expected wrapped handler status, got %d", response.Code)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("expected no CORS allow origin, got %q", got)
	}
}
