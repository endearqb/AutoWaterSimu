package simulation

const (
	JobTypeMaterialBalance = "simulation.material_balance.v1"
	JobTypeASM1Slim        = "simulation.asm1slim.v1"
	JobTypeASM1            = "simulation.asm1.v1"
	JobTypeASM3            = "simulation.asm3.v1"
	JobTypeUDM             = "simulation.udm.v1"
	JobTypeUDMNetwork      = "simulation.udm_network.v1"

	DefaultTimeLimitSec = 600
	PriorityNormal      = "normal"
)

func ExecutionProfile(jobType string) map[string]any {
	capabilities := RequiredCapabilities(jobType)
	requiredCapabilities := make([]any, 0, len(capabilities))
	for _, capability := range capabilities {
		requiredCapabilities = append(requiredCapabilities, capability)
	}
	profile := map[string]any{
		"time_limit_sec":        DefaultTimeLimitSec,
		"priority":              PriorityNormal,
		"required_capabilities": requiredCapabilities,
	}
	if jobType == JobTypeUDMNetwork {
		profile["execution_status"] = "not_executable_yet"
		profile["diagnostic_code"] = "UDM_NETWORK_NOT_EXECUTABLE_YET"
		profile["diagnostic_message"] = "simulation.udm_network.v1 is registered for wire-path validation, but no worker runner is executable yet"
	}
	return profile
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
	case JobTypeUDMNetwork:
		return []string{"udm_network", "ode"}
	default:
		return nil
	}
}

func IsSupportedJobType(jobType string) bool {
	return len(RequiredCapabilities(jobType)) > 0
}
