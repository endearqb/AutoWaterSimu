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
