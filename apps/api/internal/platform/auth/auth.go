package auth

import (
	"encoding/json"
	"net/http"
	"strings"
)

const (
	AuthModeDisabled    = "disabled"
	AuthModeStaticToken = "static_token"

	CodeValidationFailed = "VALIDATION_FAILED"
	CodeUnauthorized     = "UNAUTHORIZED"
	CodeForbidden        = "FORBIDDEN"
)

type Error struct {
	Status    int
	Code      string
	Message   string
	Retryable bool
	Details   map[string]any
}

func (err *Error) Error() string {
	return err.Message
}

type TokenConfig struct {
	Tokens []TokenRecord `json:"tokens"`
}

type TokenRecord struct {
	Name      string   `json:"name"`
	Token     string   `json:"token"`
	Scopes    []string `json:"scopes"`
	Revoked   bool     `json:"revoked,omitempty"`
	TenantID  string   `json:"tenant_id,omitempty"`
	ProjectID string   `json:"project_id,omitempty"`
	SiteID    string   `json:"site_id,omitempty"`
}

type Principal struct {
	Name      string
	Scopes    map[string]bool
	Revoked   bool
	TenantID  string
	ProjectID string
	SiteID    string
}

type PrincipalProvider interface {
	Principal(r *http.Request, requiredScope string) (*Principal, error)
}

type DisabledProvider struct{}

type Authenticator struct {
	tokens map[string]Principal
}

func NewProvider(mode string, tokensJSON string) (PrincipalProvider, error) {
	switch strings.TrimSpace(mode) {
	case "", AuthModeDisabled:
		return NewDisabledProvider(), nil
	case AuthModeStaticToken:
		return NewAuthenticator(tokensJSON)
	default:
		return nil, validationError("COMPUTE_API_AUTH_MODE must be disabled or static_token")
	}
}

func NewDisabledProvider() *DisabledProvider {
	return &DisabledProvider{}
}

func (provider *DisabledProvider) Principal(_ *http.Request, _ string) (*Principal, error) {
	return &Principal{
		Name:   "standalone:developer",
		Scopes: map[string]bool{"*": true},
	}, nil
}

func NewAuthenticator(tokensJSON string) (*Authenticator, error) {
	var config TokenConfig
	if strings.TrimSpace(tokensJSON) == "" {
		config = TokenConfig{Tokens: []TokenRecord{
			{Name: "dev-public", Token: "dev-public-token", Scopes: []string{"job:create", "job:read", "artifact:read", "evidence:read", "model:write", "explanation:write"}},
			{Name: "dev-worker", Token: "dev-worker-token", Scopes: []string{"worker:register", "worker:claim", "worker:heartbeat", "job:write", "artifact:write"}},
		}}
	} else if err := json.Unmarshal([]byte(tokensJSON), &config); err != nil {
		return nil, validationError("COMPUTE_API_TOKENS_JSON is invalid")
	}
	auth := &Authenticator{tokens: map[string]Principal{}}
	for _, token := range config.Tokens {
		if token.Token == "" || token.Name == "" {
			return nil, validationError("token name and token value are required")
		}
		if _, exists := auth.tokens[token.Token]; exists {
			return nil, validationError("duplicate token value is not allowed")
		}
		scopes := map[string]bool{}
		for _, scope := range token.Scopes {
			scopes[scope] = true
		}
		auth.tokens[token.Token] = Principal{
			Name:      strings.TrimSpace(token.Name),
			Scopes:    scopes,
			Revoked:   token.Revoked,
			TenantID:  strings.TrimSpace(token.TenantID),
			ProjectID: strings.TrimSpace(token.ProjectID),
			SiteID:    strings.TrimSpace(token.SiteID),
		}
	}
	return auth, nil
}

func (auth *Authenticator) Principal(r *http.Request, requiredScope string) (*Principal, error) {
	header := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return nil, authError(http.StatusUnauthorized, CodeUnauthorized, "missing bearer token", false, nil)
	}
	token := strings.TrimSpace(strings.TrimPrefix(header, prefix))
	principal, ok := auth.tokens[token]
	if !ok {
		return nil, authError(http.StatusUnauthorized, CodeUnauthorized, "invalid bearer token", false, nil)
	}
	if principal.Revoked {
		return nil, authError(http.StatusUnauthorized, CodeUnauthorized, "revoked bearer token", false, nil)
	}
	if requiredScope != "" && !principal.Scopes[requiredScope] {
		return nil, authError(http.StatusForbidden, CodeForbidden, "missing required scope", false, map[string]any{"scope": requiredScope})
	}
	return &principal, nil
}

func validationError(message string) *Error {
	return authError(http.StatusBadRequest, CodeValidationFailed, message, false, nil)
}

func authError(status int, code, message string, retryable bool, details map[string]any) *Error {
	return &Error{
		Status:    status,
		Code:      code,
		Message:   message,
		Retryable: retryable,
		Details:   details,
	}
}
