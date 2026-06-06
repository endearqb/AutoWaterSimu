package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"
)

type fakeJobStateStore struct {
	cancelJobID     string
	cancelMutation  StateMutation
	timeoutMutation StateMutation
}

func (store *fakeJobStateStore) CancelJob(_ context.Context, jobID string, mutation StateMutation) (*StateRecord, error) {
	store.cancelJobID = jobID
	store.cancelMutation = mutation
	return &StateRecord{JobID: jobID, Status: mutation.Status, FinishedAt: &mutation.FinishedAt}, nil
}

func (store *fakeJobStateStore) TimeoutExpired(_ context.Context, mutation StateMutation) ([]StateRecord, error) {
	store.timeoutMutation = mutation
	return []StateRecord{{JobID: "job_timeout", Status: mutation.Status, ErrorCode: mutation.ErrorCode, ErrorMessage: mutation.ErrorMessage, FinishedAt: &mutation.FinishedAt}}, nil
}

func TestJobStateServiceCancelBuildsDomainMutation(t *testing.T) {
	now := time.Date(2026, 6, 6, 12, 30, 0, 0, time.UTC)
	store := &fakeJobStateStore{}
	svc := NewJobStateService(store, func() time.Time { return now })

	record, err := svc.CancelJob(context.Background(), " job_1 ")
	if err != nil {
		t.Fatal(err)
	}
	if record.JobID != "job_1" || record.Status != StatusCancelled {
		t.Fatalf("unexpected state record: %#v", record)
	}
	if store.cancelJobID != "job_1" {
		t.Fatalf("expected trimmed job id, got %q", store.cancelJobID)
	}
	assertStateMutation(t, store.cancelMutation, StateMutation{
		Status:             StatusCancelled,
		FinishedAt:         now,
		SetCancelRequested: true,
		CancelRequested:    true,
		EventType:          EventJobCancelled,
		EventJSON:          stateEventJSON(map[string]any{"status": StatusCancelled}),
	})
}

func TestJobStateServiceCancelRejectsMissingJobID(t *testing.T) {
	svc := NewJobStateService(&fakeJobStateStore{}, nil)
	_, err := svc.CancelJob(context.Background(), " ")
	var domainErr *Error
	if !errors.As(err, &domainErr) || domainErr.Code != CodeValidationFailed {
		t.Fatalf("expected validation error, got %#v", err)
	}
}

func TestJobStateServiceTimeoutSweepBuildsDomainMutation(t *testing.T) {
	now := time.Date(2026, 6, 6, 12, 45, 0, 0, time.UTC)
	store := &fakeJobStateStore{}
	svc := NewJobStateService(store, func() time.Time { return now })

	records, err := svc.TimeoutSweep(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(records) != 1 || records[0].Status != StatusTimedOut || records[0].ErrorCode != TimeoutErrorCode {
		t.Fatalf("unexpected timeout records: %#v", records)
	}
	assertStateMutation(t, store.timeoutMutation, StateMutation{
		Status:       StatusTimedOut,
		FinishedAt:   now,
		ErrorCode:    TimeoutErrorCode,
		ErrorMessage: TimeoutErrorMessage,
		EventType:    EventJobTimedOut,
		EventJSON:    stateEventJSON(map[string]any{"status": StatusTimedOut, "error_code": TimeoutErrorCode}),
	})
}

func assertStateMutation(t *testing.T, got StateMutation, want StateMutation) {
	t.Helper()
	if got.Status != want.Status ||
		!got.FinishedAt.Equal(want.FinishedAt) ||
		got.SetCancelRequested != want.SetCancelRequested ||
		got.CancelRequested != want.CancelRequested ||
		got.ErrorCode != want.ErrorCode ||
		got.ErrorMessage != want.ErrorMessage ||
		got.EventType != want.EventType {
		t.Fatalf("unexpected mutation: got %#v want %#v", got, want)
	}
	var gotPayload map[string]any
	if err := json.Unmarshal(got.EventJSON, &gotPayload); err != nil {
		t.Fatal(err)
	}
	var wantPayload map[string]any
	if err := json.Unmarshal(want.EventJSON, &wantPayload); err != nil {
		t.Fatal(err)
	}
	if len(gotPayload) != len(wantPayload) {
		t.Fatalf("unexpected event payload: got %#v want %#v", gotPayload, wantPayload)
	}
	for key, wantValue := range wantPayload {
		if gotPayload[key] != wantValue {
			t.Fatalf("unexpected event payload: got %#v want %#v", gotPayload, wantPayload)
		}
	}
}
