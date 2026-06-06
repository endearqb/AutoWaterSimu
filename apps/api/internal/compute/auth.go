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
	return authorizeRecordDataScope(principal, "job", job.TenantID, job.ProjectID, job.SiteID)
}

func authorizeRecordDataScope(principal Principal, objectLabel, tenantID, projectID, siteID string) error {
	requiredTenantID := strings.TrimSpace(principal.TenantID)
	requiredProjectID := strings.TrimSpace(principal.ProjectID)
	requiredSiteID := strings.TrimSpace(principal.SiteID)
	if requiredTenantID == "" && requiredProjectID == "" && requiredSiteID == "" {
		return nil
	}
	details := map[string]any{}
	if requiredTenantID != "" {
		details["tenant_id"] = requiredTenantID
		if strings.TrimSpace(tenantID) != requiredTenantID {
			return NewAppError(http.StatusForbidden, CodeForbidden, objectLabel+" is outside token tenant scope", false, details)
		}
	}
	if requiredProjectID != "" {
		details["project_id"] = requiredProjectID
		if strings.TrimSpace(projectID) != requiredProjectID {
			return NewAppError(http.StatusForbidden, CodeForbidden, objectLabel+" is outside token project scope", false, details)
		}
	}
	if requiredSiteID != "" {
		details["site_id"] = requiredSiteID
		if strings.TrimSpace(siteID) != requiredSiteID {
			return NewAppError(http.StatusForbidden, CodeForbidden, objectLabel+" is outside token site scope", false, details)
		}
	}
	return nil
}
