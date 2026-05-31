package compute

import (
	"encoding/json"
	"net/http"
	"strings"
)

type Authenticator struct {
	tokens map[string]Principal
}

func NewAuthenticator(tokensJSON string) (*Authenticator, error) {
	var config TokenConfig
	if strings.TrimSpace(tokensJSON) == "" {
		config = TokenConfig{Tokens: []TokenRecord{
			{Name: "dev-public", Token: "dev-public-token", Scopes: []string{"job:create", "job:read", "artifact:read", "evidence:read", "model:write", "explanation:write"}},
			{Name: "dev-worker", Token: "dev-worker-token", Scopes: []string{"worker:register", "worker:claim", "worker:heartbeat", "job:write", "artifact:write"}},
		}}
	} else if err := json.Unmarshal([]byte(tokensJSON), &config); err != nil {
		return nil, ValidationError("COMPUTE_API_TOKENS_JSON is invalid")
	}
	auth := &Authenticator{tokens: map[string]Principal{}}
	for _, token := range config.Tokens {
		if token.Token == "" || token.Name == "" {
			return nil, ValidationError("token name and token value are required")
		}
		if _, exists := auth.tokens[token.Token]; exists {
			return nil, ValidationError("duplicate token value is not allowed")
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
		return nil, NewAppError(http.StatusUnauthorized, CodeUnauthorized, "missing bearer token", false, nil)
	}
	token := strings.TrimSpace(strings.TrimPrefix(header, prefix))
	principal, ok := auth.tokens[token]
	if !ok {
		return nil, NewAppError(http.StatusUnauthorized, CodeUnauthorized, "invalid bearer token", false, nil)
	}
	if principal.Revoked {
		return nil, NewAppError(http.StatusUnauthorized, CodeUnauthorized, "revoked bearer token", false, nil)
	}
	if requiredScope != "" && !principal.Scopes[requiredScope] {
		return nil, NewAppError(http.StatusForbidden, CodeForbidden, "missing required scope", false, map[string]any{"scope": requiredScope})
	}
	return &principal, nil
}

func filterForPrincipalDataScope(filter ListFilter, principal Principal) ListFilter {
	filter.TenantID = strings.TrimSpace(principal.TenantID)
	filter.ProjectID = strings.TrimSpace(principal.ProjectID)
	filter.SiteID = strings.TrimSpace(principal.SiteID)
	return filter
}

func authorizeJobDataScope(principal Principal, job JobRecord) error {
	tenantID := strings.TrimSpace(principal.TenantID)
	projectID := strings.TrimSpace(principal.ProjectID)
	siteID := strings.TrimSpace(principal.SiteID)
	if tenantID == "" && projectID == "" && siteID == "" {
		return nil
	}
	details := map[string]any{}
	if tenantID != "" {
		details["tenant_id"] = tenantID
		if strings.TrimSpace(job.TenantID) != tenantID {
			return NewAppError(http.StatusForbidden, CodeForbidden, "job is outside token tenant scope", false, details)
		}
	}
	if projectID != "" {
		details["project_id"] = projectID
		if strings.TrimSpace(job.ProjectID) != projectID {
			return NewAppError(http.StatusForbidden, CodeForbidden, "job is outside token project scope", false, details)
		}
	}
	if siteID != "" {
		details["site_id"] = siteID
		if strings.TrimSpace(job.SiteID) != siteID {
			return NewAppError(http.StatusForbidden, CodeForbidden, "job is outside token site scope", false, details)
		}
	}
	return nil
}
