package compute

func compatibleWorkerRegistration(workerID string) map[string]any {
	return map[string]any{
		"worker_id":                   workerID,
		"capabilities":                []any{"material_balance", "ode"},
		"supported_contract_versions": []any{"compute_job.v1", "simulation_input.v1"},
	}
}
