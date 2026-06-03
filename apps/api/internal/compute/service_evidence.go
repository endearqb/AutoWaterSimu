package compute

import "context"

func (svc *Service) Result(ctx context.Context, jobID string) (map[string]any, error) {
	return svc.evidenceGovernance.Result(ctx, jobID)
}

func (svc *Service) EvidencePackage(ctx context.Context, jobID string) (map[string]any, string, error) {
	return svc.evidenceGovernance.EvidencePackage(ctx, jobID)
}

func (svc *Service) ProductionReadiness(ctx context.Context, jobID string) (ProductionReadinessReport, error) {
	return svc.evidenceGovernance.ProductionReadiness(ctx, jobID)
}

func (svc *Service) ResolveEvidenceReference(ctx context.Context, jobID, evidenceRef string) (EvidenceReferenceResolution, error) {
	return svc.evidenceGovernance.ResolveEvidenceReference(ctx, jobID, evidenceRef)
}
