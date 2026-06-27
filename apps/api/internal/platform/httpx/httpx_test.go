package httpx

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWriteJSONSetsContentLength(t *testing.T) {
	response := httptest.NewRecorder()

	WriteJSON(response, http.StatusAccepted, map[string]any{"status": "ok"})

	if response.Code != http.StatusAccepted {
		t.Fatalf("expected status 202, got %d", response.Code)
	}
	if got := response.Header().Get("Content-Type"); got != "application/json" {
		t.Fatalf("expected JSON content type, got %q", got)
	}
	if got := response.Header().Get("Content-Length"); got != "16" {
		t.Fatalf("expected stable content length, got %q", got)
	}
	if got := response.Body.String(); got != "{\"status\":\"ok\"}\n" {
		t.Fatalf("unexpected body: %q", got)
	}
}

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
	allowMethods := response.Header().Get("Access-Control-Allow-Methods")
	for _, method := range []string{http.MethodPatch, http.MethodDelete} {
		if !strings.Contains(allowMethods, method) {
			t.Fatalf("expected %s in allowed methods, got %q", method, allowMethods)
		}
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
