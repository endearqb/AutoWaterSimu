package compute

import (
	"os"
	"path/filepath"
	"testing"
)

func scopedDraftConfirmationBytes(t *testing.T, fixtureName, confirmationID, tenantID, projectID, siteID string) []byte {
	t.Helper()
	confirmationBytes, err := os.ReadFile(filepath.Join(repoRootForTest(t), "contracts", "examples", "valid", fixtureName))
	if err != nil {
		t.Fatal(err)
	}
	confirmation := decodeMap(t, confirmationBytes)
	confirmation["confirmation_id"] = confirmationID
	confirmation["decision_reason"] = "scope regression"
	confirmation["metadata"] = map[string]any{
		"source_system": "test",
		"requested_by":  "draft-test",
		"tenant_id":     tenantID,
		"project_id":    projectID,
		"site_id":       siteID,
		"trace_id":      "trace_" + confirmationID,
		"approval_ref":  "approval_" + confirmationID,
	}
	if draft := mapValue(confirmation, "draft"); draft != nil {
		if proposed := mapValue(draft, "proposed_request"); proposed != nil {
			proposed["request_id"] = "sim_req_" + confirmationID
			metadata := mapValue(proposed, "metadata")
			if metadata == nil {
				metadata = map[string]any{}
				proposed["metadata"] = metadata
			}
			metadata["trace_id"] = "trace_" + confirmationID
			metadata["tenant_id"] = tenantID
			metadata["project_id"] = projectID
			metadata["site_id"] = siteID
			externalRefs := mapValue(proposed, "external_refs")
			if externalRefs == nil {
				externalRefs = map[string]any{}
				proposed["external_refs"] = externalRefs
			}
			externalRefs["site_id"] = siteID
		}
	}
	return encodeMap(t, confirmation)
}

func scopedDraftConfirmationBytesWithProposedScope(t *testing.T, fixtureName, confirmationID, tenantID, projectID, siteID, proposedTenantID, proposedProjectID, proposedSiteID string) []byte {
	t.Helper()
	confirmation := decodeMap(t, scopedDraftConfirmationBytes(t, fixtureName, confirmationID, tenantID, projectID, siteID))
	draft := mapValue(confirmation, "draft")
	proposed := mapValue(draft, "proposed_request")
	metadata := mapValue(proposed, "metadata")
	if metadata == nil {
		metadata = map[string]any{}
		proposed["metadata"] = metadata
	}
	metadata["tenant_id"] = proposedTenantID
	metadata["project_id"] = proposedProjectID
	metadata["site_id"] = proposedSiteID
	externalRefs := mapValue(proposed, "external_refs")
	if externalRefs == nil {
		externalRefs = map[string]any{}
		proposed["external_refs"] = externalRefs
	}
	externalRefs["site_id"] = proposedSiteID
	return encodeMap(t, confirmation)
}
