package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	platformaudit "autowatersimu/apps/api/internal/platform/audit"
)

func withAuditPrincipal(ctx context.Context, principal Principal, r *http.Request) context.Context {
	method := ""
	path := ""
	if r != nil {
		method = r.Method
		if r.URL != nil {
			path = r.URL.Path
		}
	}
	return platformaudit.WithRequestContext(ctx, principal.Name, method, path)
}

func mutationAuditEnvelope(ctx context.Context, now time.Time, fallbackWho, fallbackWhere, targetObject, targetID, action string, before, after any, reason, traceID, approvalRef string) map[string]any {
	return platformaudit.MutationEnvelope(ctx, platformaudit.MutationEnvelopeInput{
		Now:           now,
		FallbackWho:   fallbackWho,
		FallbackWhere: fallbackWhere,
		TargetObject:  targetObject,
		TargetID:      targetID,
		Action:        action,
		Before:        before,
		After:         after,
		Reason:        reason,
		TraceID:       traceID,
		ApprovalRef:   approvalRef,
	})
}

func eventJSONWithAudit(payload map[string]any, audit map[string]any) json.RawMessage {
	return platformaudit.EventJSON(payload, audit)
}
