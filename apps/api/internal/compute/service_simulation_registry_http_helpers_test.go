package compute

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newSimulationRegistryTestServer(t *testing.T, tokenConfig string) (*Service, http.Handler) {
	t.Helper()
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(tokenConfig)
	if err != nil {
		t.Fatal(err)
	}
	return svc, NewServer(svc, auth, nil).Routes()
}

func serveSimulationRegistryRequest(t *testing.T, server http.Handler, method, path string, body []byte, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	return rec
}

func postSimulationRegistryRequest(t *testing.T, server http.Handler, path string, body []byte, token string, expectedStatus int) *httptest.ResponseRecorder {
	t.Helper()
	rec := serveSimulationRegistryRequest(t, server, http.MethodPost, path, body, token)
	if rec.Code != expectedStatus {
		t.Fatalf("registry mutation %s with %s got %d want %d: %s", path, token, rec.Code, expectedStatus, rec.Body.String())
	}
	return rec
}
