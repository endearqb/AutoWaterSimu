package artifacts

import (
	"errors"
	"strings"
	"time"
)

const (
	PolicyRetainForever    = "retain_forever"
	PolicyTTL              = "ttl"
	PolicyArchiveCandidate = "archive_candidate"
)

type Retention struct {
	Policy      string
	RetainUntil *time.Time
}

func RetentionFromMetadata(metadata map[string]any) (Retention, error) {
	policy := stringValue(metadata, "retention_policy")
	if policy == "" {
		policy = PolicyRetainForever
	}
	switch policy {
	case PolicyRetainForever, PolicyTTL, PolicyArchiveCandidate:
	default:
		return Retention{}, errors.New("retention_policy is invalid")
	}
	rawRetainUntil := stringValue(metadata, "retain_until")
	if rawRetainUntil == "" {
		return Retention{Policy: policy}, nil
	}
	retainUntil, err := time.Parse(time.RFC3339Nano, rawRetainUntil)
	if err != nil {
		return Retention{}, errors.New("retain_until must be RFC3339")
	}
	return Retention{Policy: policy, RetainUntil: &retainUntil}, nil
}

func IsRetentionCandidate(policy string) bool {
	switch strings.TrimSpace(policy) {
	case PolicyTTL, PolicyArchiveCandidate:
		return true
	default:
		return false
	}
}

func stringValue(value map[string]any, key string) string {
	if value == nil {
		return ""
	}
	if text, ok := value[key].(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}
