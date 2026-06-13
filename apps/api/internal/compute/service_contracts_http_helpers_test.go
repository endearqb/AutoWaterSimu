package compute

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func newContractsTestServer(t *testing.T) (*Service, http.Handler) {
	t.Helper()
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	return svc, NewServer(svc, auth, nil).Routes()
}

func validContractExampleBytes(t *testing.T, fixtureName string) []byte {
	t.Helper()
	payload, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", fixtureName))
	if err != nil {
		t.Fatal(err)
	}
	return payload
}

func serveContractRequest(t *testing.T, server http.Handler, method, path string, body []byte, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	return rec
}
