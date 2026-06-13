package compute

import (
	"context"
	"testing"
)

func TestWorkerClaimSkipsCapabilityMismatch(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, map[string]any{
		"worker_id":                   "worker_weak",
		"capabilities":                []any{"material_balance"},
		"supported_contract_versions": []any{"compute_job.v1", "simulation_input.v1"},
	})
	if err != nil {
		t.Fatal(err)
	}
	claim, err := svc.Claim(ctx, worker.WorkerID)
	if err != nil {
		t.Fatal(err)
	}
	if claim["job"] != nil {
		t.Fatalf("capability-mismatched worker should not claim job: %#v", claim)
	}
	job, err := svc.GetJob(ctx, "job_material_balance_minimal")
	if err != nil {
		t.Fatal(err)
	}
	if job.Job.Status != StatusQueued {
		t.Fatalf("incompatible claim should leave job queued, got %s", job.Job.Status)
	}
}

func TestWorkerClaimSkipsContractVersionMismatch(t *testing.T) {
	svc := testService(t)
	ctx := context.Background()
	if _, _, err := svc.CreateJob(ctx, fixtureJobBytes(t), ""); err != nil {
		t.Fatal(err)
	}
	worker, err := svc.RegisterWorker(ctx, map[string]any{
		"worker_id":                   "worker_old",
		"capabilities":                []any{"material_balance", "ode"},
		"supported_contract_versions": []any{"compute_job.v1"},
	})
	if err != nil {
		t.Fatal(err)
	}
	claim, err := svc.Claim(ctx, worker.WorkerID)
	if err != nil {
		t.Fatal(err)
	}
	if claim["job"] != nil {
		t.Fatalf("contract-version-mismatched worker should not claim job: %#v", claim)
	}
}
