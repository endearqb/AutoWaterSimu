package simulation

import (
	"reflect"
	"testing"
)

func TestRequiredCapabilities(t *testing.T) {
	tests := []struct {
		name    string
		jobType string
		want    []string
	}{
		{name: "material balance", jobType: JobTypeMaterialBalance, want: []string{"material_balance", "ode"}},
		{name: "asm1 slim", jobType: JobTypeASM1Slim, want: []string{"asm1slim", "ode"}},
		{name: "asm1", jobType: JobTypeASM1, want: []string{"asm1", "ode"}},
		{name: "asm3", jobType: JobTypeASM3, want: []string{"asm3", "ode"}},
		{name: "udm", jobType: JobTypeUDM, want: []string{"udm", "ode"}},
		{name: "udm network", jobType: JobTypeUDMNetwork, want: []string{"udm_network", "ode"}},
		{name: "unknown", jobType: "simulation.unknown.v1", want: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := RequiredCapabilities(tt.jobType); !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("required capabilities mismatch: got %#v want %#v", got, tt.want)
			}
		})
	}
}

func TestExecutionProfile(t *testing.T) {
	profile := ExecutionProfile(JobTypeASM3)
	if profile["time_limit_sec"] != DefaultTimeLimitSec {
		t.Fatalf("unexpected time limit: %#v", profile["time_limit_sec"])
	}
	if profile["priority"] != PriorityNormal {
		t.Fatalf("unexpected priority: %#v", profile["priority"])
	}
	got, ok := profile["required_capabilities"].([]any)
	if !ok {
		t.Fatalf("expected []any required_capabilities, got %#v", profile["required_capabilities"])
	}
	want := []any{"asm3", "ode"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("required capabilities mismatch: got %#v want %#v", got, want)
	}
}

func TestExecutionProfileUnsupportedJobTypeKeepsEmptyCapabilities(t *testing.T) {
	profile := ExecutionProfile("simulation.unknown.v1")
	got, ok := profile["required_capabilities"].([]any)
	if !ok {
		t.Fatalf("expected []any required_capabilities, got %#v", profile["required_capabilities"])
	}
	if len(got) != 0 {
		t.Fatalf("expected empty capabilities, got %#v", got)
	}
	if IsSupportedJobType("simulation.unknown.v1") {
		t.Fatal("expected unknown job type to be unsupported")
	}
}
