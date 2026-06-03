package audit

import (
	"context"
	"encoding/json"
	"strings"
	"time"
)

type contextKey struct{}

type requestContext struct {
	Who   string
	Where string
}

type MutationEnvelopeInput struct {
	Now           time.Time
	FallbackWho   string
	FallbackWhere string
	TargetObject  string
	TargetID      string
	Action        string
	Before        any
	After         any
	Reason        string
	TraceID       string
	ApprovalRef   string
}

func WithRequestContext(ctx context.Context, who, method, path string) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	where := strings.TrimSpace(strings.TrimSpace(method) + " " + strings.TrimSpace(path))
	return context.WithValue(ctx, contextKey{}, requestContext{
		Who:   strings.TrimSpace(who),
		Where: where,
	})
}

func MutationEnvelope(ctx context.Context, input MutationEnvelopeInput) map[string]any {
	if ctx == nil {
		ctx = context.Background()
	}
	who := strings.TrimSpace(input.FallbackWho)
	where := strings.TrimSpace(input.FallbackWhere)
	if audit, ok := ctx.Value(contextKey{}).(requestContext); ok {
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
		"when":          input.Now.UTC().Format(time.RFC3339Nano),
		"where":         where,
		"target_object": strings.TrimSpace(input.TargetObject),
		"target_id":     strings.TrimSpace(input.TargetID),
		"action":        strings.TrimSpace(input.Action),
		"before":        input.Before,
		"after":         input.After,
		"reason":        strings.TrimSpace(input.Reason),
		"trace_id":      strings.TrimSpace(input.TraceID),
		"approval_ref":  strings.TrimSpace(input.ApprovalRef),
	}
}

func EventJSON(payload map[string]any, audit map[string]any) json.RawMessage {
	value := map[string]any{}
	for key, item := range payload {
		value[key] = item
	}
	value["audit"] = audit
	bytes, _ := json.Marshal(value)
	return bytes
}
