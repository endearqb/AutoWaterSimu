package compute

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func newModelCatalogTestServer(t *testing.T, tokenConfig string) (*Service, http.Handler) {
	t.Helper()
	svc := testValidatedService(t)
	auth, err := NewAuthenticator(tokenConfig)
	if err != nil {
		t.Fatal(err)
	}
	return svc, NewServer(svc, auth, nil).Routes()
}

func modelCatalogExampleBytes(t *testing.T) []byte {
	t.Helper()
	catalogBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", "material_balance.model_catalog.v1.json"))
	if err != nil {
		t.Fatal(err)
	}
	return catalogBytes
}

func serveModelCatalogRequest(t *testing.T, server http.Handler, method, path string, body []byte, token string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	return rec
}
