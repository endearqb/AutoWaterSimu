package jobs

import (
	"encoding/json"
	"time"
)

const (
	EventJobCreated = "job.created"
	EventJobQueued  = "job.queued"
)

type CreateContext struct {
	SourceSystem string
	RequestedBy  string
	TraceID      string
	TenantID     string
	ProjectID    string
	SiteID       string
}

type CreateInput struct {
	JobID          string
	SchemaVersion  string
	JobType        string
	Queue          string
	RequestID      string
	IdempotencyKey string
	Context        CreateContext
	PayloadHash    string
	InputJSON      json.RawMessage
	CreatedAt      time.Time
}

type QueuedJob struct {
	JobID          string
	SchemaVersion  string
	JobType        string
	Queue          string
	Status         string
	RequestID      string
	IdempotencyKey string
	SourceSystem   string
	RequestedBy    string
	TraceID        string
	TenantID       string
	ProjectID      string
	SiteID         string
	CreatedBy      string
	PayloadHash    string
	InputJSON      json.RawMessage
	Attempt        int
	CreatedAt      time.Time
	QueuedAt       time.Time
}

type CreateEventPlan struct {
	EventType string
	Status    string
	Action    string
	Reason    string
}

func NewQueuedJob(input CreateInput) QueuedJob {
	return QueuedJob{
		JobID:          input.JobID,
		SchemaVersion:  input.SchemaVersion,
		JobType:        input.JobType,
		Queue:          input.Queue,
		Status:         StatusQueued,
		RequestID:      input.RequestID,
		IdempotencyKey: input.IdempotencyKey,
		SourceSystem:   input.Context.SourceSystem,
		RequestedBy:    input.Context.RequestedBy,
		TraceID:        input.Context.TraceID,
		TenantID:       input.Context.TenantID,
		ProjectID:      input.Context.ProjectID,
		SiteID:         input.Context.SiteID,
		CreatedBy:      input.Context.RequestedBy,
		PayloadHash:    input.PayloadHash,
		InputJSON:      append([]byte(nil), input.InputJSON...),
		Attempt:        0,
		CreatedAt:      input.CreatedAt,
		QueuedAt:       input.CreatedAt,
	}
}

func CreateEventPlans() []CreateEventPlan {
	return []CreateEventPlan{
		{
			EventType: EventJobCreated,
			Status:    StatusCreated,
			Action:    "job.create",
			Reason:    "compute job accepted",
		},
		{
			EventType: EventJobQueued,
			Status:    StatusQueued,
			Action:    "job.queue",
			Reason:    "compute job queued",
		},
	}
}
