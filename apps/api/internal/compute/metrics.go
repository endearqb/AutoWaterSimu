package compute

import (
	"context"
	"time"
)

type MetricsService struct {
	metrics MetricsStore
	now     func() time.Time
}

func NewMetricsService(metrics MetricsStore, now func() time.Time) *MetricsService {
	if now == nil {
		now = func() time.Time { return time.Now().UTC() }
	}
	return &MetricsService{
		metrics: metrics,
		now:     now,
	}
}

func (svc *MetricsService) Metrics(ctx context.Context) (MetricsSnapshot, error) {
	return svc.metrics.Metrics(ctx, svc.now())
}
