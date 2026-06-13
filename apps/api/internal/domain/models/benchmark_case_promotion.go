package models

import "encoding/json"

type BenchmarkCasePromotionBenchmarkRun struct {
	Found          bool
	BenchmarkRunID string
	Status         string
	ModelRunID     string
	JobID          string
	ExecutedAt     string
	Payload        json.RawMessage
}

type BenchmarkCasePromotionEvidenceInput struct {
	BenchmarkCaseID       string
	CaseStatus            string
	BenchmarkRun          BenchmarkCasePromotionBenchmarkRun
	ModelRunFound         bool
	ModelRun              json.RawMessage
	ExpectedJobID         string
	ExpectedModelKey      string
	ExpectedModelVersion  string
	ExpectedParameterHash string
}

type BenchmarkCasePromotionEvidence struct {
	BenchmarkCaseID          string
	CaseStatus               string
	LatestBenchmarkRunID     string
	LatestBenchmarkRunStatus string
	ModelRunID               string
	JobID                    string
	ExecutedAt               string
	ParameterHash            string
	ParameterHashMatches     bool
	EvidenceRefCount         int
	BlockingReasons          []string
	Ready                    bool
}

func EvaluateBenchmarkCasePromotionEvidence(input BenchmarkCasePromotionEvidenceInput) BenchmarkCasePromotionEvidence {
	result := BenchmarkCasePromotionEvidence{
		BenchmarkCaseID:      input.BenchmarkCaseID,
		CaseStatus:           input.CaseStatus,
		BlockingReasons:      []string{},
		ParameterHashMatches: false,
		Ready:                false,
	}
	if !input.BenchmarkRun.Found {
		result.BlockingReasons = append(result.BlockingReasons, PromotionBlockBenchmarkRunMissingForParameterSet)
		return result
	}
	result.LatestBenchmarkRunID = input.BenchmarkRun.BenchmarkRunID
	result.LatestBenchmarkRunStatus = input.BenchmarkRun.Status
	result.ModelRunID = input.BenchmarkRun.ModelRunID
	result.JobID = input.BenchmarkRun.JobID
	result.ExecutedAt = input.BenchmarkRun.ExecutedAt
	result.EvidenceRefCount = len(BenchmarkRunEvidenceRefsFromRaw(input.BenchmarkRun.Payload))
	if !input.ModelRunFound {
		result.BlockingReasons = append(result.BlockingReasons, PromotionBlockModelRunNotFound)
		return benchmarkCasePromotionEvidenceReadiness(result, input.BenchmarkRun.Status, true)
	}
	runIdentity, err := RunIdentityFromRaw(input.ModelRun)
	if err != nil {
		result.BlockingReasons = append(result.BlockingReasons, PromotionBlockModelRunPayloadInvalid)
		return benchmarkCasePromotionEvidenceReadiness(result, input.BenchmarkRun.Status, true)
	}
	identityCheck := CheckRunIdentity(runIdentity, RunIdentityExpectation{
		JobID:         input.ExpectedJobID,
		ModelKey:      input.ExpectedModelKey,
		ModelVersion:  input.ExpectedModelVersion,
		ParameterHash: input.ExpectedParameterHash,
	})
	result.ParameterHash = runIdentity.ParameterHash
	result.ParameterHashMatches = identityCheck.ParameterHashMatches
	result.BlockingReasons = append(result.BlockingReasons, identityCheck.BlockingReasons...)
	return benchmarkCasePromotionEvidenceReadiness(result, input.BenchmarkRun.Status, result.ParameterHashMatches)
}

func benchmarkCasePromotionEvidenceReadiness(result BenchmarkCasePromotionEvidence, benchmarkRunStatus string, parameterHashMatches bool) BenchmarkCasePromotionEvidence {
	readiness := EvaluateBenchmarkCasePromotionReadiness(BenchmarkCasePromotionReadinessInput{
		BenchmarkRunStatus:   benchmarkRunStatus,
		ParameterHashMatches: parameterHashMatches,
		BlockingReasons:      result.BlockingReasons,
	})
	result.BlockingReasons = readiness.BlockingReasons
	result.Ready = readiness.Ready
	return result
}
