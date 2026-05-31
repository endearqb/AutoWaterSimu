package auth

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDefaultAuthenticatorAcceptsPublicToken(t *testing.T) {
	authenticator, err := NewAuthenticator("")
	if err != nil {
		t.Fatalf("NewAuthenticator returned error: %v", err)
	}
	request := httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs", nil)
	request.Header.Set("Authorization", "Bearer dev-public-token")

	principal, err := authenticator.Principal(request, "job:read")
	if err != nil {
		t.Fatalf("Principal returned error: %v", err)
	}
	if principal.Name != "dev-public" {
		t.Fatalf("expected dev-public principal, got %q", principal.Name)
	}
}

func TestAuthenticatorRejectsMissingScope(t *testing.T) {
	authenticator, err := NewAuthenticator("")
	if err != nil {
		t.Fatalf("NewAuthenticator returned error: %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/artifacts/retention-sweep", nil)
	request.Header.Set("Authorization", "Bearer dev-public-token")

	_, err = authenticator.Principal(request, "artifact:admin")
	var authErr *Error
	if !errors.As(err, &authErr) {
		t.Fatalf("expected auth error, got %T", err)
	}
	if authErr.Status != http.StatusForbidden || authErr.Code != CodeForbidden {
		t.Fatalf("expected forbidden error, got status=%d code=%s", authErr.Status, authErr.Code)
	}
}

func TestAuthenticatorRejectsRevokedToken(t *testing.T) {
	authenticator, err := NewAuthenticator(`{"tokens":[{"name":"old","token":"old-token","scopes":["job:read"],"revoked":true}]}`)
	if err != nil {
		t.Fatalf("NewAuthenticator returned error: %v", err)
	}
	request := httptest.NewRequest(http.MethodGet, "/api/v1/compute/jobs", nil)
	request.Header.Set("Authorization", "Bearer old-token")

	_, err = authenticator.Principal(request, "job:read")
	var authErr *Error
	if !errors.As(err, &authErr) {
		t.Fatalf("expected auth error, got %T", err)
	}
	if authErr.Status != http.StatusUnauthorized || authErr.Message != "revoked bearer token" {
		t.Fatalf("expected revoked unauthorized error, got status=%d message=%q", authErr.Status, authErr.Message)
	}
}

func TestAuthenticatorRejectsDuplicateToken(t *testing.T) {
	_, err := NewAuthenticator(`{"tokens":[
		{"name":"one","token":"same","scopes":["job:read"]},
		{"name":"two","token":"same","scopes":["job:create"]}
	]}`)
	var authErr *Error
	if !errors.As(err, &authErr) {
		t.Fatalf("expected auth error, got %T", err)
	}
	if authErr.Status != http.StatusBadRequest || authErr.Code != CodeValidationFailed {
		t.Fatalf("expected validation error, got status=%d code=%s", authErr.Status, authErr.Code)
	}
}
