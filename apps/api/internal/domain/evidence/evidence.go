package evidence

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
)

type InputReferenceSummary struct {
	InputRef           map[string]any
	InputHash          string
	ProcessGraphRef    map[string]any
	SimulationInputRef map[string]any
}

type RiskSummary struct {
	Total      int
	BySeverity map[string]int
	Blocking   []string
}

func InputRefs(input json.RawMessage) InputReferenceSummary {
	summary := InputReferenceSummary{
		InputRef:           map[string]any{},
		InputHash:          "sha256:" + sha256Hex(input),
		ProcessGraphRef:    map[string]any{},
		SimulationInputRef: map[string]any{},
	}
	var job map[string]any
	if err := json.Unmarshal(input, &job); err != nil {
		return summary
	}
	payload, _ := job["payload"].(map[string]any)
	if payloadBytes, err := json.Marshal(payload); err == nil && len(payloadBytes) > 0 {
		summary.InputHash = "sha256:" + sha256Hex(payloadBytes)
	}
	if processGraphID := stringValue(payload, "process_graph_id"); processGraphID != "" {
		summary.ProcessGraphRef["process_graph_id"] = processGraphID
	}
	if version, ok := payload["process_graph_version"]; ok {
		summary.ProcessGraphRef["version"] = version
	}
	if simulationInputID := stringValue(payload, "simulation_input_id"); simulationInputID != "" {
		summary.SimulationInputRef["simulation_input_id"] = simulationInputID
	}
	summary.InputRef["job_id"] = stringValue(job, "job_id")
	summary.InputRef["payload_schema_version"] = stringValue(payload, "schema_version")
	return summary
}

func ParseRef(evidenceRef string) (string, string) {
	evidenceRef = strings.TrimSpace(evidenceRef)
	refType, refID, ok := strings.Cut(evidenceRef, ":")
	if !ok {
		return "", evidenceRef
	}
	return strings.TrimSpace(refType), strings.TrimSpace(refID)
}

func SimulationInputPayload(input json.RawMessage, simulationInputID string) map[string]any {
	var job map[string]any
	if err := json.Unmarshal(input, &job); err != nil {
		return nil
	}
	payload := mapValue(job, "payload")
	if payload == nil || stringValue(payload, "schema_version") != "simulation_input.v1" {
		return nil
	}
	if stringValue(payload, "simulation_input_id") != simulationInputID {
		return nil
	}
	return payload
}

func RiskFindingsFromSummary(raw json.RawMessage) []map[string]any {
	var summary map[string]any
	if len(raw) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, &summary); err != nil {
		return nil
	}
	rawFindings, ok := summary["risk_findings"].([]any)
	if !ok {
		return nil
	}
	findings := make([]map[string]any, 0, len(rawFindings))
	for _, rawFinding := range rawFindings {
		finding, ok := rawFinding.(map[string]any)
		if !ok {
			continue
		}
		findings = append(findings, finding)
	}
	return findings
}

func RiskFindingEvidenceRefs(raw json.RawMessage) []string {
	findings := RiskFindingsFromSummary(raw)
	refs := []string{}
	for _, finding := range findings {
		refs = append(refs, stringsFromAny(finding["evidence_refs"])...)
	}
	return uniqueStrings(refs)
}

func SummarizeRiskFindings(findings []map[string]any) RiskSummary {
	bySeverity := map[string]int{
		"info":     0,
		"low":      0,
		"medium":   0,
		"high":     0,
		"critical": 0,
	}
	blocking := []string{}
	for _, finding := range findings {
		severity := stringValue(finding, "severity")
		if _, ok := bySeverity[severity]; ok {
			bySeverity[severity]++
		}
		if severity == "high" || severity == "critical" {
			riskCode := stringValue(finding, "risk_code")
			if riskCode != "" {
				blocking = append(blocking, riskCode)
			}
		}
	}
	return RiskSummary{
		Total:      len(findings),
		BySeverity: bySeverity,
		Blocking:   uniqueStrings(blocking),
	}
}

func mapValue(value map[string]any, key string) map[string]any {
	if value == nil {
		return nil
	}
	item, _ := value[key].(map[string]any)
	return item
}

func stringValue(value map[string]any, key string) string {
	if value == nil {
		return ""
	}
	if text, ok := value[key].(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}

func stringsFromAny(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	var result []string
	for _, item := range items {
		if text, ok := item.(string); ok && strings.TrimSpace(text) != "" {
			result = append(result, strings.TrimSpace(text))
		}
	}
	return result
}

func uniqueStrings(values []string) []string {
	seen := map[string]bool{}
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			continue
		}
		seen[value] = true
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}

func sha256Hex(bytes []byte) string {
	sum := sha256.Sum256(bytes)
	return hex.EncodeToString(sum[:])
}
