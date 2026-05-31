package compute

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type auditContextKey struct{}

type auditRequestContext struct {
	Who   string
	Where string
}

func withAuditPrincipal(ctx context.Context, principal Principal, r *http.Request) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	where := ""
	if r != nil {
		where = strings.TrimSpace(r.Method + " " + r.URL.Path)
	}
	return context.WithValue(ctx, auditContextKey{}, auditRequestContext{
		Who:   strings.TrimSpace(principal.Name),
		Where: where,
	})
}

func mutationAuditEnvelope(ctx context.Context, now time.Time, fallbackWho, fallbackWhere, targetObject, targetID, action string, before, after any, reason, traceID, approvalRef string) map[string]any {
	if ctx == nil {
		ctx = context.Background()
	}
	who := strings.TrimSpace(fallbackWho)
	where := strings.TrimSpace(fallbackWhere)
	if audit, ok := ctx.Value(auditContextKey{}).(auditRequestContext); ok {
		if strings.TrimSpace(audit.Who) != "" {
			who = strings.TrimSpace(audit.Who)
		}
		if strings.TrimSpace(audit.Where) != "" {
			where = strings.TrimSpace(audit.Where)
		}
	}
	if who == "" {
		who = "system"
	}
	if where == "" {
		where = "service"
	}
	return map[string]any{
		"who":           who,
		"when":          now.UTC().Format(time.RFC3339Nano),
		"where":         where,
		"target_object": strings.TrimSpace(targetObject),
		"target_id":     strings.TrimSpace(targetID),
		"action":        strings.TrimSpace(action),
		"before":        before,
		"after":         after,
		"reason":        strings.TrimSpace(reason),
		"trace_id":      strings.TrimSpace(traceID),
		"approval_ref":  strings.TrimSpace(approvalRef),
	}
}

func eventJSONWithAudit(payload map[string]any, audit map[string]any) json.RawMessage {
	value := map[string]any{}
	for key, item := range payload {
		value[key] = item
	}
	value["audit"] = audit
	return mustJSON(value)
}
