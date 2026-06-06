package compute

import (
	"net/http"
	"strings"

	platformauth "autowatersimu/apps/api/internal/platform/auth"
)

type Authenticator = platformauth.Authenticator
type TokenConfig = platformauth.TokenConfig
type TokenRecord = platformauth.TokenRecord
type Principal = platformauth.Principal

var NewAuthenticator = platformauth.NewAuthenticator

func filterForPrincipalDataScope(filter ListFilter, principal Principal) ListFilter {
	filter.TenantID = strings.TrimSpace(principal.TenantID)
	filter.ProjectID = strings.TrimSpace(principal.ProjectID)
	filter.SiteID = strings.TrimSpace(principal.SiteID)
	return filter
}

func principalHasDataScope(principal Principal) bool {
	return strings.TrimSpace(principal.TenantID) != "" ||
		strings.TrimSpace(principal.ProjectID) != "" ||
		strings.TrimSpace(principal.SiteID) != ""
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
