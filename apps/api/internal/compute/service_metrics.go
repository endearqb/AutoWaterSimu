package compute

import "context"

func (svc *Service) Metrics(ctx context.Context) (MetricsSnapshot, error) {
	return svc.metricsSnapshot.Metrics(ctx)
}
