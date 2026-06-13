package jobs

import (
	"testing"
	"time"
)

func TestPreferClaimRecordOrdersByCreatedAtThenJobID(t *testing.T) {
	now := time.Date(2026, 6, 13, 9, 40, 0, 0, time.UTC)
	current := ClaimRecord{JobID: "job_b", CreatedAt: now}

	if !PreferClaimRecord(&current, ClaimRecord{JobID: "job_a", CreatedAt: now.Add(-time.Second)}) {
		t.Fatalf("older candidate should be preferred")
	}
	if !PreferClaimRecord(&current, ClaimRecord{JobID: "job_a", CreatedAt: now}) {
		t.Fatalf("same timestamp should prefer lexicographically smaller job id")
	}
	if PreferClaimRecord(&current, ClaimRecord{JobID: "job_c", CreatedAt: now}) {
		t.Fatalf("same timestamp should not prefer lexicographically larger job id")
	}
	if PreferClaimRecord(&current, ClaimRecord{JobID: "job_a", CreatedAt: now.Add(time.Second)}) {
		t.Fatalf("newer candidate should not be preferred")
	}
	if !PreferClaimRecord(nil, current) {
		t.Fatalf("nil current should accept first candidate")
	}
}

func TestNewClaimMutationProjectsRunningState(t *testing.T) {
	claimedAt := time.Date(2026, 6, 13, 9, 41, 0, 0, time.UTC)
	leaseExpiresAt := claimedAt.Add(90 * time.Second)

	mutation := NewClaimMutation(ClaimRecord{
		JobID:   "job_claim",
		Attempt: 2,
	}, "worker_claim", claimedAt, leaseExpiresAt)

	if mutation.JobID != "job_claim" ||
		mutation.Status != StatusRunning ||
		mutation.WorkerID != "worker_claim" ||
		mutation.Attempt != 3 ||
		!mutation.ClaimedAt.Equal(claimedAt) ||
		!mutation.StartedAt.Equal(claimedAt) ||
		!mutation.LeaseExpiresAt.Equal(leaseExpiresAt) ||
		mutation.EventType != EventJobRunning {
		t.Fatalf("unexpected claim mutation: %#v", mutation)
	}
}

func TestNewHeartbeatMutationProjectsLeaseRefresh(t *testing.T) {
	heartbeatAt := time.Date(2026, 6, 13, 10, 1, 0, 0, time.UTC)
	leaseExpiresAt := heartbeatAt.Add(90 * time.Second)

	mutation, ok := NewHeartbeatMutation(HeartbeatRecord{
		JobID:    "job_heartbeat",
		Status:   StatusRunning,
		WorkerID: "worker_heartbeat",
	}, "worker_heartbeat", heartbeatAt, leaseExpiresAt)

	if !ok {
		t.Fatalf("running job assigned to worker should refresh heartbeat")
	}
	if mutation.JobID != "job_heartbeat" ||
		mutation.Status != StatusRunning ||
		mutation.WorkerID != "worker_heartbeat" ||
		!mutation.HeartbeatAt.Equal(heartbeatAt) ||
		!mutation.LeaseExpiresAt.Equal(leaseExpiresAt) ||
		mutation.EventType != EventJobHeartbeat {
		t.Fatalf("unexpected heartbeat mutation: %#v", mutation)
	}
}

func TestNewHeartbeatMutationSkipsNonRunningOrMismatchedWorker(t *testing.T) {
	heartbeatAt := time.Date(2026, 6, 13, 10, 2, 0, 0, time.UTC)
	leaseExpiresAt := heartbeatAt.Add(90 * time.Second)

	if _, ok := NewHeartbeatMutation(HeartbeatRecord{
		JobID:    "job_done",
		Status:   StatusSucceeded,
		WorkerID: "worker_a",
	}, "worker_a", heartbeatAt, leaseExpiresAt); ok {
		t.Fatalf("terminal job should not refresh heartbeat lease")
	}
	if _, ok := NewHeartbeatMutation(HeartbeatRecord{
		JobID:    "job_other",
		Status:   StatusRunning,
		WorkerID: "worker_a",
	}, "worker_b", heartbeatAt, leaseExpiresAt); ok {
		t.Fatalf("job assigned to another worker should not refresh heartbeat lease")
	}
}
