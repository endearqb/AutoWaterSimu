package compute

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
)

func PayloadHash(job ComputeJob) (string, error) {
	canonical := map[string]any{
		"job_type":  job.JobType,
		"queue":     job.Queue,
		"payload":   job.Payload,
		"execution": job.Execution,
	}
	bytes, err := json.Marshal(canonical)
	if err != nil {
		return "", err
	}
	return "sha256:" + SHA256Hex(bytes), nil
}

func ResultHash(value any) (string, error) {
	bytes, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	return "sha256:" + SHA256Hex(bytes), nil
}

func SHA256Hex(bytes []byte) string {
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:])
}
