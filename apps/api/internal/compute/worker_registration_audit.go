package compute

import (
	"context"
	"encoding/json"
	"time"
)

const workerRegisteredEvent = "worker.registered"

func workerRegistrationAudit(ctx context.Context, before *WorkerRecord, after WorkerRecord) MutationAuditRecord {
	createdAt := after.RegisteredAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}
	payload := workerAuditState(after)
	var beforeState any
	if before != nil {
		beforeState = workerAuditState(*before)
	}
	audit := mutationAuditEnvelope(ctx, createdAt, after.WorkerID, "service:worker_lifecycle.register", "Worker", after.WorkerID, "worker.register", beforeState, payload, "worker registered", "", "")
	return MutationAuditRecord{
		EventType:    workerRegisteredEvent,
		TargetObject: "Worker",
		TargetID:     after.WorkerID,
		EventJSON:    eventJSONWithAudit(payload, audit),
		CreatedAt:    createdAt,
	}
}

func workerAuditState(worker WorkerRecord) map[string]any {
	return map[string]any{
		"worker_id":                        worker.WorkerID,
		"runtime_version":                  worker.RuntimeVersion,
		"current_job_id":                   worker.CurrentJobID,
		"capability_count":                 jsonArrayLength(worker.Capabilities),
		"supported_contract_version_count": jsonArrayLength(worker.SupportedContractVersions),
	}
}

func jsonArrayLength(raw json.RawMessage) int {
	var values []any
	if err := json.Unmarshal(raw, &values); err != nil {
		return 0
	}
	return len(values)
}
