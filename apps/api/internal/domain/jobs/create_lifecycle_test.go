package jobs

import (
	"encoding/json"
	"reflect"
	"testing"
	"time"
)

func TestNewQueuedJobProjectsCreateInput(t *testing.T) {
	now := time.Date(2026, 6, 12, 21, 30, 0, 0, time.UTC)
	inputJSON := json.RawMessage(`{"schema_version":"compute_job.v1"}`)
	job := NewQueuedJob(CreateInput{
		JobID:          "job_create_domain",
		SchemaVersion:  "compute_job.v1",
		JobType:        "simulation.material_balance.v1",
		Queue:          "default",
		RequestID:      "req_create_domain",
		IdempotencyKey: "idem_create_domain",
		Context: CreateContext{
			SourceSystem: "compute-api",
			RequestedBy:  "agent:test",
			TraceID:      "trace_create_domain",
			TenantID:     "tenant_a",
			ProjectID:    "project_a",
			SiteID:       "site_a",
		},
		PayloadHash: "sha256:" + "a",
		InputJSON:   inputJSON,
		CreatedAt:   now,
	})

	if job.JobID != "job_create_domain" ||
		job.SchemaVersion != "compute_job.v1" ||
		job.JobType != "simulation.material_balance.v1" ||
		job.Queue != "default" ||
		job.Status != StatusQueued ||
		job.RequestID != "req_create_domain" ||
		job.IdempotencyKey != "idem_create_domain" ||
		job.SourceSystem != "compute-api" ||
		job.RequestedBy != "agent:test" ||
		job.TraceID != "trace_create_domain" ||
		job.TenantID != "tenant_a" ||
		job.ProjectID != "project_a" ||
		job.SiteID != "site_a" ||
		job.CreatedBy != "agent:test" ||
		job.PayloadHash != "sha256:a" ||
		job.Attempt != 0 ||
		!job.CreatedAt.Equal(now) ||
		!job.QueuedAt.Equal(now) {
		t.Fatalf("unexpected queued job projection: %#v", job)
	}
	if string(job.InputJSON) != string(inputJSON) {
		t.Fatalf("unexpected input json: %s", string(job.InputJSON))
	}
	inputJSON[0] = '['
	if string(job.InputJSON) == string(inputJSON) {
		t.Fatalf("queued job must clone input json")
	}
}

func TestCreateEventPlans(t *testing.T) {
	got := CreateEventPlans()
	want := []CreateEventPlan{
		{EventType: EventJobCreated, Status: StatusCreated, Action: "job.create", Reason: "compute job accepted"},
		{EventType: EventJobQueued, Status: StatusQueued, Action: "job.queue", Reason: "compute job queued"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("create event plans mismatch: got %#v want %#v", got, want)
	}
	got[0].EventType = "mutated"
	if CreateEventPlans()[0].EventType != EventJobCreated {
		t.Fatalf("create event plans must return a fresh slice")
	}
}

func TestDecideCreateIdempotency(t *testing.T) {
	t.Run("no existing record accepts new job", func(t *testing.T) {
		decision := DecideCreateIdempotency(nil, "sha256:new")
		if decision.Conflict || decision.ReusedJobID != "" {
			t.Fatalf("expected new-job decision, got %#v", decision)
		}
	})

	t.Run("same payload reuses existing job", func(t *testing.T) {
		decision := DecideCreateIdempotency(&CreateIdempotencyRecord{
			JobID:       "job_existing",
			PayloadHash: "sha256:same",
		}, "sha256:same")
		if decision.Conflict || decision.ReusedJobID != "job_existing" {
			t.Fatalf("expected reuse decision, got %#v", decision)
		}
	})

	t.Run("different payload conflicts", func(t *testing.T) {
		decision := DecideCreateIdempotency(&CreateIdempotencyRecord{
			JobID:       "job_existing",
			PayloadHash: "sha256:old",
		}, "sha256:new")
		if !decision.Conflict || decision.ReusedJobID != "" {
			t.Fatalf("expected conflict decision, got %#v", decision)
		}
	})
}
