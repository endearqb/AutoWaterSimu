package compute

import "testing"

func assertRequiredCapabilities(t *testing.T, jobPayload map[string]any, expected []string) {
	t.Helper()
	execution := mapValue(jobPayload, "execution")
	if execution == nil {
		t.Fatalf("expected job execution payload, got %#v", jobPayload)
	}
	capabilities, ok := execution["required_capabilities"].([]any)
	if !ok {
		t.Fatalf("expected required_capabilities array, got %#v", execution["required_capabilities"])
	}
	if len(capabilities) != len(expected) {
		t.Fatalf("unexpected required_capabilities length: got %#v want %#v", capabilities, expected)
	}
	for index, capability := range expected {
		if capabilities[index] != capability {
			t.Fatalf("unexpected required_capabilities: got %#v want %#v", capabilities, expected)
		}
	}
}
