package jobs

import (
	"encoding/json"
	"time"
)

const EventJobRunning = "job.running"

type ClaimRecord struct {
	JobID         string
	SchemaVersion string
	InputJSON     json.RawMessage
	Attempt       int
	CreatedAt     time.Time
}

type ClaimMutation struct {
	JobID          string
	Status         string
	WorkerID       string
	Attempt        int
	ClaimedAt      time.Time
	StartedAt      time.Time
	LeaseExpiresAt time.Time
	EventType      string
}

func PreferClaimRecord(current *ClaimRecord, candidate ClaimRecord) bool {
	if current == nil {
		return true
	}
	if candidate.CreatedAt.Equal(current.CreatedAt) {
		return candidate.JobID < current.JobID
	}
	return candidate.CreatedAt.Before(current.CreatedAt)
}

func NewClaimMutation(record ClaimRecord, workerID string, claimedAt, leaseExpiresAt time.Time) ClaimMutation {
	return ClaimMutation{
		JobID:          record.JobID,
		Status:         StatusRunning,
		WorkerID:       workerID,
		Attempt:        record.Attempt + 1,
		ClaimedAt:      claimedAt,
		StartedAt:      claimedAt,
		LeaseExpiresAt: leaseExpiresAt,
		EventType:      EventJobRunning,
	}
}
