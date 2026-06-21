package compute

import (
	"net/http"
	"strings"

	platformauth "autowatersimu/apps/api/internal/platform/auth"
)

type Authenticator = platformauth.Authenticator
type PrincipalProvider = platformauth.PrincipalProvider
type DisabledProvider = platformauth.DisabledProvider
type TokenConfig = platformauth.TokenConfig
type TokenRecord = platformauth.TokenRecord
type Principal = platformauth.Principal

const AuthModeDisabled = platformauth.AuthModeDisabled
const AuthModeStaticToken = platformauth.AuthModeStaticToken

var NewAuthenticator = platformauth.NewAuthenticator
var NewDisabledProvider = platformauth.NewDisabledProvider
var NewAuthProvider = platformauth.NewProvider

func filterForPrincipalDataScope(filter ListFilter, principal Principal) ListFilter {
	filter.TenantID = strings.TrimSpace(principal.TenantID)
	filter.ProjectID = strings.TrimSpace(principal.ProjectID)
	filter.SiteID = strings.TrimSpace(principal.SiteID)
	return filter
}

func listFilterHasDataScope(filter ListFilter) bool {
	return strings.TrimSpace(filter.TenantID) != "" ||
		strings.TrimSpace(filter.ProjectID) != "" ||
		strings.TrimSpace(filter.SiteID) != ""
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

func authorizeListFilterDataScope(filter ListFilter, objectLabel, tenantID, projectID, siteID string) error {
	requiredTenantID := strings.TrimSpace(filter.TenantID)
	requiredProjectID := strings.TrimSpace(filter.ProjectID)
	requiredSiteID := strings.TrimSpace(filter.SiteID)
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

func recordMatchesListFilterDataScope(filter ListFilter, tenantID, projectID, siteID string) bool {
	requiredTenantID := strings.TrimSpace(filter.TenantID)
	requiredProjectID := strings.TrimSpace(filter.ProjectID)
	requiredSiteID := strings.TrimSpace(filter.SiteID)
	if requiredTenantID != "" && strings.TrimSpace(tenantID) != requiredTenantID {
		return false
	}
	if requiredProjectID != "" && strings.TrimSpace(projectID) != requiredProjectID {
		return false
	}
	if requiredSiteID != "" && strings.TrimSpace(siteID) != requiredSiteID {
		return false
	}
	return true
}
