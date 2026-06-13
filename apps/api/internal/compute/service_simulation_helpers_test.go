package compute

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func newSimulationTestServer(t *testing.T) (*Service, http.Handler) {
	t.Helper()
	svc := testValidatedService(t)
	auth, err := NewAuthenticator("")
	if err != nil {
		t.Fatal(err)
	}
	return svc, NewServer(svc, auth, nil).Routes()
}

func validContractFixture(t *testing.T, fixtureName string) []byte {
	t.Helper()
	fixtureBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", fixtureName))
	if err != nil {
		t.Fatal(err)
	}
	return fixtureBytes
}

func serveWithToken(t *testing.T, server http.Handler, method, target, token string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		reader = bytes.NewReader(body)
	}
	req := httptest.NewRequest(method, target, reader)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	return rec
}
