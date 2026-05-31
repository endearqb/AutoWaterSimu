package simulation

const (
	JobTypeMaterialBalance = "simulation.material_balance.v1"
	JobTypeASM1Slim        = "simulation.asm1slim.v1"
	JobTypeASM1            = "simulation.asm1.v1"
	JobTypeASM3            = "simulation.asm3.v1"
	JobTypeUDM             = "simulation.udm.v1"

	DefaultTimeLimitSec = 600
	PriorityNormal      = "normal"
)

func ExecutionProfile(jobType string) map[string]any {
	capabilities := RequiredCapabilities(jobType)
	requiredCapabilities := make([]any, 0, len(capabilities))
	for _, capability := range capabilities {
		requiredCapabilities = append(requiredCapabilities, capability)
	}
	return map[string]any{
		"time_limit_sec":        DefaultTimeLimitSec,
		"priority":              PriorityNormal,
		"required_capabilities": requiredCapabilities,
	}
}

func RequiredCapabilities(jobType string) []string {
	switch jobType {
	case JobTypeMaterialBalance:
		return []string{"material_balance", "ode"}
	case JobTypeASM1Slim:
		return []string{"asm1slim", "ode"}
	case JobTypeASM1:
		return []string{"asm1", "ode"}
	case JobTypeASM3:
		return []string{"asm3", "ode"}
	case JobTypeUDM:
		return []string{"udm", "ode"}
	default:
		return nil
	}
}

func IsSupportedJobType(jobType string) bool {
	return len(RequiredCapabilities(jobType)) > 0
}
